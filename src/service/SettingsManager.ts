import fs from "node:fs";
import { homedir } from 'os';
import path from 'path';
import deepmerge from "deepmerge";

import { Settings } from "../model/Settings.js";
import Util from "../Util.js";

export default class SettingsManager {

    public static USER_HOME_PATH = ".jobman/settings.json";

    private _settings: Settings;

    public constructor(settingsPath: string | null | undefined) {
        if (!settingsPath) {
            this._settings = JSON.parse(fs.readFileSync(path.resolve(Util.getDirName(), 'settings.json'), 'utf8'));
            // try to read from user's home
            const uH: string = path.join(homedir(), SettingsManager.USER_HOME_PATH);
            if (fs.existsSync(uH)) {
                try {
                    const settingsHome: Settings = JSON.parse(fs.readFileSync(uH, 'utf8'));
                    //console.log(`Merging settings found in user's home at '${uH}' into global settings...`);
                    //Object.assign(this._settings, settingsHome);
                    this._settings = deepmerge(this._settings, settingsHome);
                } catch (e) {
                    console.error(e);
                }
            } else {
                //console.log(`Settings not found in user's home at '${uH}'`);
            }
        } else {
            this._settings = JSON.parse(fs.readFileSync(path.resolve(Util.getExecDir(), settingsPath), 'utf-8'));
        }
    }

    public get settings() {return this._settings;}
}