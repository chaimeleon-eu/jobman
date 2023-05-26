import KubeManagerProps from "./KubeManagerProps.js";

export default interface SubmitProps extends KubeManagerProps{
    jobName?: string;
    image?: string;
    resources?: string;
    command?: string[];
}