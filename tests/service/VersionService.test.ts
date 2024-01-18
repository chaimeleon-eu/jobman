import { Readable } from 'stream';
import { expect, test, describe, beforeEach, afterAll, jest } from '@jest/globals';
import LastUpdateCheck from '../../src/model/LastUpdateCheck.js';
import { NewVersion } from '../../src/model/Settings.js';
import VersionService from '../../src/service/VersionService.js';

const customMessage = "test";

describe('test version compare', () => {

    class VersionServiceTest extends VersionService {
        public override compareNewVer(newVer: string | null): string | null { return super.compareNewVer(newVer); }
    }

    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules() // Most important - it clears the cache
      process.env = { ...OLD_ENV }; // Make a copy
    });
  
    afterAll(() => {
      process.env = OLD_ENV; // Restore old environment
    });
    
    test("3 groups, each same length, old version available", () => {
        process.env["npm_package_version"] = '1.1.1';
        expect(new VersionServiceTest({customMessage}).compareNewVer("1.1.0")).toBeNull();
    });
    
    test("3 groups, each same length, same version available", () => {
        process.env["npm_package_version"] = '1.1.1';
        expect(new VersionServiceTest({customMessage}).compareNewVer("1.1.0")).toBeNull();
    });
    
    test("3 groups, each same length, new version available", () => {
        process.env["npm_package_version"] = '1.1.1';
        expect(new VersionServiceTest({customMessage}).compareNewVer("1.1.2")).toBe(VersionService.NEW_VER_AVAILABLE("1.1.2", customMessage));
    });

    test("3 groups, patch one in current, two in new", () => {
        process.env["npm_package_version"] = '1.1.1';
        expect(new VersionServiceTest({customMessage}).compareNewVer("1.1.20")).toBe(VersionService.NEW_VER_AVAILABLE("1.1.20", customMessage));
    });

    test("3 groups, minor one in current, two in new", () => {
        process.env["npm_package_version"] = '1.1.1';
        expect(new VersionServiceTest({customMessage}).compareNewVer("1.10.2")).toBe(VersionService.NEW_VER_AVAILABLE("1.10.2", customMessage));
    });

    test("3 groups, major one in current, two in new", () => {
        process.env["npm_package_version"] = '9.1.1';
        expect(new VersionServiceTest({customMessage}).compareNewVer("10.1.2")).toBe(VersionService.NEW_VER_AVAILABLE("10.1.2", customMessage));
    });

    test("3 groups, major one in current, two in new, '-BETA' old", () => {
        process.env["npm_package_version"] = '9.1.1-BETA';
        expect(new VersionServiceTest({customMessage}).compareNewVer("10.1.2")).toBe(VersionService.NEW_VER_AVAILABLE("10.1.2", customMessage));
    });
});

describe('test new version check', () => {
    // only one field, version, which is set to '1.3.10-BETA'
    const packageJSONVersionTarGZ = "H4sIAAAAAAAAA+3Zz0rDMBzA8cyjIIq+QKxnu2T9J94UPHjw5rxnc8iq28o69TDER/HJ9FHEZG5syMo8bB3T7wdKmiaQX/nxS1ua9hod062KVVJWkkSu1UmkZtsJocMoUjWtgloslNZREgsZrTSqscd8YPpSCpObh3azeN6i8Q2Vfuc/M817c9fy07zXXfoaLsFxHBbnPwh+5D9UsRJSLT2SOf55/ofeU6uft3td71R62g98rY7PL67PvJftdYeGEozr35/dAPz8OVvmGqP6V6qg/oPp/q8TS7n6d8PUfwka6ubySp74NdfZm15/e//9Ldt5eatv95EF86qDTlYt44EDYI6demDfsdzZkXcoD/br6w4IAAAAQIkGWUW82nZr3K8UtAAAAAAAYHOZWyE+doX4tIf7/z/53h/1AQAAAADAHzBcdwAAAAAAAAAAAGAFvgC+I80KAFAAAA=="
    const packageJsonPath = "jobman/package.json";
    const repository = "test.tar.gz";
    const packageJSONVersionTarGZVer = "1.3.10-BETA";

    class VersionServiceTest extends VersionService {

        luc: LastUpdateCheck | null;
        rs: Buffer;

        constructor(v: NewVersion | null | undefined, luc: LastUpdateCheck | null, rs: Buffer) { 
            super(v);
            this.luc = luc;
            this.rs = rs;
        }

        protected override getLastUpdateCheck(): LastUpdateCheck | null { return this.luc; }
        protected override getReadStream(path: string): Readable {  return Readable.from(this.rs); }
        protected override storeLastUpdateCheck(newVer: string) {}
    }

    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules() // Most important - it clears the cache
      process.env = { ...OLD_ENV }; // Make a copy
    });
  
    afterAll(() => {
      process.env = OLD_ENV; // Restore old environment
    });

    test("no last check file, same version available", async () => {
        process.env["npm_package_version"] = packageJSONVersionTarGZVer;
        await expect(new VersionServiceTest({customMessage}, null, Buffer.from(packageJSONVersionTarGZ, "base64")).check())
            .resolves.toBeNull();
    });

    test("no last check file, new version available", async () => {
        process.env["npm_package_version"] = '1.3.9-BETA';
        await expect(new VersionServiceTest({customMessage, packageJsonPath, repository}, null, Buffer.from(packageJSONVersionTarGZ, "base64")).check())
            .resolves.toBe(VersionService.NEW_VER_AVAILABLE(packageJSONVersionTarGZVer, customMessage));
    });

    test("last check file with check not due and same version, new version available ", async () => {
        const v = '1.3.9-BETA';
        process.env["npm_package_version"] = v;
        const now = Date.now();
        const luc: LastUpdateCheck = {
            lastCheck: now,
            remoteVersion: v
        }
        const nv: NewVersion = {
            customMessage, packageJsonPath, repository, check: "99999999h"
        }
        await expect(new VersionServiceTest(nv, luc, Buffer.from(packageJSONVersionTarGZ, "base64")).check()).resolves.toBeNull();
    });

    test("last check file with check not due and new version, new version available ", async () => {
        const v = '1.3.9-BETA';
        process.env["npm_package_version"] = v;
        const now = Date.now();
        const luc: LastUpdateCheck = {
            lastCheck: now,
            remoteVersion: packageJSONVersionTarGZVer
        }
        const nv: NewVersion = {
            customMessage, packageJsonPath, repository, check: "99999999h"
        }
        await expect(new VersionServiceTest(nv, luc, Buffer.from(packageJSONVersionTarGZ, "base64")).check())
            .resolves.toBe(VersionService.NEW_VER_AVAILABLE(packageJSONVersionTarGZVer, customMessage));
    });

    test("last check file with check due and same version, new version available ", async () => {
        const v = '1.3.9-BETA';
        process.env["npm_package_version"] = v;
        const now = Date.now();
        const luc: LastUpdateCheck = {
            lastCheck: now,
            remoteVersion: v
        }
        const nv: NewVersion = {
            customMessage, packageJsonPath, repository, check: "1s"
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        await expect(new VersionServiceTest(nv, luc, Buffer.from(packageJSONVersionTarGZ, "base64")).check())
            .resolves.toBe(VersionService.NEW_VER_AVAILABLE(packageJSONVersionTarGZVer, customMessage));
    });


});