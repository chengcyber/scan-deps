module.exports = {
  globals: {
    "ts-jest": {
      tsconfig: "./tsconfig.json",
    },
  },
  transform: {
    "^.+.tsx?$": "ts-jest",
  },
  testEnvironment: "node",
  testRegex: "__tests__\\/.+\\.test.ts$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  coverageReporters: ["json", "json-summary", "lcov", "text", "clover"],
  collectCoverageFrom: ["src/*.ts"],
  verbose: false,
  testTimeout: 10000,
};
