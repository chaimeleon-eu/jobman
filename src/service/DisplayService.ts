import log from "loglevel";
import KubeOpReturn from "../model/KubeOpReturn.js";

import { Settings } from "../model/Settings.js";
import SubmitProps from "../model/SubmitProps.js";
import KubeManager from "./KubeManager.js";


export default class DisplayService {
    protected km: KubeManager;

    constructor(settings: Settings, ccp: string | null) {
        this.km = new KubeManager(settings, ccp);
    }

    public submit(props: SubmitProps): void {
        this.km.submit(props)
            .then(r => this.simpleMsg(r))
            .catch(e => log.error(e));
    }
    

    public list(): void {
        this.km.list().then(r => {
            if (r.payload) {
                console.table(r.payload);
            } else {
                this.simpleMsg(r);
            }
        })
    }

    public details(jobName: string | null | undefined): void {

    }

    public log(jobName: string): void {

    }

    public delete(jobName: string): void {
        this.km.delete(jobName)
            .then(r => {
                if (r.payload)
                    r.payload?.forEach((k, v) => log.info(`Job ${k} cancelling attempt returned '${v}'`));
                else 
                    this.simpleMsg(r);
            })
            .catch(e => log.error(e));
    }

    protected simpleMsg(op: KubeOpReturn<any>): void {
        if (op.isOk()) {
            log.info("Success");
        } else {
            log.error(`Error: ${op.message}`);
        }
    }

}