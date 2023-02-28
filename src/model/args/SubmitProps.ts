import KubeManagerProps from "./KubeManagerProps.js";

export default interface SubmitProps extends KubeManagerProps{
    jobName?: string;
    image?: string;
    gpu?: boolean; 
    cpus?: number;
    memory?: number;
    command?: string[];
}