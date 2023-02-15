import { KubeConfig, BatchV1Api, V1Job, V1JobStatus, V1DeleteOptions, Watch, CoreV1Api, V1PodList, HttpError, V1Pod, V1ConfigMap, V1CephFSVolumeSource, V1Volume, V1VolumeMount, V1PodSecurityContext } from '@kubernetes/client-node';
import { v4 as uuidv4 }  from "uuid";
import log from "loglevel";
import fetch, { RequestInit, Response } from "node-fetch";
import https from "https";
import fs from "node:fs";
import path from "node:path";

import { IJobInfo, EJobStatus } from '../model/IJobInfo.js';
import JobInfo from '../model/JobInfo.js';
import ParameterException from '../model/exception/ParameterException.js';
import SubmitProps from '../model/SubmitProps.js';
import { KubeConfigLocal, KubeConfigType, SecurityContext, Settings } from '../model/Settings.js';
import NotImplementedException from '../model/exception/NotImplementedException.js';
import { KubeOpReturn, KubeOpReturnStatus } from '../model/KubeOpReturn.js';
import UnhandledValueException from '../model/exception/UnhandledValueException.js';
import ImageDetails from '../model/ImageDetails.js';
import HarborRepository from '../model/HarborRepository.js';
import { HarborRespositoryArtifact } from '../model/HarborRespositoryArtifact.js';
import { existsSync } from 'node:fs';
import KubeException from '../model/exception/KubeException.js';
// import { IJobVolume, JobVolumeType } from '../model/IJobVolume.js';
// import JobVolumeMount from '../model/JobVolumeMount.js';



export default class KubeManager {
    protected clusterConfig: KubeConfig;
    protected k8sApi: BatchV1Api;
    protected k8sCoreApi: CoreV1Api;
    protected settings: Settings;
    protected watch: Watch;

    public constructor(settings: Settings) {
        this.settings = settings;
        this.clusterConfig = this.loadKubeConfig(settings.kubeConfig);
        this.k8sApi = this.clusterConfig.makeApiClient(BatchV1Api);
        this.k8sCoreApi = this.clusterConfig.makeApiClient(CoreV1Api);
        this.watch = new Watch(this.clusterConfig);
    }

    public async submit(props: SubmitProps): Promise<KubeOpReturn<null>> {
        try {
            if (!props.image) {
                return new KubeOpReturn(KubeOpReturnStatus.Error,
                    "Please specify an image and tag. Use the 'images' command to see the available images and tags for each of them.",
                    null);
            }
            
            console.log(`Parameters sent to the job's container: ${JSON.stringify(props.command)}`);
            const jn: string = props.jobName ?? `job-${uuidv4()}`;
            const cont = (this.settings.job?.imagePrefix ?? "") + (props.image ?? this.settings.job.defaultImage);
            console.log(`Using image '${cont}'`);
            console.log("Preparing volumes...");
            const [volumes, volumeMounts] = await this.prepareJobVolumes();
            let job: V1Job = new V1Job();
            job.metadata = {
                name: jn,
                namespace: this.getNamespace()
            }
            job.kind = "Job";
            let securityContext: SecurityContext | undefined | null = this.settings.job.securityContext;
            if (securityContext && this.settings.job.userConfigmap) {
                const userConfigmap: V1ConfigMap = await this.getConfigmap(this.settings.job.userConfigmap);
                const sgs: string | undefined | null = userConfigmap.data?.["ceph.gid"]
                if (sgs) {
                    securityContext.supplementalGroups = [Number(sgs)];
                }
            }
            const priorityClassName: string | undefined | null = this.settings.job.priorityClassName;
            const gpus = props.gpu ? {[this.settings.job.gpuResName]: "1"} : null;
            job.spec = {
                backoffLimit: 0,
                template: {
                    metadata: {
                        name: jn
                    },
                    spec: {
                        ...securityContext && {...new V1PodSecurityContext(), ...securityContext},
                        ...priorityClassName && {priorityClassName},
                        ...volumes && {volumes},
                        containers: [
                            {
                                name: `container-${uuidv4()}`,
                                image: cont,
                                command: props.command ? props.command :  ["/bin/sh", "-c", "echo 'No command provided to container"],
                                ...volumeMounts && {volumeMounts},
                                resources: {
                                    requests: {
                                        cpu: `${(props.cpus ? Number(props.cpus) : this.settings.job.requests.cpu) * 1000}m`,
                                        memory: `${(props.memory ? Number(props.memory) : this.settings.job.requests.memory)}Gi`
                                    }, 
                                    limits: {
                                        cpu: `${this.settings.job.limits.cpu * 1000}m`,
                                        memory: `${this.settings.job.limits.memory}Gi`,
                                        ...gpus && {...gpus}
                                    }
                                }
                            }
                        ],
                        restartPolicy: "Never",
                        // affinity: {
                        //     nodeAffinity: {
                        //         requiredDuringSchedulingIgnoredDuringExecution: {
                        //             nodeSelectorTerms:[
                        //                 {
                        //                     matchExpressions: [
                        //                         {
                        //                             key: props.gpu ? this.settings.job.affinity.gpu : this.settings.job.affinity.cpu,
                        //                             operator: "Exist"
                        //                         }
                        //                     ]
                        //                 }
                        //             ]
                        //         }
                        //     }
                        // }
                    }
                }

            }
            //log.info(`Submiting job ${jn} for user ${this.getUsername()}`);
            const r = await this.k8sApi.createNamespacedJob(this.getNamespace(), job);
            return new KubeOpReturn(this.getStatusKubeOp(r.response.statusCode), 
                `Job named '${jn}' created successfully by user '${this.getUsername()}'`, null);
        
        } catch (e) {
            return this.handleKubeOpsError(e);
        }
    }

