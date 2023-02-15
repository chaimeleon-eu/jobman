
export default interface SubmitProps {
    jobName?: string | undefined;
    image: string | undefined;
    gpu?: boolean | undefined; 
    cpus?: number | undefined;
    memory?: number | undefined;
    command?: string[] | undefined;
}