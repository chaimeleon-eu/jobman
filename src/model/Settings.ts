export enum KubeConfigType {
    default = "default", 
    cluster = "cluster"
}

export interface Affinity {

    cpu: string;
    gpu: string;
}

export interface LimitsRequests {

    cpu: number;
    memory: number;
}

export interface Job {

    defaultImage: string;
    gpuResName: string;
    affinity: Affinity;
    limits: LimitsRequests;
    requests: LimitsRequests;
}

export interface KubeConfigLocal {

    type: KubeConfigType;
}

export interface HarborConfig {
    url: string;
    project: string;

}

export interface Settings {
    sharedNamespace: string;
    sharedConfigmap: string;
    job: Job;
    kubeConfig: KubeConfigLocal;
    harbor: HarborConfig;

}