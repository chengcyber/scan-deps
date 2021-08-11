# scan-deps

util to detect undeclared deps and phantom deps

# Usage

1. CLI

```
npx scan-deps --help
```

```
Usage: scan-deps [options]

Options:
  -V, --version  output the version number
  --json         output as json
  --debug        turn on debug log
  --all          output all dependencies includes detected
                 dependencies
  --directory    directory included, default: src,lib
  --extension    included file extensions, default:
                 ts,js,tsx,jsx
  -h, --help     display help for command
```

2. Node API

```js
import { ScanDeps } from "scan-deps";

async function main() {
  const { detectedDependencies, missingDependencies, unusedDependencies } =
    await ScanDeps({
      cwd: process.cwd(),
    });
}
```

# Development

```
yarn install
yarn build:watch
```

# LICENSE

MIT @([chengcyber](https://github.com/chengcyber))
