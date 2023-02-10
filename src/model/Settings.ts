
export enum KubeConfigType {
    default = "default", 
    cluster = "cluster",
    file = "file"
}

export interface Affinity {

    cpu: string;
    gpu: string;
}

export interface LimitsRequests {

    cpu: number;
    memory: number;
}

export interface MountPoints {
    datalake: string,
    persistent_home: string,
    persistent_shared_folder: string,
    datasets: string

}

export interface Job {

    defaultImage: string;
    gpuResName: string;
    userConfigmap: string | null | undefined,
    mountPoints: MountPoints,
    affinity: Affinity;
    limits: LimitsRequests;
    requests: LimitsRequests;
}

export interface KubeConfigLocal {

    type: KubeConfigType;
    file?: string | null | undefined;
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