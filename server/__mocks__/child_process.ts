const child_process = jest.genMockFromModule('child_process');
const real_child_process = jest.requireActual('child_process');

let steps = '';
// @ts-ignore
child_process.__setMockSteps = (output: Array) => {
  steps = output;
};

// @ts-ignore
child_process.execSync = (cmd: string, options: object) => {
  if (new RegExp('behat', 'i').exec(cmd)) {
    return steps;
  }

  return real_child_process.execSync.apply(null, [cmd, options]);
};

module.exports = child_process;
