import tar from "tar-stream";
import fs, { ReadStream } from "node:fs";
import zlib from "node:zlib";
import { homedir } from 'os';
import path from 'path';

import { NewVersion, Settings } from "../model/Settings.js";
import UnhandledValueException from "../model/exception/UnhandledValueException.js";
import LastUpdateCheck from "../model/LastUpdateCheck.js";

export default class VersionService {

    protected static ERROR_MSG = (newVersion: string | null | undefined, errorMsg: string) => 
        `\nError trying to read the new version value from '${newVersion}': ${errorMsg}\n`;

    public static USER_HOME_PATH = ".jobman/last_update_check.json";

    private newVersion: NewVersion | null | undefined;

    constructor(settings: Settings) {
        this.newVersion = settings.newVersion;
    }

    private getAfterDate(): number {
        const checkAfter: string | undefined | null = this.newVersion?.check?.toLowerCase();
        if (checkAfter) {
            if (checkAfter.endsWith("h")) {
                return Number(checkAfter.substring(0, checkAfter.length - 1)) * 3600000;
            } else if (checkAfter.endsWith("m")) {
                return Number(checkAfter.substring(0, checkAfter.length - 1)) * 60000;
            } else if (checkAfter.endsWith("s")) {
                return Number(checkAfter.substring(0, checkAfter.length - 1)) * 1000;
            } else {
                throw new UnhandledValueException("Unhandled type of check after interval, use 'h' for hours or 'm' for minutes or 's' for seconds.")
            }
        } else {
            return 0;
        }

    }

    protected compareNewVer(newVer: string | null): string | null {
        if (newVer) {
            const cVer: string | undefined = process.env["npm_package_version"];
            const comp: number | undefined = cVer?.toLowerCase()?.localeCompare(newVer.toLowerCase());
            return comp && comp < 0 ?
                `\nA new version  of jobman, ${newVer}, is available.\n${this.newVersion?.customMessage ?? ""}\n` : null;
        } else {
            return null
        }
    }

    protected getPathLastUpdateCheck(): string {
        return path.join(homedir(), VersionService.USER_HOME_PATH);
    }

    protected storeLastUpdateCheck(newVer: string) {
        const luc: LastUpdateCheck = {
            lastCheck: Date.now(),
            remoteVersion: newVer
        }
        const uH: string = this.getPathLastUpdateCheck();
        try {
            fs.mkdirSync(path.dirname(uH), { recursive: true });
            fs.writeFileSync(uH, JSON.stringify(luc));
        } catch (e) {
            console.error("[ERROR] Cannot write the date of the last check for an update: ", e);
        }

    }

    protected checkTarGz(resolve: Function, reject: Function) {
        try {
            const pkgJson: string | null | undefined = this.newVersion?.packageJsonPath;
            if (pkgJson) {
                const extract = tar.extract();
                const datas: Map<string, string> = new Map<string, string>();
                extract.on('entry', (header, stream, cb) => {
                    stream.on('data', (chunk) => {
                            if (header.name.endsWith(pkgJson)) {
                                let data: string | undefined = datas.get(header.name);
                                if (!data) {
                                    data = "";
                                }
                                data += chunk;
                                datas.set(header.name, data);
                            }
                    });

                    stream.on("error", (e: Error) => {
                        reject(VersionService.ERROR_MSG(this.newVersion?.repository, e.message));
                    });
                
                    stream.on('end', function() {
                        cb();
                    });
                
                    stream.resume();
                });
                extract.on("error", (e: Error) => {
                    reject(VersionService.ERROR_MSG(this.newVersion?.repository, e.message));
                });
                
                extract.on('finish', () => {
                    if (datas.size === 1) {
                        try {
                            //console.log(datas.values().next().value);
                            const pkgObj = JSON.parse(datas.values().next().value);
                            if (pkgObj) {
                                const newVer: string | undefined = pkgObj["version"];
                                if (newVer) {
                                    this.storeLastUpdateCheck(newVer);
                                    resolve(this.compareNewVer(newVer));
                                } else {
                                    reject(VersionService.ERROR_MSG(this.newVersion?.repository, 
                                        `Missing 'version' property in ${this.newVersion?.packageJsonPath}`));
                                }
                            } else {
                                reject(VersionService.ERROR_MSG(this.newVersion?.repository, 
                                    `Unable to parse ${this.newVersion?.packageJsonPath}`));
                            }
                        } catch (e) {
                            const msg = e instanceof Error ? e.message : String(e);
                            reject(VersionService.ERROR_MSG(this.newVersion?.repository, msg));
                        }
                    } else if (datas.size > 1) {
                        reject(VersionService.ERROR_MSG(this.newVersion?.repository, 
                            `Multiple ${this.newVersion?.packageJsonPath} files found in '${this.newVersion?.repository}'`));
                    } else {
                        reject(VersionService.ERROR_MSG(this.newVersion?.repository, 
                            `No ${this.newVersion?.packageJsonPath} file found in '${this.newVersion?.repository}'`));
                    }
                });
                if (this.newVersion?.repository) {
                    const stream: ReadStream = fs.createReadStream(this.newVersion?.repository);
                    stream.on("error", 
                        (e: Error) => reject(VersionService.ERROR_MSG(this.newVersion?.repository, e.message)));
                    stream.pipe(zlib.createGunzip())
                        .pipe(extract);
                } else {
                    reject("New version repository is null or undefined");
                }

            } else {
                reject(VersionService.ERROR_MSG(this.newVersion?.repository, "Please set the path of the new app version's package json in the settings for the repository of type tar.gz."));
            }
        } catch(e) {
            const msg = e instanceof Error ? e.message : String(e);
            reject(VersionService.ERROR_MSG(this.newVersion?.repository, msg));
        }
    }

    public check(): Promise<string | null> {
        const checkAfter: number = this.getAfterDate();
        // only check for a new version if 
        let luc: LastUpdateCheck | null = null;
        let lastCheck = 0;
        const uH: string = this.getPathLastUpdateCheck();
        try {
            luc = JSON.parse(fs.readFileSync(uH, {encoding: "ascii"})) as LastUpdateCheck;//Number(fs.readFileSync(uH, {encoding: "ascii"}));
            lastCheck = luc.lastCheck;
        } catch (e) {
            //console.debug(e);
        }

        if (Date.now() > checkAfter + lastCheck) {
            return new Promise<string | null>((resolve, reject) => {
                if (this.newVersion?.repository) {
                    if (this.newVersion.packageJsonPath && this.newVersion.repository.toLowerCase().endsWith("tar.gz")) {
                       this.checkTarGz(resolve, reject);
                    } else {
                        reject(VersionService.ERROR_MSG(this.newVersion.repository, "The format of the new version is unsupported."));
                    }
                } else {
                    resolve(null);
                }
            });
        } else {
            return Promise.resolve(this.compareNewVer(luc?.remoteVersion ?? null));
        }
    }
}