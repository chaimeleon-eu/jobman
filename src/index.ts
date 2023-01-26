
//import log from "loglevel";
import { parseArgs } from 'node:util';

import settings from "./settings.json" assert { type: "json" };
import { exit } from "node:process";
import DisplayService from "./service/DisplayService.js";

const ARGS_PARSING_ERROR_MSG: string = "Error parsing the arguments, please check the help by passing -h/--help as first arg of the application.";

if (process.argv.length <= 2) {
    printV();
    exit(0);
}

const args: string[] = process.argv.slice(2);
const cmdArg: string | undefined = args[0]?.toLowerCase();
if (!cmdArg) {
    printV();
    exit(0);
}
switch (cmdArg) {

    case "-h": 
    case "--help": printHelp(); break;
    case "-v":
    case "--version": printV(); break;
    case "-c":
    case "--cluster-config": 
        if (args.length >= 3) {
            const cmdArgTmp: string | undefined = args[2];
            const configPath:string | undefined = args[1];
            if (cmdArgTmp && configPath) {
                execCmd(cmdArgTmp, configPath, args.slice(2, args.length));
            } else {
                console.error(`Undefined configuration path '${configPath}' and/or command '${cmdArgTmp}'`);
            }
        } else {
            console.error(ARGS_PARSING_ERROR_MSG);
        }
        break;    
    default: execCmd(cmdArg, null, args.slice(1, args.length)); break;
}

function execCmd(cmdArg: string, ccp: string | null, cmdArgs: string[]): void {    
    const ds: DisplayService = new DisplayService(settings, ccp);
    switch (cmdArg) {
        case "submit": 
            const cmdPos = cmdArgs.indexOf("--");
            if (cmdPos !== -1) {
                const tmp = cmdArgs.slice(0, cmdPos);
                const { values } = parseArgs({ tmp, options: {
                    jobName: { type: "string" },
                    container: { type: "string" },
                    gpu: { type: "boolean" },
                    cpus: { type: "string" },
                    memory: { type: "string" }
                }
            });
                ds.submit({
                    jobName: values.jobName, container: values.container, gpu: values.gpu, 
                    cpus: values.cpus ? Number(values.cpus) : undefined, 
                    memory: values.memory ? Number(values.memory) : undefined,
                    command: cmdArgs.slice(cmdPos, cmdArgs.length).join(" ")
                });
            } else {
                console.error("Missing container command separator '--'. It is needed to separate jobman's args and the actual command  passed to the container.");
            }
            break;
        case "list": ds.list(); break;
        case "details": 
            const { values: dv } = parseArgs({ cmdArgs, options: {
                jobName: { type: "string" }
            }});
            ds.details(dv.jobName); 
            break;
        case "log": 
            const { values: lv } = parseArgs({ cmdArgs, options: {
                jobName: { type: "string", required: true }
            }});
            if (lv.jobName)
                ds.log(lv.jobName);
            else
                console.error("Please specify the job name.");
            break;
        case "delete": 
            const { values: cv } = parseArgs({ cmdArgs, options: {
                jobName: { type: "string", required: true }
            }});
            if (cv.jobName)
                ds.delete(cv.jobName);
            else
                console.error("Please specify the job name.");
            break;
        default: console.error(ARGS_PARSING_ERROR_MSG);
    }
}

function printHelp() {
    console.info("help");
}

function printV() {
    console.info(`jobman version ${process.env["npm_package_version"]}`);
}
