export enum EJobStatus {
    Waiting = "Waiting", 
    WaitingError = "Waiting - error", 
    Running = "Running", 
    Succeeded = "Succeeded", 
    Failed = "Failed", 
    Unknown = "Unknown"
}

export interface IJobInfo {

    name: string;
    uid?: string | undefined;

}