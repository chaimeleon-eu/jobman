export default class QueueJob {

    namespace: string;
    name: string;
    creationDate: Date;
    resources: {
        label: string;
        requests?: {
            [key: string]: string;
        }
    }
}