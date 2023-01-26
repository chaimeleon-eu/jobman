export class Affinity {

    cpu: string = "";
    gpu: string = "";
}

export class LimitsRequests {

    cpu: number = 0;
    memory: number = 0;
}

export class Job {

    defaultContainer: string = "";
    gpuResName: string = "";
    affinity: Affinity;
    limits: LimitsRequests;
    requests: LimitsRequests;
}

export class Settings {

    job: Job;

}