const fs = require("fs");
const gherkin = require("gherkin");
const parser = new gherkin.Parser();
const BehatStepsParser = require("./BehatStepsParser");

class FeatureLinter {
    /**
     *
     * @param {BehatStepsParser} stepsParser
     * @param feature
     */
    constructor(stepsParser) {
        this.stepsParser = stepsParser;
    }

    lint(feature) {
        let invalidSteps = [];
        let self = this;
        let ast = parser.parse(feature);

        ast.feature.children.map(function (scenario, indexScenario) {
            scenario.steps.map(function (step, indexStep) {
                if (!self.stepsParser.check(step.text, step.argument, step.keyword)) {
                    invalidSteps.push(step.location.line);
                }
            });
        });

        return invalidSteps;
    }
}

module.exports = FeatureLinter;
