export default class QueueJob {

    namespace: string;
    name: string;
    creationDate: Date;
    resources: {
        flavor: string;
        requests?: {
            [key: string]: string;
        }
    }
}