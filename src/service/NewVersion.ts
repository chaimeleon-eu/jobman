import tar from "tar-stream";
import fs, { ReadStream } from "node:fs";
import zlib from "node:zlib";

import { Settings } from "../model/Settings.js";

export default class NewVersion {

    protected static ERROR_MSG = (newVersion: string | null | undefined, errorMsg: string) => 
        `\nError trying to obtain the new version value from ${newVersion}: ${errorMsg}\n`;

    private newVersion: string | null | undefined;

    constructor(settings: Settings) {
        this.newVersion = settings.newVersion;
    }

    check(): Promise<string | null> {
        return new Promise<string | null>((resolve, reject) => {
            if (this.newVersion) {
                if (this.newVersion.toLowerCase().endsWith("tar.gz")) {
                    try {
                        const extract = tar.extract();
                        let data = '';
                        extract.on('entry', function(header, stream, cb) {
                            stream.on('data', function(chunk) {
                                if (header.name === 'package.json')
                                    data += chunk;
                            });
                        
                            stream.on('end', function() {
                                cb();
                            });
                        
                            stream.resume();
                        });
                        extract.on("error", (err: Error) => {
                            reject(NewVersion.ERROR_MSG(this.newVersion, err.message));
                        });
                        
                        extract.on('finish', () => {
                            let pkgObj = JSON.parse(data);
                            if (pkgObj) {
                                const cVer: string | undefined = process.env["npm_package_version"];
                                const newVer: string | undefined = pkgObj["version"];
                                if (newVer) {
                                    const msg = cVer?.toLowerCase()?.localeCompare(newVer.toLowerCase()) ?
                                        `\nA new version  of jobman, ${newVer}, is available.\n` : null;
                                    resolve(msg);
                                } else {
                                    reject(NewVersion.ERROR_MSG(this.newVersion, "Missing 'version' property in 'package.json'"));
                                }
                            } else {
                                reject(NewVersion.ERROR_MSG(this.newVersion, "Unable to parse 'package.json'"));
                            }
                        });
                        
                        const stream: ReadStream = fs.createReadStream(this.newVersion);
                        stream.on("error", 
                            (e: Error) => reject(NewVersion.ERROR_MSG(this.newVersion, e.message)));
                        stream.pipe(zlib.createGunzip())
                            .pipe(extract);
                    } catch(e) {
                        const msg = e instanceof Error ? e.message : String(e);
                        reject(NewVersion.ERROR_MSG(this.newVersion, msg));
                    }
                } else {
                    reject(NewVersion.ERROR_MSG(this.newVersion, "The format of the new version is unsupported."));
                }
            } else {
                resolve(null);
            }
        });
    }
}