    public async list(): Promise<KubeOpReturn<IJobInfo[] | null>> {
        try {
            const r: KubeOpReturn<V1Job[]> = (await this.getJobsList(this.getNamespace()));

            if (r.payload) {
                let res: JobInfo[] = [];
                for (const e of r.payload) {
                    const jn = e.metadata?.name;
                    if (jn) {
                        res.push({ name: jn,
                        uid: e.metadata?.uid,
                        status: await this.getStatusJob(jn, e.status),
                        dateLaunched: e.metadata?.creationTimestamp,
                        position: 0});
                    }
                }
                return new KubeOpReturn(KubeOpReturnStatus.Success, r.message, res);
            } else {
                return new KubeOpReturn(KubeOpReturnStatus.Success, "Empty jobs", null);
            }
        } catch (e) {
            return this.handleKubeOpsError(e);
        }
    }

    public async images(): Promise<KubeOpReturn<ImageDetails[]>> {
        const reposUrl: string = `${this.settings.harbor.url}/api/v2.0/projects/${this.settings.harbor.project}/repositories`;
        console.log(`Getting repos from ${reposUrl}`);
        const agent = new https.Agent({
            rejectUnauthorized: false,
          });
        const response: Response = await this.fetchCustom(reposUrl, {agent});
        const result: ImageDetails[] = [];
        if (response.ok) {
            const prjRepos: HarborRepository[] = await response.json() as HarborRepository[];
            for (const repo of prjRepos) {
                // Get repo name, remove project name 
                const name: string = repo.name.substring(repo.name.indexOf("/") + 1, repo.name.length);
                const tags: string[] = [];
                result.push({name, tags})
                
                const artsUrl: string = `${reposUrl}/${name}/artifacts`;
                const rArtifacts: Response = await this.fetchCustom(artsUrl, {agent});
                if (rArtifacts.ok) {
                    const arts: HarborRespositoryArtifact[] = await rArtifacts.json() as HarborRespositoryArtifact[];
                    for (const art of arts ) {
                        if (art.tags !== null)
                            tags.push(...art.tags.map(t => t.name));
                    }
                } else {
                    console.warn(`Unable to load artifacts from ${artsUrl}`);
                }
            }
            return new KubeOpReturn(KubeOpReturnStatus.Success, response.statusText, result);
        } else {
            console.error(`Unable to load repositories from '${reposUrl}'`);
        }
        return new KubeOpReturn(KubeOpReturnStatus.Error, response.statusText, result);
    }

    public async details(jobName: string): Promise<KubeOpReturn<V1Job>> {
        const r: V1Job = await (await this.k8sApi.readNamespacedJob(jobName, this.getNamespace())).body;
        return new KubeOpReturn(KubeOpReturnStatus.Success, undefined, r);
    }

    public async log(jobName: string, follow: boolean | undefined = false, tail: number | undefined = undefined): 
            Promise<KubeOpReturn<string | null>>{
        try {
                const podName: string | undefined =  (await this.getJobPodInfo(jobName))?.metadata?.name;
                if (podName) {
                    const ns: string = this.getNamespace();
                    console.log(`Getting log for pod '${podName}', user '${this.getUsername()}' in namespace '${ns}'`);
                    const log: string = await (await this.k8sCoreApi.readNamespacedPodLog(podName, ns)).body;
                    return new KubeOpReturn(KubeOpReturnStatus.Success, undefined, !log ? "<Empty Log>" :  log);
                } else {
                    return new KubeOpReturn(KubeOpReturnStatus.Error, `Unable to determine the pod name for job '${jobName}'.`, null);
                }
        } catch (e) {
            return this.handleKubeOpsError(e);
        }
    }

