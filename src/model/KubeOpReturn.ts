
export default class KubeOpReturn<Type> {

    public readonly statusCode: number | undefined;
    public readonly message: string | undefined;
    public readonly payload: Type | undefined;

    constructor(statusCode: number | undefined, 
            message: string | undefined, payload: Type | undefined) {
        this.statusCode = statusCode;
        this.message = message;
        this.payload = payload;
    }

    public isOk(): boolean {
        return this.statusCode === 200;
    }

}