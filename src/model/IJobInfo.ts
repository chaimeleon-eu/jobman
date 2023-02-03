export enum EJobStatus {
    Waiting = "waiting", 
    Running = "running", 
    Succeeded = "succeeded", 
    Failed = "failed", 
    Unknown = "unknown"
}

export interface IJobInfo {

    name: string;
    uid: string;

}