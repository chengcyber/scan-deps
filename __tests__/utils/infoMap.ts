import * as path from 'path';
import type { DependencyNameInfoMap, LocationInfo } from "../../src";

export function resolveDependencyNameInfoMap(dependencyNameInfoMap: DependencyNameInfoMap, prefix: string): DependencyNameInfoMap {
  const result: DependencyNameInfoMap = {};
  Object.entries(dependencyNameInfoMap).forEach(([k, v]) => {
    result[k] = v.map(x => resolveLocationInfo(x, prefix));
  });
  return result;
}

export function resolveLocationInfo(locationInfo: LocationInfo, prefix: string): LocationInfo {
  return {
    ...locationInfo,
    filePath: path.relative(prefix, locationInfo.filePath),
  }
}
