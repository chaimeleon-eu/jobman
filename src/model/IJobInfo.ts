export enum EJobStatus {
    Waiting, Running, Succeeded, Failed, Unknown
}

export interface IJobInfo {

    name: string;
    uid: string;

}