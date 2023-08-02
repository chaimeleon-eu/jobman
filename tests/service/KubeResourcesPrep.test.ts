import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { expect, test } from '@jest/globals';
import { KubeResources, Settings } from '../../src/model/Settings.js';
import  settings from "../../src/settings.json" assert {type: "json"};
import KubeResourcesPrep from  "../../src/service/KubeResourcesPrep.js";
import KubeResourceException from '../../src/model/exception/KubeResourceException.js';
import { V1ResourceRequirements } from '@kubernetes/client-node';

const s: Settings = settings as unknown as Settings;
// {
//     job:{
//         resources: {
//             default: null,
//             predefined: [
//                 {
//                     name: "tst1",
//                     resources: {
//                         requests: {
//                             cpu: 1,
//                             memory: "1G"
//                         }
//                     }
//                 }
//             ]

//         }
//     }
// }

test("cmd and default missing throw error", () => {
    const tmp: Settings = JSON.parse(JSON.stringify(s)) as Settings;
    tmp.job.resources = {
                    predefined: []
            };
    try {
        KubeResourcesPrep.getKubeResources(tmp, undefined);
    } catch(e) {
        expect(e).toBeInstanceOf(KubeResourceException);
        expect((e as KubeResourceException).getCode()).toBe(KubeResourcesPrep.DEFAULT_CMD_MISSING);
    }
});

test("cmd missing, default value not found in predefined", () => {
    const tmp: Settings = JSON.parse(JSON.stringify(s)) as Settings;
    tmp.job.resources = {
                    default: "not defined",
                    predefined: []
            };
    try {
        KubeResourcesPrep.getKubeResources(tmp, undefined);
    } catch(e) {
        expect(e).toBeInstanceOf(KubeResourceException);
        expect((e as KubeResourceException).getCode()).toBe(KubeResourcesPrep.DEFAULT_NOT_FOUND);
    }
});

test("cmd value not found in predefined, default missing", () => {
    const tmp: Settings = JSON.parse(JSON.stringify(s)) as Settings;
    tmp.job.resources = { predefined: [] };
    try {
        KubeResourcesPrep.getKubeResources(tmp, "not_defined");
    } catch(e) {
        expect(e).toBeInstanceOf(KubeResourceException);
        expect((e as KubeResourceException).getCode()).toBe(KubeResourcesPrep.CMD_NOT_FOUND);
    }
});

test("cmd value found predefined", () => {
    const tmp: Settings = JSON.parse(JSON.stringify(s)) as Settings;
    const def: KubeResources = {name: "def", resources: { requests: {cpu: "1234m", memory: "1G"} }};
    tmp.job.resources = { predefined: [def] };
    const r: V1ResourceRequirements = KubeResourcesPrep.getKubeResources(tmp, "def");
    expect(r.requests).toBe(def.resources.requests);
});

test("cmd json accepted", () => {
    const tmp: Settings = JSON.parse(JSON.stringify(s)) as Settings;
    const def: KubeResources = {name: "def", resources: { requests: {cpu: "1234m", memory: "1G"} }};
    tmp.job.resources = { predefined: [] };
    const r: V1ResourceRequirements = KubeResourcesPrep.getKubeResources(tmp, JSON.stringify(def));
    expect(r.requests).toStrictEqual(def.resources.requests);
});

test("cmd file name accepted", () => {
    const tmp: Settings = JSON.parse(JSON.stringify(s)) as Settings;
    const def: KubeResources = {name: "def", resources: { requests: {cpu: "1234m", memory: "1G"} }};
    const tmpF = path.join(os.tmpdir(), uuidv4() + " s.json");
    fs.writeFileSync(tmpF, JSON.stringify(def));
    tmp.job.resources = { predefined: [] };
    const r: V1ResourceRequirements = KubeResourcesPrep.getKubeResources(tmp, tmpF);
    expect(r.requests).toStrictEqual(def.resources.requests);
    fs.rmSync(tmpF);
});