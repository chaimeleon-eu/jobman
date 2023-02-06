import { createRequire } from "node:module";
import util  from 'node:util';
import ImageDetails from "../model/ImageDetails.js";
//import ImageDetails from "../model/ImageDetails.js";
const require = createRequire(import.meta.url);
const { Table } = require('console-table-printer');

import { KubeOpReturn, KubeOpReturnStatus } from "../model/KubeOpReturn.js";
import { Settings } from "../model/Settings.js";
import SubmitProps from "../model/SubmitProps.js";
import KubeManager from "./KubeManager.js";


export default class DisplayService {
    protected km: KubeManager;

    constructor(settings: Settings) {
        this.km = new KubeManager(settings);
        util.inspect.defaultOptions.maxArrayLength = null;
    }

    public images(): void {
        this.km.images().then(r => this.simpleMsg(r, 
                () => {
                    const t = new Table({
                        enabledColumns: ["name", "Tags List"],
                        columns: [
                          {
                            name: "name",
                            title: "Image Name"
                          }
                        ],
                        computedColumns:[
                            {
                                name: "Tags List",
                                function: (row: ImageDetails) => row.tags.join("  "), 
                            }
                        ]
                    });
                    t.addRows(r.payload);
                    t.printTable();
                }))
                .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));
    }

    public submit(props: SubmitProps): void {
        this.km.submit(props)
            .then(r => this.simpleMsg(r))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));
    }
    

    public list(): void {
        this.km.list()
            .then(r => this.simpleMsg(r, 
                () => {
                    const t = new Table({
                        enabledColumns: ["name", "status", "dateLaunched"],
                        columns: [
                          {
                            name: "name",
                            title: "Job Name"
                          },
                          {
                            name: "status",
                            title: "Status"
                          },
                          {
                            name: "dateLaunched",
                            title: "Launching Date"
                          }
                        ]
                    });
                    t.addRows(r.payload);
                    t.printTable();
                }))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));
    }

    public details(jobName: string | null | undefined): void {

    }

    public log(jobName: string): void {
        this.km.log(jobName)
            .then(r => this.simpleMsg(r, () => console.log(r.payload)))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));

    }

    public delete(jobName: string): void {
        this.km.delete(jobName)
            .then(r => this.simpleMsg(r))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));
    }

    protected simpleMsg(op: KubeOpReturn<any>, displayFunc: Function | undefined = undefined): void {
        if (op.isOk()) {
            if (displayFunc) {
                displayFunc(op.payload);
            } else {
                console.log("\x1b[32m", "[SUCCESS]", "\x1b[0m", op.message);
            }
        } else {
            console.error("\x1b[31m", "[ERROR]", "\x1b[0m", op.message);
        }
    }

}