
export default class QueueResult {
    public id: string;
    public flavor: string | undefined;
    public count: number;
    public cpu: string | undefined;
    public memory: string | undefined;
    public gpu: number | undefined;
    public userJobsCnt: number;
}