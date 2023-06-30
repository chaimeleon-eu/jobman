import { createRequire } from "node:module";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import util  from 'node:util';
import ImageDetails from "../model/ImageDetails.js";
import JobInfo from "../model/JobInfo.js";
const require = createRequire(import.meta.url);
const { Table } = require('console-table-printer');

import { KubeOpReturn, KubeOpReturnStatus } from "../model/KubeOpReturn.js";
import { Settings } from "../model/Settings.js";
import SubmitProps from "../model/args/SubmitProps.js";
import KubeManager from "./KubeManager.js";
import DetailsProps from "../model/args/DetailsProps.js";
import LogProps from "../model/args/LogProps.js";
import DeleteProps from "../model/args/DeleteProps.js";
import ImageDetailsProps from "../model/args/ImageDetailsProps.js";
import QueueResult from "../model/QueueResult.js";

type SimpleMsgCallbFunction = (...args: any[]) => void;


export default class DisplayService {
    protected km: KubeManager;

    protected options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false,
        timeZoneName: 'short'
      };

    constructor(settings: Settings) {
        this.km = new KubeManager(settings);
        util.inspect.defaultOptions.maxArrayLength = null;
    }

    public queue(): void {
        marked.setOptions({
            // Define custom renderer
            renderer: new TerminalRenderer()
          });
        this.km.queue()
            .then(r => this.simpleMsg(r,  () => {
                    const t = new Table({
                        enabledColumns: ["Flavor", "Jobs (total/yours)", "CPU/Memory/GPUs"],
                        columns: [],
                        computedColumns:[
                            {
                                name: "CPU/Memory/GPUs",
                                function: (row: QueueResult) => `${row.cpu ?? "-"}/${row.memory ?? "-"}/${row.gpu ?? "-"}`, 
                            },
                            {
                                name: "Flavor",
                                function: (row: QueueResult) => row.flavor ?? "<no label>"
                            },
                            {
                                name: "Jobs (total/yours)",
                                function: (row: QueueResult) => `${row.count}/${row.userJobsCnt}`
                            }
                        ]
                    });
                    t.addRows(r.payload);
                    t.printTable();
                }
            ))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));        
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

    public imageDetails(props: ImageDetailsProps): void {
        marked.setOptions({
            // Define custom renderer
            renderer: new TerminalRenderer()
          });
        this.km.imageDetails(props)
            .then(r => this.simpleMsg(r,  () => console.log(marked(r.payload ?? ""))))
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
                        enabledColumns: ["name", "status", "Launching Date"],
                        columns: [
                          {
                            name: "name",
                            title: "Job Name"
                          },
                          {
                            name: "status",
                            title: "Status"
                          }
                        ],
                        computedColumns:[
                            {
                                name: "Launching Date",
                                function: (row: JobInfo) => new Intl.DateTimeFormat('en-GB', this.options)
                                                .format(row.dateLaunched), 
                            }
                        ]
                    });
                    t.addRows(r.payload);
                    t.printTable();
                }))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));
    }

    public details(props: DetailsProps): void {
        this.km.details(props)
            .then(r => this.simpleMsg(r, () => console.dir(r.payload, {depth: null})))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));

    }

    public log(props: LogProps): void {
        this.km.log(props)
            .then(r => this.simpleMsg(r, () => console.log("----Log begin----\n\n", "\x1b[36m", r.payload, "\x1b[0m", "\n----Log end----")))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));

    }

    public delete(props: DeleteProps): void {
        this.km.delete(props)
            .then(r => this.simpleMsg(r))
            .catch(e => this.simpleMsg(new KubeOpReturn(KubeOpReturnStatus.Error, e.message, null)));
    }

    protected simpleMsg(op: KubeOpReturn<any>, displayFunc: SimpleMsgCallbFunction | undefined = undefined): void {
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