import { KubeConfig, BatchV1Api, V1Job, V1JobStatus, V1DeleteOptions, Watch, CoreV1Api, V1PodList } from '@kubernetes/client-node';
import { v4 as uuidv4 }  from "uuid";
import log from "loglevel";
import fetch, { RequestInit, Response } from "node-fetch";

import { IJobInfo, EJobStatus } from '../model/IJobInfo.js';
import JobInfo from '../model/JobInfo.js';
import ParameterException from '../model/exception/ParameterException.js';
import SubmitProps from '../model/SubmitProps.js';
import { KubeConfigLocal, KubeConfigType, Settings } from '../model/Settings.js';
import NotImplementedException from '../model/exception/NotImplementedException.js';
import { KubeOpReturn, KubeOpReturnStatus } from '../model/KubeOpReturn.js';
import UnhandledValueException from '../model/exception/UnhandledValueException.js';
import ImageDetails from '../model/ImageDetails.js';
import HarborRepository from '../model/HarborRepository.js';
import { HarborRespositoryArtifact } from '../model/HarborRespositoryArtifact.js';
import { existsSync } from 'node:fs';



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

    public async submit(props: SubmitProps): Promise<KubeOpReturn<undefined>> {
        console.log(props);
        if (!props.image) {
            throw new ParameterException("Please specify an image and tag. Use the 'images' command to see the available images and tags for each of them.");
        }
        const jn: string = props.jobName ?? `job.${uuidv4()}`;
        const cont = props.image ?? this.settings.job.defaultImage;
        let job: V1Job = new V1Job();
        job.metadata = {
            name: jn,
            namespace: this.getNamespace()
        }
        job.kind = "Job";
        job.spec = {
            backoffLimit: 0,
            template: {
                metadata: {
                    name: jn
                },
                spec: {
                    containers: [
                        {
                            name: cont,
                            image: cont,
                            command: props.command ? ["bin/bash", "-c", props.command] : [],
                            resources: {
                                requests: {
                                    cpu: `${(props.cpus ? Number(props.cpus) : this.settings.job.requests.cpu) * 1000}m`,
                                    memory: `${(props.memory ? Number(props.memory) : this.settings.job.requests.memory)}Mi`
                                }, 
                                limits: {
                                    cpu: `${this.settings.job.limits.cpu * 1000}m`,
                                    memory: `${this.settings.job.limits.memory}Mi`,
                                    [this.settings.job.gpuResName]: props.gpu ? "1" : "0"
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
        log.info(`Submiting job ${jn} for user ${this.getUsername()}`);
        const r = await this.k8sApi.createNamespacedJob(this.getNamespace(), job);
        return new KubeOpReturn(this.getStatusKubeOp(r.response.statusCode), r.response.statusMessage, undefined);
    }

    public async list(): Promise<KubeOpReturn<IJobInfo[]>> {
        const r: KubeOpReturn<V1Job[]> = (await this.getJobsList(this.getNamespace()));
        return new KubeOpReturn(r.status, r.message, r.payload?.map(e => <JobInfo>{ name: e.metadata?.name,
            uid: e.metadata?.uid,
            status: this.getStatusJob(e.status),
            dateLaunched: e.metadata?.creationTimestamp,
            position: 0}));
    }

    public async images(): Promise<KubeOpReturn<ImageDetails[]>> {
        const reposUrl: string = `${this.settings.harbor.url}/api/v2.0/projects/${this.settings.harbor.project}/repositories`;
        console.log(`Getting repos from ${reposUrl}`);
        const response: Response = await this.fetchCustom(reposUrl);
        const result: ImageDetails[] = [];
        if (response.ok) {
            const prjRepos: HarborRepository[] = await response.json() as HarborRepository[];
            for (const repo of prjRepos) {
                // Get repo name, remove project name 
                const name: string = repo.name.substring(repo.name.indexOf("/") + 1, repo.name.length);
                const tags: string[] = [];
                result.push({name, tags})
                
                const artsUrl: string = `${reposUrl}/${name}/artifacts`;
                const rArtifacts: Response = await this.fetchCustom(artsUrl);
                if (rArtifacts.ok) {
                    const arts: HarborRespositoryArtifact[] = await rArtifacts.json() as HarborRespositoryArtifact[];
                    for (const art of arts ) {
                        tags.push(...art.tags.map(t => t.name));
                    }
                } else {
                    console.warn(`Unable to load artifacts from ${artsUrl}`);
                }
            }
            return new KubeOpReturn(response.status, response.statusText, result);
        } else {
            console.error(`Unable to load repositories from ${reposUrl}`);
        }
        return new KubeOpReturn(response.status, response.statusText, result);
    }

    public async details(jobName: string | undefined = undefined): Promise<KubeOpReturn<IJobInfo[]>> {
        const r: KubeOpReturn<V1Job[]> = (await this.getJobsList(this.getNamespace()));
        return new KubeOpReturn(r.status, r.message, r.payload?.map(e => <JobInfo>{ name: e.metadata?.name,
            uid: e.metadata?.uid,
            status: this.getStatusJob(e.status),
            dateLaunched: e.metadata?.creationTimestamp,
            position: 0}));
    }

    public async log(jobName: string, follow: boolean | undefined = false, tail: number | undefined = undefined): 
            Promise<KubeOpReturn<string | null>>{
        const r: V1Job = await (await this.k8sApi.readNamespacedJob(jobName, this.getNamespace())).body;
        const cUid: string | undefined = r?.metadata?.labels?.["controller-uid"];
        if (cUid) {
            const podLblSel: string = "controller-uid=" + cUid;
            const pods: V1PodList = await (await this.k8sCoreApi.listNamespacedPod(this.getNamespace(), 
                undefined, undefined, undefined, undefined, podLblSel)).body;
            const podName: string | undefined = pods.items[0]?.metadata?.name;
            console.log(`Getting log for pod '${podName}'`);
            if (podName) {
                const log: string = await (await this.k8sCoreApi.readNamespacedPodLog(podName, this.getNamespace())).body;
                return new KubeOpReturn(KubeOpReturnStatus.Success, undefined, !log ? "<Empty Log>" :  log);
            } else {
                return new KubeOpReturn(KubeOpReturnStatus.Error, `Unable to determine the pod name for job '${jobName}'.`, null);
            }
        } else {
            return new KubeOpReturn(KubeOpReturnStatus.Error, `Unable to determine controller uid for job '${jobName}'.`, null);
        }
    }

    public async delete(jobName: string | null = null): Promise<KubeOpReturn<undefined>> {
        console.log(jobName);
        const uname: string | undefined = this.clusterConfig.getCurrentUser()?.name;
        if (!uname) 
            throw new Error("Unable to determine user name from the current context");
        const deleteObj: V1DeleteOptions = {
            apiVersion: 'v1',
            propagationPolicy: 'Background'
            }
        //let response = new Map();
        if (jobName) {
            log.info(`Deleting job named ${jobName} for user ${this.getUsername()}`);
            const r = await this.k8sApi.deleteNamespacedJob(jobName, uname, 
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
                `Job '${jobName}' has been successfully deleted by user '${this.getUsername()}'`, undefined);
        } else {
            throw new NotImplementedException("Not implemented for case when job name not specified");

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

    protected getStatusJob(stat: V1JobStatus | undefined): EJobStatus  {
        if (stat) {
            if (stat.active && stat.active >= 1) {
                return EJobStatus.Running;
            } else if (stat.succeeded && stat.succeeded >= 1) {
                return EJobStatus.Succeeded;
            }
        }
        return EJobStatus.Unknown;
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

    protected getNamespace(): string {
        return this.getUsername();
    }

    protected fetchCustom(url: string, init?: RequestInit): Promise<Response> {
        return fetch(url, init);
    }
}