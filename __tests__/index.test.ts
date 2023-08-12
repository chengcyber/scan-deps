import path from "path";
import { scanDeps, ScanDepsConfig, ScanDepsResult } from "../src/index";
import { resolveDependencyNameInfoMap } from "./utils/infoMap";
import { fixtureFolder } from "./utils/paths";

const packageAFolder = path.resolve(fixtureFolder, "package-a");
const packageBFolder = path.resolve(fixtureFolder, "package-b");
const packageCFolder = path.resolve(fixtureFolder, "package-c");
const packageDFolder = path.resolve(fixtureFolder, "package-d");

describe("Node API", () => {
  it("should work with simple demo", async () => {
    const cwd: string = packageAFolder;
    const result: ScanDepsResult = await scanDeps({
      cwd,
    });
    testScanDepsResultMatchSnapshot(result, cwd);
  });

  it("should work with directory parameter", async () => {
    const cwd: string = packageBFolder;
    const result = await scanDeps({
      cwd,
      directory: "dist",
    });
    testScanDepsResultMatchSnapshot(result, cwd);

    const result2 = await scanDeps({
      cwd: packageBFolder,
      directory: "dist,a,b",
    });
    expect(result2).toEqual(result);
  });

  it("should work with extension parameter", async () => {
    const cwd: string = packageCFolder;
    const result: ScanDepsResult = await scanDeps({
      cwd,
      extension: "ts",
    });
    testScanDepsResultMatchSnapshot(result, cwd);

    const result2 = await scanDeps({
      cwd: packageCFolder,
      extension: "tsx,ts",
    });
    expect(result2).toEqual(result);
  });

  it("can handle dot in package name", async () => {
    const cwd: string = packageDFolder;
    const result: ScanDepsResult = await scanDeps({
      cwd,
      extension: "ts"
    });
    testScanDepsResultMatchSnapshot(result, cwd);
  });
});

function testScanDepsResultMatchSnapshot(result: ScanDepsResult, cwd: string): void {
  const { detectedNameInfoMap, ...rest } = result;
  expect(rest).toMatchSnapshot();
  expect(resolveDependencyNameInfoMap(detectedNameInfoMap, cwd)).toMatchSnapshot();
}
