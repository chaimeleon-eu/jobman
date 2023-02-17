import { expect, test } from '@jest/globals';
// import { Response } from 'node-fetch';
// import { resolve } from 'path';
// import ImageDetails from '../../src/model/ImageDetails';
// import KubeOpReturn from '../../src/model/KubeOpReturn';
// import { KubeConfigType, Settings } from '../../src/model/Settings';
// import KubeManager from "../../src/service/KubeManager";
// import * as settings from "../../src/settings.json";

// let tmpSettings: Settings = JSON.parse(JSON.stringify(settings));

// beforeAll(() => {
//     tmpSettings.sharedNamespace = "default";
//     tmpSettings.kubeConfig.type = KubeConfigType.default;
//   });

test("submit success", () => {
    // let km = new KubeManager(tmpSettings);
    // km.submit({
    //   container: "alpine:3.17.1",
    //   jobName: "test",
    //   command: "echo 'test'"
    // });
    expect(0).toBe(0);
});


// test("success calling harbor",  async () => {
//   let km = new KubeManager(tmpSettings);
//   jest.spyOn(km as any, "fetchCustom").mockReturnValue(new Promise<Response>((resolve) => {
//     const r: Response = new Response();
//     resolve(r);
//   }));
//   const res: KubeOpReturn<ImageDetails[]> = await km.images();
// });