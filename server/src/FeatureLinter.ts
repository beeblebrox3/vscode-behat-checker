import Parser from 'gherkin/dist/src/Parser';
import { BehatStepsParser } from './BehatStepsParser';

const parser = new Parser();

/**
 * Class responsible for check feature files or single steps
 */
export class FeatureLinter {
  private stepsParser: BehatStepsParser;

  constructor(stepsParser: BehatStepsParser) {
    this.stepsParser = stepsParser;
  }

  /**
   * Checks entire feature for undefined steps
   *
   * @param feature the content of the feature file
   * @returns array with the number of the invalid lines
   */
  public lint(feature: string): number[] {
    const invalidSteps: number[] = [];
    try {
      const ast = parser.parse(feature) as ASTFeature;

      /* tslint:disable */
      ast.feature.children.forEach(scenario => {
        scenario.scenario.steps.forEach(step => {
          if (!this.validateStep(step.text)) {
            invalidSteps.push(step.location.line);
          }
        });
      });
      /* tslint:enable */

      return invalidSteps;
    } catch (e) {
      return [];
    }
  }

  /**
   * Validate an step
   */
  public validateStep(step: string): boolean {
    const steps = this.stepsParser.getSteps();
    const stepsCount = steps.length;

    for (let i = 0; i < stepsCount; i++) {
      const stepRegex = new RegExp(steps[i].regex.step);
      if (stepRegex.exec(step)) {
        return true;
      }
    }
    return false;
  }

  public getContext(step: string) {
    const steps = this.stepsParser.getSteps();
    const stepsCount = steps.length;

    for (let i = 0; i < stepsCount; i++) {
      const stepRegex = new RegExp(steps[i].regex.step);
      if (stepRegex.exec(step)) {
        return steps[i];
      }
    }

    return false;
  }
}

interface ASTFeature {
  feature: {
    children: ASTScenario[];
  };
}

interface ASTScenario {
  scenario: {
    steps: ASTStep[]
  };
}

interface ASTStep {
  text: string;
  location: {
    line: number;
  };
}
