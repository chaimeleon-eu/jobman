import tar from "tar-stream";
import fs, { ReadStream } from "node:fs";
import zlib from "node:zlib";

import { NewVersion, Settings } from "../model/Settings.js";

export default class VersionService {

    protected static ERROR_MSG = (newVersion: string | null | undefined, errorMsg: string) => 
        `\nError trying to obtain the new version value from ${newVersion}: ${errorMsg}\n`;

    private newVersion: NewVersion | null | undefined;

    constructor(settings: Settings) {
        this.newVersion = settings.newVersion;
    }

    check(): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            if (this.newVersion && this.newVersion.repository) {
                if (this.newVersion.packageJsonPath && this.newVersion.repository.toLowerCase().endsWith("tar.gz")) {
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
                                            const cVer: string | undefined = process.env["npm_package_version"];
                                            const newVer: string | undefined = pkgObj["version"];
                                            if (newVer) {
                                                const comp: number | undefined = cVer?.toLowerCase()?.localeCompare(newVer.toLowerCase());
                                                const msg = comp && comp < 0 ?
                                                    `\nA new version  of jobman, ${newVer}, is available.\n${this.newVersion?.customMessage ?? ""}\n` : null;
                                                resolve(msg);
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
                            
                            const stream: ReadStream = fs.createReadStream(this.newVersion.repository);
                            stream.on("error", 
                                (e: Error) => reject(VersionService.ERROR_MSG(this.newVersion?.repository, e.message)));
                            stream.pipe(zlib.createGunzip())
                                .pipe(extract);

                        } else {
                            reject(VersionService.ERROR_MSG(this.newVersion?.repository, "Please set the path of the new app version's package json in the settings for the repository of type tar.gz."));
                        }
                    } catch(e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        reject(VersionService.ERROR_MSG(this.newVersion.repository, msg));
                    }
                } else {
                    reject(VersionService.ERROR_MSG(this.newVersion.repository, "The format of the new version is unsupported."));
                }
            } else {
                resolve(null);
            }
        });
    }
}