import { KubeConfig, BatchV1Api, V1Job, V1JobStatus, V1DeleteOptions, Watch } from '@kubernetes/client-node';
import { v4 as uuidv4 }  from "uuid";
import log from "loglevel";
import fetch, { Response } from "node-fetch";

import { IJobInfo, EJobStatus } from '../model/IJobInfo.js';
import JobInfo from '../model/JobInfo.js';
import ParameterException from '../model/exception/ParameterException.js';
import SubmitProps from '../model/SubmitProps.js';
import { KubeConfigLocal, KubeConfigType, Settings } from '../model/Settings.js';
import NotImplementedException from '../model/exception/NotImplementedException.js';
import KubeOpReturn from '../model/KubeOpReturn.js';
import UnhandledValueException from '../model/exception/UnhandledValueException.js';
import ImageDetails from '../model/ImageDetails.js';
import HarborRepository from '../model/HarborRepository.js';
import { HarborRespositoryArtifact } from '../model/HarborRespositoryArtifact.js';



export default class KubeManager {
    protected clusterConfig: KubeConfig;
    protected k8sApi: BatchV1Api;
    protected settings: Settings;
    protected watch: Watch;

    public constructor(settings: Settings) {
        this.settings = settings;
        this.clusterConfig = this.loadKubeConfig(settings.kubeConfig);
        this.k8sApi = this.clusterConfig.makeApiClient(BatchV1Api);
        this.watch = new Watch(this.clusterConfig);
    }

    public async submit(props: SubmitProps): Promise<KubeOpReturn<undefined>> {
        if (!props.image) {
            throw new ParameterException("Please specify a container.");
        }
        const jn: string = props.jobName ?? `job_${uuidv4()}`;
        const cont = props.image ?? this.settings.job.defaultImage;
        let job: V1Job = new V1Job();
        job.metadata = {
            name: jn,
            namespace: this.getNamespace()
        }
        job.kind = "Job";
        job.spec = {
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
                    affinity: {
                        nodeAffinity: {
                            requiredDuringSchedulingIgnoredDuringExecution: {
                                nodeSelectorTerms:[
                                    {
                                        matchExpressions: [
                                            {
                                                key: props.gpu ? this.settings.job.affinity.gpu : this.settings.job.affinity.cpu,
                                                operator: "Exist"
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }

        }
        log.info(`Submiting job ${jn} for user ${this.getUsername()}`);
        const r = await this.k8sApi.createNamespacedJob(this.getNamespace(), job);
        return new KubeOpReturn(r.response.statusCode, r.response.statusMessage, undefined);
    }

    public async list(): Promise<KubeOpReturn<IJobInfo[]>> {
        const r: KubeOpReturn<V1Job[]> = (await this.getJobsList(this.getNamespace()));
        return new KubeOpReturn(r.statusCode, r.message, r.payload?.map(e => <JobInfo>{ name: e.metadata?.name,
            uid: e.metadata?.uid,
            status: this.getStatus(e.status),
            dateLaunched: e.metadata?.creationTimestamp,
            position: 0}));
    }

    public async images(): Promise<KubeOpReturn<ImageDetails[]>> {
        const reposUrl: string = `${this.settings.harbor.url}/api/v2.0/projects/${this.settings.harbor.project}/repositories`;
        const response: Response = await fetch(reposUrl);
        const result: ImageDetails[] = [];
        if (response.ok) {
            const prjRepos: HarborRepository[] = await response.json() as HarborRepository[];
            for (const repo of prjRepos) {
                const name: string = repo.name;
                const tags: string[] = [];
                result.push({name, tags})

                const artsUrl: string = `${reposUrl}/api/v2.0/projects/${this.settings.harbor.project}/repositories/${name}/artifacts`;
                const rArtifacts: Response = await fetch(artsUrl);
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
        return new KubeOpReturn(r.statusCode, r.message, r.payload?.map(e => <JobInfo>{ name: e.metadata?.name,
            uid: e.metadata?.uid,
            status: this.getStatus(e.status),
            dateLaunched: e.metadata?.creationTimestamp,
            position: 0}));
    }

    public async log(jobName: string, follow: boolean | undefined = false, tail: number | undefined = undefined): 
            Promise<KubeOpReturn<string>>{
        const r = await this.k8sApi.readNamespacedJobStatus(jobName, this.getNamespace());
        console.log(r);
        return new KubeOpReturn(r.response.statusCode, r.response.statusMessage, "");
    }

    public async delete(jobName: string | null = null): Promise<KubeOpReturn<Map<string, string> | undefined>> {
        const uname: string | undefined = this.clusterConfig.getCurrentUser()?.name;
        if (!uname) 
            throw new Error("Unable to determine user name from the current context");
        const deleteObj: V1DeleteOptions = {
            apiVersion: 'v1',
            propagationPolicy: 'Background'
            }
        //let response = new Map();
        if (jobName) {
            log.info(`Cancelling job named ${jobName} for user ${this.getUsername()}`);
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
            return new KubeOpReturn(r.response.statusCode, r.response.statusMessage, undefined);
        } else {
            throw new NotImplementedException("Not implemented for case when job name not specified");

        }
    }

    protected async getJobsList(namespace: string): Promise<KubeOpReturn<V1Job[]>> {
        const res =  await this.k8sApi.listNamespacedJob(namespace);
        return new KubeOpReturn(res.response.statusCode, res.response.statusMessage, res.body.items);
    }

    protected getStatus(stat: V1JobStatus | undefined): EJobStatus  {
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
}