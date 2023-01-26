import { IJobInfo, EJobStatus } from "./IJobInfo.js";

export default class JobInfo implements IJobInfo {
    
    name: string;
    uid: string;
    status: EJobStatus;
    dateLaunched: Date;
    position: number;
    
}