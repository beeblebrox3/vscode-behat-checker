const fs = require("fs");
jest.mock("child_process");

let test_steps = fs.readFileSync(__dirname + "/test_steps.txt").toString();
require("child_process").__setMockSteps(test_steps);

const BehatStepsParser = require("../src/BehatStepsParser");
const project_path = "/project";
const config_file = "behat.yml";
let instance = new BehatStepsParser(project_path, config_file);

jest.dontMock("child_process");
const FeatureLinter = require("../src/FeatureLinter");
let linter = new FeatureLinter(instance);

const equals = (actual, expected) => expect(actual).toBe(expected);

test("check rules", () => {
  let validSteps = [
    `I do something simple`,
    `I do something simple on other suite`,
    `I do something simple with an argument 1`,
    `I do something simple with an argument "argument"`,
    `I do something simple with an named argument 1`,
    `I do something simple with an named argument "arguent 1"`,
    `I do something simple with two arguments 1 2`,
    `I do something simple with two named arguments 1 2`,
    `I do something with regex 122222`,
    `I do something with regex 1`,
    `I do something with regex and two args "1" "and two"`,
    `I do something with optional argument`,
    `I do something with argument`,
    `I do something with opt argument`,
    `I do something with different options`,
    `I do something with different choices`,
    `I do something with an ugly argument "this is an argument"`,
  ];
  validSteps.map(step => equals(linter.validateStep(step), true));

  let invalidSteps = [
    `I do something simple plus something`,
    `I do something simple on other suite plus something`,
    `I do something simple with an argument`,
    `I don't do something simple with an named argument "arg xpto"`,
    `I do something with regex invalid`,
    `I do something with regex and two args "one" "two" "three"`,
    `I do something with optional  argument`,
    `I don't do something with different choices`,
    `I do something with an ugly argument`,
  ];
  invalidSteps.map(step => equals(linter.validateStep(step), false));
});

test("lint feature", () => {
  let invalidLines = linter.lint(fs.readFileSync(__dirname + "/example.feature").toString());
  let shouldBeInvalidLines = [21, 22, 23, 24, 25, 26, 27, 28, 29];
  shouldBeInvalidLines.map(line => {
    if (invalidLines.indexOf(line) === -1) {
      throw new Error(`Line ${line} should be invalid!`);
    }
  });
});