    public async delete(jobName: string | null = null): Promise<KubeOpReturn<null>> {
        try {
            const uname: string | undefined = this.clusterConfig.getCurrentUser()?.name;
            if (!uname) 
                throw new Error("Unable to determine user name from the current context");
            const deleteObj: V1DeleteOptions = {
                apiVersion: 'v1',
                propagationPolicy: 'Background'
                }
            //let response = new Map();
            if (jobName) {
                const ns: string = this.getNamespace();
                log.info(`Deleting job named '${jobName}' for user '${this.getUsername()}' in namespace '${ns}'`);
                const r = await this.k8sApi.deleteNamespacedJob(jobName, ns, 
                    undefined, undefined, undefined, undefined, undefined, deleteObj);
        //         let deleted: boolean = false;
        //         const req = await this.watch.watch(
        //             '/api/v1/namespaces',

        // {
        //     allowWatchBookmarks: true,
        // },
        // // callback is called for each received object.
        // (type, apiObj, watchObj) => {
        //     if (type === 'DELETED') {
        //         deleted = true;
        //     }
        // },
        // (err) => {
        //     // tslint:disable-next-line:no-console
        //     console.log(err);
        // })
        // .then((req) => {
        //             // watch returns a request object which you can use to abort the watch.
        //             setTimeout(() => { 
        //                 if (deleted)
        //                     req.abort(); 
        //             }, 100);
        //             //onDeleted(req);
        //         });
                

                //response.set(jobName, r.response.statusMessage);
                return new KubeOpReturn(this.getStatusKubeOp(r.response.statusCode), 
                    `Job '${jobName}' has been successfully deleted by user '${this.getUsername()}'`, null);
            } else {
                throw new NotImplementedException("Not implemented for case when job name not specified");
            }
        } catch (e) {
            return this.handleKubeOpsError(e);
        }
    }

    protected async getConfigmap(configMapName: string): Promise<V1ConfigMap> {
            return await (await this.k8sCoreApi.readNamespacedConfigMap(configMapName, this.getNamespace())).body;
    }

    protected async prepareJobVolumes(): Promise<[V1Volume[] | undefined, V1VolumeMount[] | undefined]> {
        if (this.settings.job.userConfigmap) {
            const userConfigmap: V1ConfigMap = await this.getConfigmap(this.settings.job.userConfigmap );
            if (userConfigmap) {
                let vs: V1Volume[] = [
                    {
                        name: "datalake",
                        cephfs: this.defJobVolume(userConfigmap,
                                    userConfigmap.data?.["datalake.path"] ?? "/", true)
                    },
                    {
                        name: "home",
                        cephfs: this.defJobVolume(userConfigmap, 
                            userConfigmap.data?.["persistent_home.path"] ?? "/", false)
                    },
                    {
                        name: "shared-folder",
                        cephfs: this.defJobVolume(userConfigmap, 
                            userConfigmap.data?.["persistent_shared_folder.path"] ?? "/", false)
                    }
                ];
                let vms: V1VolumeMount[] = [
                    {
                        name: "datalake",
                        mountPath: this.settings.job.mountPoints.datalake
                    },
                    {
                        name: "home",
                        mountPath: this.settings.job.mountPoints.persistent_home
                    },
                    {
                        name: "shared-folder",
                        mountPath: this.settings.job.mountPoints.persistent_shared_folder
                    }
                ];
                // Mount datasets
                const dirs: string[] = fs.readdirSync(this.settings.job.mountPoints.datasets)
                    .filter((f: any) => fs.statSync(path.join(this.settings.job.mountPoints.datasets, f)).isDirectory());

                const pt: string | undefined = userConfigmap.data?.["datasets.path"];
                if (pt) {
                    for (const dir of dirs) {
                            vs.push({
                                name: dir,
                                cephfs: this.defJobVolume(userConfigmap,  path.join(pt, dir), true)

                            });
                            vms.push({
                                name: dir,
                                mountPath: path.join(this.settings.job.mountPoints.datasets, dir)
                            });
                    }
                } else {
                    throw new ParameterException(`Missing 'datasets.path' entry in user configmap '${this.settings.job.userConfigmap}'`);
                }
                return [vs, vms];
            } 
        }
        return [undefined, undefined];
    }

    protected defJobVolume(userConfigmap: V1ConfigMap, path: string, readOnly: boolean): V1CephFSVolumeSource {
        const monitors: string[] =  userConfigmap.data?.["ceph.monitors"]?.split(",") 
            ?? (userConfigmap.data?.["ceph.monitor"] ? [userConfigmap.data?.["ceph.monitor"]] : null) ?? [];
        const user: string = userConfigmap.data?.["ceph.user"] ?? "";
        
        return {monitors, user, secretRef: {name: "ceph-auth"}, readOnly, path};
    }

