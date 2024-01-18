import { expect, test } from '@jest/globals';
import { Main, Cmd } from "../src/index";
import ParameterException from '../src/model/exception/ParameterException';

class MainTest extends Main {
    public printVCalled = false;    
    public printHCalled = false; 
    public execCmdParams: any = null;

    protected override printV(): void { this.printVCalled = true; }
    protected override printH(): void { this.printHCalled = true; }
    protected override execCmd(cmd: Cmd, ccp: string | null, payload: any): void {
        this.execCmdParams = { cmd: cmd, ccp:  ccp, payload: payload };
    }
}

test("print version called", () => {
    const main = new MainTest(["node", "jobman", "-v"]);
    expect(main.printVCalled).toBe(false);
    main.run();
    expect(main.printVCalled).toBe(true);
});

test("print help called", () => {
    const main = new MainTest(["node", "jobman", "-h"]);
    expect(main.printHCalled).toBe(false);
    main.run();
    expect(main.printHCalled).toBe(true);
});

test("submit called", () => {
    const main = new MainTest(["node", "jobman", "submit", "--"]);
    expect(main.execCmdParams).toBe(null);
    main.run();
    expect(main.execCmdParams).toStrictEqual({ cmd: Cmd.Submit, ccp: null, payload: {
        jobName: undefined,
        command: false,
        commandArgs: [],
        image: undefined,
        resources: undefined,
        annotations: undefined,
        dryRun: false
    } });
});

// test("submit called without '--' throws missing parameter", () => {
//     const main = new MainTest(["node", "jobman", "submit"]);
//     expect(main.execCmdParams).toBe(null);
//     expect(() => main.run()).toThrow(ParameterException);
// });

test("list success", () => {
    const main = new MainTest(["node", "jobman", "list"]);
    expect(main.execCmdParams).toBe(null);
    main.run();
    expect(main.execCmdParams).toStrictEqual({ cmd: Cmd.List, ccp: null, payload: {} });
});

test("log success", () => {
    const main = new MainTest(["node", "jobman", "log", "-j", "test"]);
    expect(main.execCmdParams).toBe(null);
    main.run();
    expect(main.execCmdParams).toStrictEqual({ cmd: Cmd.Log, ccp: null, payload: { jobName: "test" } });
});

test("log w/o job name", () => {
    const main = new MainTest(["node", "jobman", "log"]);
    expect(main.execCmdParams).toBe(null);
    expect(() => main.run()).toThrow(ParameterException);
});

test("log with empty job name", () => {
    const main = new MainTest(["node", "jobman", "log", "-j"]);
    expect(main.execCmdParams).toBe(null);
    // Checking TypeError is not working with jest and typescript
    expect(() => main.run()).toThrowError("Option '-j, --job-name <value>' argument missing");
});

test("delete success", () => {
    const main = new MainTest(["node", "jobman", "delete", "-j", "test"]);
    expect(main.execCmdParams).toBe(null);
    main.run();
    expect(main.execCmdParams).toStrictEqual({ cmd: Cmd.Delete, ccp: null, payload: { jobName: "test" } });
});

test("delete w/o job name", () => {
    const main = new MainTest(["node", "jobman", "delete"]);
    expect(main.execCmdParams).toBe(null);
    expect(() => main.run()).toThrow(ParameterException);
});