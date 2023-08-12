// Example: "my-package/lad/dee/dah" --> "my-package"
// Example: "@ms/my-package" --> "@ms/my-package"
// Example: "lodash.get" -> "lodash.get"
const packageRegExp: RegExp = /^((@[a-z\-0-9!_]+\/)?[a-z\-0-9!_][a-z\-0-9!_.]*)\/?/;

export function getPackageNameFromSpecifier(specifier: string): string | null {
  const packageRegExpResult: RegExpExecArray | null =
    packageRegExp.exec(specifier);
  if (packageRegExpResult) {
    return packageRegExpResult[1];
  }
  return null;
}
