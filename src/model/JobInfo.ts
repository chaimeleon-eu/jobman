import { IJobInfo, EJobStatus } from "./IJobInfo.js";

export default class JobInfo implements IJobInfo {
    
    name: string;
    uid?: string | undefined;
    status: EJobStatus;
    dateLaunched?: Date | undefined;
    position: number;
    
}