import path from "path";
import { scanDeps } from "../src/index";
import { fixtureFolder } from "./utils/paths";

const packageAFolder = path.resolve(fixtureFolder, "package-a");
const packageBFolder = path.resolve(fixtureFolder, "package-b");
const packageCFolder = path.resolve(fixtureFolder, "package-c");

describe("Node API", () => {
  it("should work with simple demo", async () => {
    const result = await scanDeps({
      cwd: packageAFolder,
    });
    expect(result).toMatchSnapshot();
  });

  it("should work with directory parameter", async () => {
    const result = await scanDeps({
      cwd: packageBFolder,
      directory: "dist",
    });
    expect(result).toMatchSnapshot();

    const result2 = await scanDeps({
      cwd: packageBFolder,
      directory: "dist,a,b",
    });
    expect(result2).toEqual(result);
  });

  it("should work with extension parameter", async () => {
    const result = await scanDeps({
      cwd: packageCFolder,
      extension: "ts",
    });
    expect(result).toMatchSnapshot();

    const result2 = await scanDeps({
      cwd: packageCFolder,
      extension: "tsx,ts",
    });
    expect(result2).toEqual(result);
  });
});