    protected async getJobPodInfo(jobName: string): Promise<V1Pod | undefined> {
        const r: V1Job = await (await this.k8sApi.readNamespacedJob(jobName, this.getNamespace())).body;
        const cUid: string | undefined = r?.metadata?.labels?.["controller-uid"];
        if (cUid) {
            const podLblSel: string = "controller-uid=" + cUid;
            const pods: V1PodList = await (await this.k8sCoreApi.listNamespacedPod(this.getNamespace(), 
                undefined, undefined, undefined, undefined, podLblSel)).body;
            //console.log(pods.items[0]?.status);
            return pods.items[0];
        } else {
            throw new KubeException(`Unable to determine controller UID for job '${jobName}'.`);
        }
    }

    protected getStatusKubeOp(kubeStat: number| undefined): KubeOpReturnStatus {
        if (kubeStat) {
            if (kubeStat >= 200 && kubeStat <= 299) {
                return KubeOpReturnStatus.Success;
            } else {
                return KubeOpReturnStatus.Error;
            }
        } else {
            return KubeOpReturnStatus.Unknown;
        }
    }

    protected async getJobsList(namespace: string): Promise<KubeOpReturn<V1Job[]>> {
        const res =  await this.k8sApi.listNamespacedJob(namespace);
        return new KubeOpReturn(this.getStatusKubeOp(res.response.statusCode), res.response.statusMessage, res.body.items);
    }

    protected async getStatusJob(jobName: string, stat: V1JobStatus | undefined): Promise<EJobStatus>  {
        if (stat) {
            if (stat.failed === undefined && stat.succeeded === undefined) {
                // we have to check what the pod is doing
                const podPhase: string | undefined =  (await this.getJobPodInfo(jobName))?.status?.phase?.toLowerCase();
                switch (podPhase) {
                    case "pending": return EJobStatus.Waiting;
                    case "running": return EJobStatus.Running;
                    case "succeeded": return EJobStatus.Succeeded;
                    case "failed": return EJobStatus.Failed;
                    case undefined: // Same as unknown
                    case "unknown": return EJobStatus.Unknown;
                    default: throw new UnhandledValueException(`Unhandled pod status '${podPhase}.`);
                }
            } else if (!stat.active && stat.succeeded && stat.succeeded >= 1) {
                return EJobStatus.Succeeded;
            } else if (!stat.active && stat.failed && stat.failed >= 1) {
                return EJobStatus.Failed;
            }  else if (stat.active) {
                return EJobStatus.Waiting;
            } else {
                return EJobStatus.Unknown;
            }
        } else {
            return EJobStatus.Unknown;
        }
    }

    protected loadKubeConfig(cfg: KubeConfigLocal): KubeConfig {
        let clusterConfigTmp = new KubeConfig();
        if (cfg.type === KubeConfigType.default) {
            clusterConfigTmp.loadFromDefault();
        } else if (cfg.type === KubeConfigType.cluster) {
            clusterConfigTmp.loadFromCluster();
        } else if (cfg.type === KubeConfigType.file) {
            if (cfg.file && existsSync(cfg.file)) {
                clusterConfigTmp.loadFromFile(cfg.file);
            } else {
                throw new ParameterException(`Please set kubernetes config file path in the settings`)
            }
        } else {
            throw new UnhandledValueException(`Type '${cfg.type}' not handled. Please use one of the following: 
                ${Object.keys(KubeConfigType).filter(value => typeof value === 'string').join(", ")}`)
        }
        return clusterConfigTmp;
    }

    public getUsername() : string {
        const uname: string | undefined = this.clusterConfig.getCurrentUser()?.name;
        if (!uname) 
            throw new Error("Unable to determine user name from the current context");
        else 
            return uname;

    }

    protected handleKubeOpsError(e: any): KubeOpReturn<null> {
        if (e instanceof HttpError) {
            return new KubeOpReturn(KubeOpReturnStatus.Error, `Error message from Kubernetes: ${e.body.message}`, null);
        } if (e instanceof Error || e instanceof KubeException) {
            return new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null);
        } else {
            return new KubeOpReturn(KubeOpReturnStatus.Error, `Unknown error: ${JSON.stringify(e)}`, null);
        }

    }

    protected getNamespace(): string {
        const nm: string | undefined = this.clusterConfig.getContexts().filter(c => c.name === this.clusterConfig.getCurrentContext())?.[0]?.namespace;
        if (!nm)
            throw new KubeException("Unable to determine namespace");//this.getUsername();
        else   
            return nm;
    }

    protected fetchCustom(url: string, init?: RequestInit): Promise<Response> {
        return fetch(url, init);
    }
}