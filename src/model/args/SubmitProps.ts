import KubeManagerProps from "./KubeManagerProps";

export default interface SubmitProps extends KubeManagerProps{
    jobName?: string;
    image?: string;
    gpu?: boolean; 
    cpus?: number;
    memory?: number;
    command?: string[];
}