const fs = require("fs");
const gherkin = require("gherkin");
const parser = new gherkin.Parser();

class FeatureLinter {
    /**
     *
     * @param {BehatStepsParser} stepsParser
     */
    constructor(stepsParser) {
        this.stepsParser = stepsParser;
    }

    lint(feature) {
        let invalidSteps = [];
        let ast = parser.parse(feature);

        ast.feature.children.map((scenario, indexScenario) => {
            scenario.steps.map((step, indexStep) => {
                if (!this.validateStep(step.text)) {
                    invalidSteps.push(step.location.line);
                }
            })
        });

        return invalidSteps;
    }

    validateStep(step) {
        const steps = this.stepsParser.steps;
        let stepsCount = steps.length;

        for (let i = 0; i < stepsCount; i++) {
            let stepRegex = new RegExp(steps[i].regex.step);
            if (stepRegex.exec(step)) {
                return true;
            }
        }
        return false;
    }
}

module.exports = FeatureLinter;
