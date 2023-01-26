
export default interface SubmitProps {
    jobName: string | undefined;
    container: string | undefined;
    gpu: boolean | undefined; 
    cpus: number | undefined;
    memory: number | undefined;
    command: string | undefined;
}