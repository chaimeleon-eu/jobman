
// export interface KubeResourcesReqLim {
//     memory?: string;
//     cpu?: string;
//     [key: string]: string;
// }

export interface KubeResources {
    name: string;
    resources: {
        requests?: {
            [key: string]: string
        },
        limits?: {
            [key: string]: string
        }
    };

}

export enum KubeConfigType {
    default = "default", 
    cluster = "cluster",
    file = "file"
}

export interface Affinity {

    cpu: string;
    gpu: string;
}

export interface Resources {
    default?: string | null;
    predefined: KubeResources[];

}

export interface MountPoints {
    datalake: string,
    persistent_home: string,
    persistent_shared_folder: string;
    datasets: string;

}

export interface SecurityContext {
    runAsUser?: number;
    runAsGroup?: number;
    fsGroup?: number;
    supplementalGroups?: Array<number>;
}

export interface Job {

    defaultImage?: string;
    imagePrefix?: string | null;
    userConfigmap: string | null | undefined,
    priorityClassName?: string | null;
    securityContext?: SecurityContext | null;
    mountPoints?: MountPoints;
    //affinity: Affinity;
    resources?: Resources;
}

export interface KubeConfigLocal {

    type: KubeConfigType;
    file?: string | null | undefined;
}

export interface HarborConfig {
    url: string;
    project: string;

}

export interface JobsQueue {
    namespace: string;
    configmap: string;
}

export interface Settings {
    sharedNamespace: string;
    sharedConfigmap: string;
    jobsQueue: JobsQueue;
    job: Job;
    kubeConfig: KubeConfigLocal;
    harbor: HarborConfig;
}