
//import log from "loglevel";
import { parseArgs } from 'node:util';
import fs from 'fs';
import { exit } from "node:process";

import settings from "./settings.json" assert { type: "json" };
import DisplayService from "./service/DisplayService.js";
import ParameterException from './model/exception/ParameterException.js';
import { Settings } from './model/Settings.js';

const ARGS_PARSING_ERROR_MSG: string = "Error parsing the arguments, please check the help by passing -h/--help as first arg of the application.";

export enum Cmd {
    Images, Submit, List, Details, Log, Delete
}

export class Main {

    protected args: string[];

    constructor(args: string[]) {
        this.args = args;
    }

    public run(): number {
            if (this.args.length <= 2) {
                this.printV();
                return 0;
            }
            
            const argsTmp: string[] = this.args.slice(2);
            const cmdArg: string | undefined = argsTmp[0]?.toLowerCase();
            if (!cmdArg) {
                this.printV();
                return 0;
            }
            switch (cmdArg) {
            
                case "-h": 
                case "--help": this.printH(); break;
                case "-v":
                case "--version": this.printV(); break;
                case "-s":
                case "--settings": 
                    if (argsTmp.length >= 3) {
                        const cmdArgTmp: string | undefined = argsTmp[2];
                        const settingsPath:string | undefined = argsTmp[1];
                        if (cmdArgTmp && settingsPath) {
                            this.parseCmdArgs(cmdArgTmp, settingsPath, argsTmp.slice(2, argsTmp.length));
                        } else {
                            console.error(`Undefined settings path '${settingsPath}' and/or command '${cmdArgTmp}'`);
                            return 1;
                        }
                    } else {
                        console.error(ARGS_PARSING_ERROR_MSG);
                        return 1;
                    }
                    break;    
                default: this.parseCmdArgs(cmdArg, null, argsTmp.slice(1, argsTmp.length)); break;
            }
            return 0;
    }

    protected parseCmdArgs(cmdArg: string, sp: string | null, cmdArgs: string[]): void {
        switch (cmdArg) {
            case "submit": 
                const cmdPos = cmdArgs.indexOf("--");
                if (cmdPos !== -1) {
                    const tmp = cmdArgs.slice(0, cmdPos);
                    const { values } = parseArgs({ args: tmp, options: {
                        "job-name": { type: "string", short: "j" },
                        image: { type: "string", short: "i" },
                        "enable-gpu": { type: "boolean", short: "e" },
                        cpus: { type: "string", short: "t" },
                        memory: { type: "string", short: "m" }
                    }
                });
                this.execCmd(Cmd.Submit, sp, {
                        jobName: values["job-name"], image: values.image, gpu: values["enable-gpu"], 
                        cpus: values.cpus ? Number(values.cpus) : undefined, 
                        memory: values.memory ? Number(values.memory) : undefined,
                        command: cmdArgs.slice(cmdPos, cmdArgs.length).join(" ")
                    });
                } else {
                    throw new ParameterException("Missing container command separator '--'. It is needed to separate jobman's args and the actual command  passed to the container.");
                }
                break;
            case "list": this.execCmd(Cmd.List, sp, null); break;
            case "images":  this.execCmd(Cmd.Images, sp, null); break;
            case "details": 
                const { values: dv } = parseArgs({ args: cmdArgs, options: {
                    "job-name": { type: "string", short: "j" }
                }});
                this.execCmd(Cmd.Details, sp, { jobName: dv["job-name"] }); 
                break;
            case "log": 
                const lv = parseArgs({ args: cmdArgs, options: {
                    "job-name": { type: "string", short: "j" }
                }});
                if (lv.values["job-name"])
                    this.execCmd(Cmd.Log, sp, { jobName: lv.values["job-name"] });
                else
                    throw new ParameterException(`Please specify the job name for the '${cmdArg}' command.`);
                break;
            case "delete": 
                const { values: cv } = parseArgs({ args: cmdArgs, options: {
                    "job-name": { type: "string", short: "j" }
                }});
                if (cv["job-name"])
                    this.execCmd(Cmd.Delete, sp, { jobName: cv["job-name"] });
                else
                    throw new ParameterException(`Please specify the job name for the '${cmdArg}' command.`);
                break;
            default: throw new ParameterException(`Unknown command '${cmdArg}'. Please check the help section.`);
        }
    }

    protected execCmd(cmd: Cmd, sp: string | null, payload: any): void {  
        let s: Settings = settings as unknown as Settings;
        if (sp) {
            s = JSON.parse(fs.readFileSync(sp, 'utf-8'))
        }
        let ds: DisplayService = new DisplayService(s);
        switch (cmd) {
            case Cmd.Images: ds.images(); break;
            case Cmd.Submit: ds.submit(payload); break;
            case Cmd.List: ds.list(); break;
            case Cmd.Details: ds.details(payload.jobName); break;
            case Cmd.Log: ds.log(payload.jobName); break;
            case Cmd.Delete: ds.delete(payload.jobName); break;
            default: console.error(ARGS_PARSING_ERROR_MSG);
        }
    }
    
    protected printH() {
        console.info("help");
    }
    
    protected printV() {
        console.info();
    }
    
    public getV(): string {
        return `jobman version '${process.env["npm_package_version"]}'`;
    }

}

function main(): number {
    let main = new Main(process.argv);
    try {
        return main.run();
    } catch (e) {
        console.error(e);
        return 1;
    }
}



const code = main();
if (code !== 0) {
    exit(code);
}
