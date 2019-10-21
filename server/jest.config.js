module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverageFrom: [
    "src/*.ts"
  ],
  coverageDirectory: "coverage-report",
  notify: true
};
