import fs from 'fs';
import { resolve } from 'path';
import { BehatStepsParser } from '../src/BehatStepsParser';
import { FeatureLinter } from '../src/FeatureLinter';

jest.mock('child_process');

const test_steps = fs.readFileSync(resolve(__dirname, 'test_steps.txt')).toString();
// tslint:disable-next-line:no-var-requires
require('child_process').__setMockSteps(test_steps);

const project_path = '/project';
const config_file = 'behat.yml';
const behat_path = 'vendor/bin/behat';

const instance = new BehatStepsParser(project_path, config_file, behat_path);

jest.dontMock('child_process');

const linter = new FeatureLinter(instance);

describe('Feature linter', () => {
  test('check rules', () => {
    const validSteps = [
      'I do something simple',
      'I do something simple on other suite',
      'I do something simple with an argument 1',
      'I do something simple with an argument "argument"',
      'I do something simple with an named argument 1',
      'I do something simple with an named argument "arguent 1"',
      'I do something simple with two arguments 1 2',
      'I do something simple with two named arguments 1 2',
      'I do something with regex 122222',
      'I do something with regex 1',
      'I do something with regex and two args "1" "and two"',
      'I do something with optional argument',
      'I do something with argument',
      'I do something with opt argument',
      'I do something with different options',
      'I do something with different choices',
      'I do something with an ugly argument "this is an argument"',
    ];
    validSteps.map(step => expect(linter.validateStep(step)).toBe(true));

    const invalidSteps = [
      'I do something simple plus something',
      'I do something simple on other suite plus something',
      'I do something simple with an argument',
      `I don't do something simple with an named argument "arg xpto"`,
      'I do something with regex invalid',
      'I do something with regex and two args "one" "two" "three"',
      'I do something with optional  argument',
      "I don't do something with different choices",
      'I do something with an ugly argument',
    ];
    invalidSteps.map(step => expect(linter.validateStep(step)).toBe(false));
  });

  test('lint feature', () => {
    const invalidLines = linter.lint(fs.readFileSync(__dirname + '/example.feature').toString());
    const shouldBeInvalidLines = [21, 22, 23, 24, 25, 26, 27, 28, 29];
    shouldBeInvalidLines.map(line => {
      if (invalidLines.indexOf(line) === -1) {
        throw new Error(`Line ${line} should be invalid!`);
      }
    });
  });
});
