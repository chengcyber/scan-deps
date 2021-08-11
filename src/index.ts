import colors from "colors/safe";
import path from "path";
import fs, { promises as fsp } from "fs";
import glob from "glob";
import builtinPackageNames from "builtin-modules";
import { parseHeaderOrFail, Header } from "@definitelytyped/header-parser";
import { unmangleScopedPackage } from "@definitelytyped/utils";

export interface ScanDepsConfig {
  extension?: string;
  directory?: string;
  isDebug?: boolean;
  cwd?: string;
}

export interface ScanDepsResult {
  detectedDependencies: string[];
  missingDependencies: string[];
  unusedDependencies: string[];
}

const defaultScanDepsConfig: ScanDepsConfig = {
  extension: "ts,js,tsx,jsx",
  directory: "src,lib",
  isDebug: false,
  cwd: process.cwd(),
};

/**
 * packages used implicitly, may not be declared in source code
 */
const implicitPackageNames = [
  "tslib",
  "@babel/runtime",
  "babel-runtime",
  "regenerator-runtime",
  "jest",
];

async function scanDeps(config: ScanDepsConfig): Promise<ScanDepsResult> {
  const finalConfig = {
    ...defaultScanDepsConfig,
    ...config,
  } as Required<ScanDepsConfig>;

  const { extension, directory, isDebug, cwd } = finalConfig;
  const log = (...args: any[]) => {
    isDebug && console.log(...args);
  };
  log("cwd", cwd);

  const packageJsonFilename: string = path.resolve(cwd, "./package.json");

  if (!fs.existsSync(packageJsonFilename)) {
    throw new Error(`File ${packageJsonFilename} does not exist`);
  }

  const requireRegExps: RegExp[] = [
    // Example: require('something')
    /\brequire\s*\(\s*[']([^']+\s*)[']\)/,
    /\brequire\s*\(\s*["]([^"]+)["]\s*\)/,

    // Example: require.ensure('something')
    /\brequire.ensure\s*\(\s*[']([^']+\s*)[']\)/,
    /\brequire.ensure\s*\(\s*["]([^"]+)["]\s*\)/,

    // Example: require.resolve('something')
    /\brequire.resolve\s*\(\s*[']([^']+\s*)[']\)/,
    /\brequire.resolve\s*\(\s*["]([^"]+)["]\s*\)/,

    // Example: System.import('something')
    /\bSystem.import\s*\(\s*[']([^']+\s*)[']\)/,
    /\bSystem.import\s*\(\s*["]([^"]+)["]\s*\)/,

    // Example:
    //
    // import {
    //   A, B
    // } from 'something';
    /\bfrom\s*[']([^']+)[']/,
    /\bfrom\s*["]([^"]+)["]/,

    // Example:  import 'something';
    /\bimport\s*[']([^']+)[']\s*\;/,
    /\bimport\s*["]([^"]+)["]\s*\;/,

    // Example:  import('something');
    /(?<!\.)\bimport\([']([^']+)[']\)/,
    /(?<!\.)\bimport\(["]([^"]+)["]\)/,

    // Example:
    // /// <reference types="something" />
    /\/\/\/\s*<\s*reference\s+types\s*=\s*["]([^"]+)["]\s*\/>/,
  ];

  // Example: "my-package/lad/dee/dah" --> "my-package"
  // Example: "@ms/my-package" --> "@ms/my-package"
  const packageRegExp: RegExp = /^((@[a-z\-0-9!_]+\/)?[a-z\-0-9!_]+)\/?/;

  const requireMatches: Set<string> = new Set<string>();

  const pattern = `{./*.{${extension}},./{${directory}}/**/*.{${extension}}}`;
  log("glob pattern is", pattern);
  const filenames = glob.sync(pattern, {
    cwd,
  });
  log("filenames", filenames);

  for (const filename of filenames) {
    try {
      const contents: string = await fsp.readFile(
        path.resolve(cwd, filename),
        "utf8"
      );
      const lines: string[] = contents.split("\n");

      for (const line of lines) {
        for (const requireRegExp of requireRegExps) {
          const requireRegExpResult: RegExpExecArray | null =
            requireRegExp.exec(line);
          if (requireRegExpResult) {
            requireMatches.add(requireRegExpResult[1]);
          }
        }
      }
    } catch (error) {
      log(
        colors.bold(`Skipping file(${filename}) due to error: ${error.message}`)
      );
    }
  }

  const packageMatches: Set<string> = new Set<string>();

  requireMatches.forEach((requireMatch: string) => {
    const packageRegExpResult: RegExpExecArray | null =
      packageRegExp.exec(requireMatch);
    if (packageRegExpResult) {
      packageMatches.add(packageRegExpResult[1]);
    }
  });

  const detectedPackageNames: string[] = [];

  packageMatches.forEach((packageName: string) => {
    if (builtinPackageNames.indexOf(packageName) < 0) {
      detectedPackageNames.push(packageName);
    }
  });

  detectedPackageNames.sort();

  const declaredDependencies: Set<string> = new Set<string>();
  const declaredDevDependencies: Set<string> = new Set<string>();
  const missingDependencies: string[] = [];
  const unusedDependencies: string[] = [];
  const packageJsonContent: string = await fsp.readFile(
    packageJsonFilename,
    "utf8"
  );
  try {
    const manifest: {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    } = JSON.parse(packageJsonContent);
    if (manifest.dependencies) {
      for (const depName of Object.keys(manifest.dependencies)) {
        declaredDependencies.add(depName);
      }
    }
    if (manifest.devDependencies) {
      for (const depName of Object.keys(manifest.devDependencies)) {
        declaredDevDependencies.add(depName);
      }
    }
  } catch (e) {
    console.error(`JSON.parse ${packageJsonFilename} error`);
  }

  for (const detectedPkgName of detectedPackageNames) {
    /**
     * Missing(phantom) dependencies are
     * - used in source code
     * - not decalred in dependencies and devDependencies in package.json
     */
    if (
      !declaredDependencies.has(detectedPkgName) &&
      !declaredDevDependencies.has(detectedPkgName)
    ) {
      missingDependencies.push(detectedPkgName);
    }
  }
  for (const declaredPkgName of Array.from(declaredDependencies)) {
    /**
     * Unused dependencies case 1:
     * - declared in dependencies in package.json (devDependencies not included)
     * - not used in source code
     */
    if (
      !detectedPackageNames.includes(declaredPkgName) &&
      !implicitPackageNames.includes(declaredPkgName) &&
      !declaredPkgName.startsWith("@types/")
    ) {
      unusedDependencies.push(declaredPkgName);
    }
  }

  const allTypesDependencies: string[] = Array.from(declaredDependencies)
    .concat(Array.from(declaredDevDependencies))
    .filter((pkgName) => pkgName.startsWith("@types/"));
  for (const typesDependencyName of allTypesDependencies) {
    /**
     * Unused dependencies case 2:
     * - dependencies starts with @types/ in package.json (devDependencies included)
     * - not Type definitions for non-npm package
     * - corresponding package is unused
     */
    let typesPackageJsonPath: string | null = null;
    try {
      typesPackageJsonPath = require.resolve(
        `${typesDependencyName}/package.json`,
        {
          paths: [cwd],
        }
      );
    } catch (e) {
      // no-catch
    }
    if (!typesPackageJsonPath) {
      log(colors.gray(`${typesDependencyName} is not installed`));
      continue;
    }
    if (!fs.existsSync(typesPackageJsonPath)) {
      log(colors.gray(`package.json does not exist: ${typesPackageJsonPath}`));
      continue;
    }
    const typesPackageDir: string = path.dirname(typesPackageJsonPath);
    try {
      const { types, typings }: { types?: string; typings?: string } =
        JSON.parse(fs.readFileSync(typesPackageJsonPath, "utf8"));
      let typesIndexPath: string = path.resolve(typesPackageDir, "index.d.ts");
      for (const t of [types, typings]) {
        if (t) {
          let resolvedTypes: string = t;
          if (!t.endsWith(".d.ts")) {
            resolvedTypes = t + ".d.ts";
          }
          const typesPath: string = path.resolve(
            typesPackageDir,
            resolvedTypes
          );
          if (fs.existsSync(typesPath)) {
            typesIndexPath = typesPath;
            break;
          }
        }
      }
      const typesIndex: string = fs.readFileSync(typesIndexPath, "utf8");
      const typesHeader: Header = parseHeaderOrFail(typesIndex);
      if (typesHeader.nonNpm) {
        // skip nonNpm types, i.e. @types/node
        log(
          colors.gray(`${typesDependencyName} is non-npm package definition`)
        );
        continue;
      }

      const mangledPackageName: string = typesDependencyName.slice(
        "@types/".length
      );
      const unmangledPackageName: string =
        unmangleScopedPackage(mangledPackageName) || mangledPackageName;

      if (
        !detectedPackageNames.includes(unmangledPackageName) &&
        !implicitPackageNames.includes(unmangledPackageName)
      ) {
        unusedDependencies.push(typesDependencyName);
      }
    } catch (e) {
      log(colors.gray(`scan ${typesDependencyName} failed: ${e.message}`));
      continue;
    }
  }

  const output: ScanDepsResult = {
    detectedDependencies: detectedPackageNames,
    missingDependencies: missingDependencies,
    unusedDependencies: unusedDependencies,
  };
  return output;
}

export { scanDeps };
