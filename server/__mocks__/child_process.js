"use strict";

const child_process = jest.genMockFromModule("child_process");
const real_child_process = require.requireActual("child_process");

let steps = "";
child_process.__setMockSteps = (output) => {
  steps = output;
}

child_process.execSync = (cmd, options) => {
  if (new RegExp("behat", "i").exec(cmd)) {
    return steps;
  }

  return real_child_process.execSync.apply(null, args);
}

module.exports = child_process;
