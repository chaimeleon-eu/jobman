
// export interface KubeResourcesReqLim {
//     memory?: string;
//     cpu?: string;
//     [key: string]: string;
// }

export interface KubeResourcesFlavor {
    name: string;
    description?: string | null;
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

export enum AnnotationType {
    string = "string", 
    env = "env"
}

export interface Affinity {

    cpu: string;
    gpu: string;
}

export interface Resources {
    default?: string | null;
    label: string;
    predefined?: KubeResourcesFlavor[];

}

// export interface MountPoints {
//     datalake: string,
//     persistent_home: string,
//     persistent_shared_folder: string;
//     datasets: string;

// }

export interface SecurityContext {
    runAsUser?: number;
    runAsGroup?: number;
    fsGroup?: number;
    supplementalGroups?: Array<number>;
}

export interface Annotation {
    key: string;
    value: string;
    valueType: AnnotationType;
}

export interface Job {
    annotations?: Annotation[] | null;
    //datasetsList?: string | null;
    defaultImage?: string;
    imagePrefix?: string | null;
    userConfigmap: string | null | undefined,
    priorityClassName?: string | null;
    securityContext?: SecurityContext | null;
    //mountPoints?: MountPoints;
    //affinity: Affinity;
    resources: Resources;
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
    gpuResources: string[];
}

export interface NewVersion {
    repository?: string | null;
    packageJsonPath?: string | null;
    customMessage?: string | null;
}

export interface Settings {
    sharedNamespace: string;
    sharedConfigmap: string;
    jobsQueue: JobsQueue;
    job: Job;
    /**
     * Path to a new version. Can be ommited, or left null/blank to disbale the check
     * It supports:
     * - a local full path to a tar.gz archive with the jobman distribution 
     */
    newVersion?: NewVersion | null;
    kubeConfig: KubeConfigLocal;
    harbor: HarborConfig;
}