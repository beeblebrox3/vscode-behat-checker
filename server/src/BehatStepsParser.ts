/// <reference path="typings.d.ts"/>

import { execSync } from 'child_process';
import { resolve, isAbsolute } from 'path';

import trim from 'super-trim';

/**
 * Class responsible for interact with behat CLI and parse the output to detect
 * all available steps
 */
export class BehatStepsParser {
  private steps: ParsedStep[] = [];
  private projectDirectory: string = '';
  private behatPath: string = '';
  private configFile: string = '';
  private behatCMD: string = '';

  constructor(projectDirectory: string, configFile = 'behat.yml', behatPath = 'vendor/bin/behat') {
    this.updateConfig(projectDirectory, configFile, behatPath);
    this.updateStepsCache();
  }

  /**
   * Updates the directory of the project and the config file
   */
  public updateConfig(projectDirectory: string, configFile: string, behatPath = 'vendor/bin/behat'): void {
    this.projectDirectory = resolve(projectDirectory);
    this.configFile = this.treatAssetPath(this.projectDirectory, configFile);
    this.behatPath = this.treatAssetPath(this.projectDirectory, behatPath);
    this.behatCMD = this.getBehatCMD();
  }

  public getSteps(): ParsedStep[] {
    return [...this.steps];
  }

  /**
   * Get behat cli command
   */
  public getBehatCMD(): string {
    return `php ${this.getBehatPath()}`;
  }

  public getConfigFile(): string {
    return this.configFile;
  }

  public getBehatPath(): string {
    if (this.behatPath) {
      return this.behatPath;
    }

    const composerBinDir = this.getComposerBinDir();
    return resolve(this.projectDirectory, composerBinDir, 'behat');
  }

  /**
   * Get the composer bin directory
   */
  public getComposerBinDir() {
    const composerConfigPath = resolve(this.projectDirectory, 'composer.json');
    const defaultPath = 'vendor/bin';

    try {
      const composerConfig = require(composerConfigPath);
      if (composerConfig.config && composerConfig.config['bin-dir']) {
        return composerConfig.config['bin-dir'] || defaultPath;
      }

      return defaultPath;
    } catch (ex) {
      return defaultPath;
    }
  }

  /**
   * Interacts with behat and update the cache of defined steps
   */
  public updateStepsCache() {
    const out = execSync(this.getCmdListSteps()).toString();
    this.steps = this.parseSteps(out);
  }

  /**
   * Returns the command to get steps from behat
   */
  public getCmdListSteps(): string {
    return `${this.behatCMD} -c ${this.configFile} -di --verbose ${this.projectDirectory}`;
  }

  /**
   * Turns the step phrase into an valid regexp
   */
  public makeStepRegex(step: string): string {
    const regexTest = /^\/(.+)\/$/;
    const argFormat = '"?([^"]*)"?';
    let regex = '';

    // if step is regex, remove the slashes
    if (regexTest.test(step)) {
      regex = trim(step, '/');
    } else {
      regex = `^${step}$`;
    }

    // transform args type ":arg1" in valid regex expressions
    regex = regex.replace(/:([a-zA-Z+]+)(\d+)/g, argFormat);

    // remove argument name from regex
    regex = regex.replace(/\?P?\<([a-zA-Z0-9]+)\>/g, '');

    try {
      // tslint:disable-next-line:no-unused-expression
      new RegExp(regex);
      return regex;
    } catch (e) {
      const errorMessage = `Invalid regex. Input: ${step} | Output: ${regex}`;
      throw new Error(errorMessage);
    }
  }

  /**
   * Extract the class and method where the step is implemented
   * (last line from step)
   */
  public extractContext(str: string[]): Context {
    let resp: Partial<Context> = {};

    str.forEach(row => {
      const extractedClass = this.tryToGetContextClassAndMethodFromStepLine(row);
      const extractedFile = this.tryToGetContextFileAndLineFromStepLine(row);

      resp = {
        ...resp,
        ...(extractedClass || {}),
        ...(extractedFile || {}),
      };
    });

    if (!resp.className) {
      throw new Error(`Invalid context format: ${str}`);
    }

    return resp as Context;
  }

  /**
   * Extract the suite's name and the regex of the step from the string (first line).
   */
  public extractSuiteAndRegex(str: string): SuiteFromStep {
    const regexSuiteStep = /([a-zA-Z0-9-_]+)\s+\|\s+\[(.+)\] (.+)/;
    const matches = regexSuiteStep.exec(str);

    if (!matches || matches.length !== 4) {
      throw new Error('Invalid format');
    }

    return {
      suite: trim(matches[1]),
      regex: {
        keyword: trim(matches[2]),
        originalStep: trim(matches[3]),
        step: this.makeStepRegex(matches[3])
      }
    };
  }

  /**
   * Receive one step from the output of behat -di return this step parsed
   */
  public parseStep(step: string): ParsedStep {
    if (!trim(step)) {
      throw new Error('Empty step');
    }

    const lines: string[] = step.split('\n');

    const suiteAndRegex = this.extractSuiteAndRegex(lines[0]);
    const context = this.extractContext(lines);

    return {
      suite: suiteAndRegex.suite,
      regex: suiteAndRegex.regex,
      context
    };
  }

  /**
   * Receive the output of the behat -di command and returns all parsed steps
   */
  public parseSteps(rawSteps: string): ParsedStep[] {
    return rawSteps.split('\n\n').reduce((steps, step) => {
      try {
        const parsedStep = this.parseStep(step);
        steps.push(parsedStep);
        return steps;
      } catch (e) {
        // @todo log this
        return steps;
      }
    }, [] as ParsedStep[]);
  }

  public treatAssetPath(projectDir: string, assetPath: string) {
    return isAbsolute(assetPath) ? resolve(assetPath) : resolve(projectDir, assetPath);
  }

  private tryToGetContextClassAndMethodFromStepLine(lineContent: string): Partial<Context> | null {
    const regexp = /at \`([a-zA-ZÀ-úÀ-ÿ-_\\]+)::([a-zA-ZÀ-úÀ-ÿ-_]+)\(\)/;
    const matches = regexp.exec(lineContent);
    if (!matches || matches.length < 3) {
      // if the method name has accents may don't match
      // throw new Error(`Invalid context format: ${lineContent}`);
      return null;
    }

    return { className: matches[1], methodName: matches[2] };
  }

  private tryToGetContextFileAndLineFromStepLine(lineContent: string): Partial<Context> | null {
    const regexp = /on \`([a-zA-ZÀ-úÀ-ÿ-_\\\/\.\d]+)\[(\d+)\:(\d+)\]/;
    const matches = regexp.exec(lineContent);
    if (!matches || matches.length < 4) {
      // if the method name has accents may don't match
      // throw new Error(`Invalid context format: ${lineContent}`);
      return null;
    }

    return {
      filePath: matches[1],
      lines: {
        start: +matches[2],
        end: +matches[3],
      }
    };
  }
}

interface ParsedStep {
  suite: string;
  regex: RegexFromStep;
  context: Context;
}

interface Context {
  className: string;
  methodName: string;
  filePath?: string;
  lines?: {
    start: number;
    end: number;
  };
}

interface SuiteFromStep {
  suite: string;
  regex: RegexFromStep;
}

interface RegexFromStep {
  keyword: string;
  originalStep: string;
  step: string;
}
