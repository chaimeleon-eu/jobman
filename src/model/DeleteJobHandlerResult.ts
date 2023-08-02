import { KubeOpReturnStatus } from "./KubeOpReturn.js";


export default interface DeleteJobHandlerResult {

    status: KubeOpReturnStatus;
    message: string;
}