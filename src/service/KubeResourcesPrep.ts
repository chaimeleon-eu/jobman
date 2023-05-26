import { V1ResourceRequirements } from "@kubernetes/client-node";
import { Settings, Resources, KubeResources } from "../model/Settings.js";
import fs from "node:fs";
import KubeResourceException from "../model/exception/KubeResourceException.js";


export default class KubeResourcesPrep {

    public static DEFAULT_NOT_FOUND = 1;
    public static DEFAULT_CMD_MISSING = 2;
    public static CMD_NOT_FOUND = 3;

    // public static TEMPLATE: KubeResources = {
    //     "name": "template",
    //     "resources": {
    //         "requests": {
    //             "cpu": "1.0",
    //             "memory": "1G"
    //         },
    //         "limits": {
    //             "cpu": "1.0",
    //             "memory": "1G"
    //         }
    //     }
    // }

    protected static toJsonString(str: string) {
        try {
            return JSON.parse(str);
        } catch (e) {
            
            return null;
        }
    }

    public static getKubeResources(settings: Settings, cmd?: string): V1ResourceRequirements {
        let tmp: KubeResources | undefined = undefined;
        if (cmd) {
            const json: object = this.toJsonString(cmd); 
            if (json) {
                tmp = json as KubeResources;
            } else if (fs.existsSync(cmd) && fs.lstatSync(cmd).isFile()) {
                tmp = JSON.parse(fs.readFileSync(cmd, "utf8")) as KubeResources;
            } else {
                const resources: Resources | undefined = settings.job.resources; 
                tmp = resources?.predefined.find(e => e.name === cmd);
                if (!tmp) {
                    throw new KubeResourceException(this.CMD_NOT_FOUND, 
                        `Unable to find a predefined resources recipe with the name ${cmd}`);
                }
                    // ?? (resources?.default ?
                    //     (resources?.predefined.find(e => e.name === resources?.default))
                    //     : undefined);     
            }
        } else {
            const resources: Resources | undefined = settings.job.resources;
            if (resources?.default) {
                tmp = resources.predefined.find(e => e.name === resources.default);
                if (!tmp) {
                    throw new KubeResourceException(this.DEFAULT_NOT_FOUND, `A default predefined resources recipe has been set in the settings, but the application cannot find an entry with the name '${resources?.default})' in the list of predefined resources.`);
                }
            } else {
                throw new KubeResourceException(this.DEFAULT_CMD_MISSING, "Please specify the resources needed for the job. Use either the -r/--resources command line argument or set a default recipe in the settings file.");
            }
        }
        const res: V1ResourceRequirements = new V1ResourceRequirements();
        console.log(tmp);
        return {...res, ...tmp.resources};
    }
}
