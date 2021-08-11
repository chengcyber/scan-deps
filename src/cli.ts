#!/usr/bin/env node

const { version } = require("../package.json");

import { Command } from "commander";
import { scanDeps } from ".";
import type { ScanDepsConfig } from ".";
import colors from "colors/safe";

const program = new Command();

program
  .name("scan-deps")
  .version(version)
  .option("--json", "output as json")
  .option("--debug", "turn on debug log")
  .option("--all", "output all dependencies includes detected dependencies")
  .option("--directory", "directory included, default: src,lib")
  .option("--extension", "included file extensions, default: ts,js,tsx,jsx")
  .action(async (opts) => {
    const { json, debug, directory, extension, all } = opts;
    const config: ScanDepsConfig = {};
    if (debug && !json) {
      config.isDebug = true;
    }
    if (directory) {
      config.directory = directory;
    }
    if (extension) {
      config.extension = extension;
    }
    try {
      const output = await scanDeps(config);
      if (json) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        const {
          missingDependencies,
          unusedDependencies,
          detectedDependencies,
        } = output;

        // detected deps
        if (all) {
          if (detectedDependencies.length !== 0) {
            console.log(colors.yellow("Detected dependencies"));
            console.log(" - these seem to be imported by this project:");
            for (const packageName of detectedDependencies) {
              console.log("  " + packageName);
            }
          } else {
            console.log(
              "This project does not seem to import any NPM packages."
            );
          }
          console.log();
        }

        let wroteAnything: boolean = false;

        if (missingDependencies.length > 0) {
          console.log(colors.yellow("Possible phantom dependencies"));
          console.log(
            " - these seem to be imported but aren't listed in package.json:"
          );
          for (const packageName of missingDependencies) {
            console.log("  " + packageName);
          }
          wroteAnything = true;
        }

        if (unusedDependencies.length > 0) {
          if (wroteAnything) {
            console.log();
          }
          console.log(colors.yellow("Possible unused dependencies"));
          console.log(
            " - these are listed in package.json but don't seem to be imported:"
          );
          for (const packageName of unusedDependencies) {
            console.log("  " + packageName);
          }
          wroteAnything = true;
        }

        if (!wroteAnything) {
          console.log(colors.green("Everything looks good."));
          console.log("  No missing or unused dependencies were found.");
        }
      }
    } catch (e) {
      console.log(colors.red(e.message));
      process.exit(1);
    }
  });

main();

async function main() {
  await program.parseAsync(process.argv);
}
