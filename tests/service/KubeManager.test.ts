import { expect, test } from '@jest/globals';
import { KubeConfigType, Settings } from '../../src/model/Settings';
import KubeManager from "../../src/service/KubeManager";
import * as settings from "../../src/settings.json";

let tmpSettings: Settings = JSON.parse(JSON.stringify(settings));

beforeAll(() => {
    tmpSettings.sharedNamespace = "default";
    tmpSettings.kubeConfig.type = KubeConfigType.default;
  });

test("submit success", () => {
    let km = new KubeManager(tmpSettings);
    km.submit({
      container: "alpine:3.17.1",
      jobName: "test",
      command: "echo 'test'"
    });
});