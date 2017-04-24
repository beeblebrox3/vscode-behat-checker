const gherkin = require("gherkin");
const parser = new gherkin.Parser();

/**
 * Class responsible for check feature files or single steps
 *
 * @class FeatureLinter
 */
class FeatureLinter {
    /**
     * @param {BehatStepsParser} stepsParser
     */
    constructor(stepsParser) {
        this.stepsParser = stepsParser;
    }

    /**
     * Checks entire feature for undefined steps
     *
     * @param {string} feature the content of the feature file
     * @returns {Array} array with the number of the invalid lines
     *
     * @memberOf FeatureLinter
     */
    lint(feature) {
        let invalidSteps = [];
        try {
            let ast = parser.parse(feature);

            ast.feature.children.map((scenario) => {
                scenario.steps.map((step) => {
                    if (!this.validateStep(step.text)) {
                        invalidSteps.push(step.location.line);
                    }
                })
            });

            return invalidSteps;
        } catch (e) {
            return [];
        }
    }

    /**
     * Validade an step
     *
     * @param {String} step
     * @returns {Boolean}
     *
     * @memberOf FeatureLinter
     */
    validateStep(step) {
        return this.getContext(step) !== false;
    }

    /**
     *
     *
     * @param {String} step
     * @returns
     *
     * @memberOf FeatureLinter
     */
    getContext(step) {
        const steps = this.stepsParser.steps;
        let stepsCount = steps.length;

        for (let i = 0; i < stepsCount; i++) {
            let stepRegex = new RegExp(steps[i].regex.step);
            if (stepRegex.exec(step)) {
                return steps[i];
            }
        }

        return false;
    }
}

module.exports = FeatureLinter;
