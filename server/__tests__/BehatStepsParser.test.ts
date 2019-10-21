import fs from 'fs';
jest.mock('child_process');

import { BehatStepsParser } from '../src/BehatStepsParser';

const project_path = '/project';
const config_file = 'behat.yml';
const behat_path = 'vendor/bin/behat';

const instance = new BehatStepsParser(project_path, config_file, behat_path);

describe('paths and config file', () => {
  test('should get correct behat command and config file', () => {
    expect(instance.getBehatCMD()).toBe(`php ${project_path}/${behat_path}`);
    expect(instance.getConfigFile()).toBe(`${project_path}/${config_file}`);
  });

  test('should update command and config file', () => {
    const project_path_alt = '/my/new/path';
    const config_file_alt = 'config/custom_behat.yml';
    const behat_path_alt = '/app/behat';

    instance.updateConfig(project_path_alt, config_file_alt, behat_path_alt);
    expect(instance.getBehatCMD()).toBe(`php ${behat_path_alt}`); // absolute path
    expect(instance.getConfigFile()).toBe(`${project_path_alt}/${config_file_alt}`);
  });

  test('should get correct cmd', () => {
    instance.updateConfig('/app', 'b.yml', 'vendor/bin/behat');
    expect(instance.getCmdListSteps()).toBe('php /app/vendor/bin/behat -c /app/b.yml -di /app');
  });
});

describe('make regex', () => {
  test('should make steps regex', () => {
    const exampleData = [
      ['simple step', '^simple step$'],
      ['/simple step/', 'simple step'],
      ['/^simple step/', '^simple step'],
      ['/simple step$/', 'simple step$'],
      ['simple :arg1', '^simple "?([^"]*)"?$'],
      ['simple :arg1 :arg2', '^simple "?([^"]*)"? "?([^"]*)"?$'],
      ['simple :simple1', '^simple "?([^"]*)"?$'],
      ['/^simple (\d+)$/', '^simple (\d+)$'],
      ['/^simple (?:|optional )$/', '^simple (?:|optional )$'],
      ['/simple (?:|optional | opt )$/', 'simple (?:|optional | opt )$'],
      ['/^simple (options|choices)/', '^simple (options|choices)'],
      ['/^simple "(?P<theuglyargument>.*)"$/', '^simple "(.*)"$'],
    ];

    exampleData.map(config => {
      expect(instance.makeStepRegex(config[0])).toBe(config[1]);
    });
  });
});

describe('extract context', () => {
  test('should extract the class and method', () => {
    expect(instance.extractContext('   | at `Class::method()`')).toMatchObject({
      className: 'Class',
      methodName: 'method'
    });
  });

  test('should extract the class and method with namespace', () => {
    expect(instance.extractContext('   | at `App\Class::method()`')).toMatchObject({
      className: 'App\Class',
      methodName: 'method'
    });
  });

  test('should extract the class and method with underline', () => {
    expect(instance.extractContext('   | at `Class_xpto::method_foo()`')).toMatchObject({
      className: 'Class_xpto',
      methodName: 'method_foo'
    });
  });

  test('should extract class and method with accents', () => {
    expect(instance.extractContext('   | at `Cláss::méthodã()`')).toMatchObject({
      className: 'Cláss',
      methodName: 'méthodã'
    });
  });
});

test('extract suite and regex', () => {
  const response = instance.extractSuiteAndRegex('default | [When|*] simple step');
  expect(response.suite).toBe('default');
  expect(response.regex.keyword).toBe('When|*');
  expect(response.regex.originalStep).toBe('simple step');
  expect(response.regex.step).toBe('^simple step$');
});

describe('parse step', () => {
  test('parse step', () => {
    const step = `suite | [When|*] step with arguments :arg1 :name1
                        | Example: When step with arguments 1 "two"
                        | at \`Class::method()\``;

    const response = instance.parseStep(step);
    expect(response.suite).toBe('suite');
    expect(response.regex.keyword).toBe('When|*');
    expect(response.regex.originalStep).toBe('step with arguments :arg1 :name1');
    expect(response.regex.step).toBe('^step with arguments "?([^"]*)"? "?([^"]*)"?$');
    expect(response.context.className).toBe('Class');
    expect(response.context.methodName).toBe('method');
  });
});

test('update cache', () => {
  let test_steps = fs.readFileSync(__dirname + '/test_steps.txt').toString();
  require('child_process').__setMockSteps(test_steps);

  const localInstance = new BehatStepsParser(project_path, config_file);

  // the 9th is invalid
  expect(localInstance.getSteps().length).toBe(12);

  // fix the problem
  test_steps = test_steps.replace(/\(yopa/, '');
  require('child_process').__setMockSteps(test_steps);
  localInstance.updateStepsCache();
  expect(localInstance.getSteps().length).toBe(13);

  require('child_process').__setMockSteps('');
  localInstance.updateStepsCache();
  expect(localInstance.getSteps().length).toBe(0);
});
