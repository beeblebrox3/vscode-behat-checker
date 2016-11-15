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
        console.log(`linting feature ${ast.feature.name}`);

        ast.feature.children.map(function (scenario, indexScenario) {
            console.log(`linting scenario ${scenario.name}`);

            scenario.steps.map(function (step, indexStep) {
                console.log(`linting step ${step.text}`);

                if (!self.stepsParser.check(step.text, step.argument, step.keyword)) {
                    console.log(`invalid step ${step.text}`);
                    invalidSteps.push(step.location.line);
                } else {
                    console.log(`valid step ${step.text}`);
                }
            });
        });
        // console.log(ast);
        console.log(invalidSteps);

        return invalidSteps;
    }
}

module.exports = FeatureLinter;
