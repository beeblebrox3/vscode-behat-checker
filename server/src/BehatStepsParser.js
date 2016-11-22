const execSync = require('child_process').execSync;
const DS = "/";
const trim = require("super-trim");


/**
 * Class responsible for intereact with behat CLI and parse the output to detect
 * all available steps
 *
 * @class BehatStepsParser
 */
class BehatStepsParser {
    constructor(projectDirectory, configFile = "behat.yml") {
        this.steps = [];
        this.updateConfig(projectDirectory, configFile);
        this.updateStepsCache();
    }

    /**
     * Updates the directory of the project and the config file
     *
     * @param {String} projectDirectory
     * @param {String} configFile
     *
     * @memberOf BehatStepsParser
     */
    updateConfig(projectDirectory, configFile) {
        this.projectDirectory = projectDirectory + DS;
        this.configFile = this.projectDirectory + configFile;
        this.behatCMD = `php ${this.projectDirectory}vendor${DS}bin${DS}behat`;
    }

    /**
     * Returns the command to get steps from behat
     *
     * @returns {String}
     *
     * @memberOf BehatStepsParser
     */
    getCmdListSteps() {
        return `${this.behatCMD} -c ${this.configFile} -di ${this.projectDirectory}`;
    }

    /**
     * Interacts with behat and update the cache of defined steps
     *
     * @memberOf BehatStepsParser
     */
    updateStepsCache() {
        let out = execSync(this.getCmdListSteps()).toString();
        this.steps = this.parseSteps(out);
    }

    /**
     * Receive the output of the behat -di command and returns all parsed steps
     *
     * @param {String} rawSteps
     * @returns {Object[]}
     *
     * @memberOf BehatStepsParser
     */
    parseSteps(rawSteps) {
        let stepsBlocks = rawSteps.split("\n\n");
        return stepsBlocks.reduce((steps, step) => {
            try {
                let parsedStep = this.parseStep(step);
                steps.push(parsedStep);
                return steps;
            } catch (e) {
                // @todo log this
                return steps;
            }
        }, []);
    }

    /**
     * Receive one step from the output of behat -di return this step parsed
     *
     * @param {String} step
     * @returns {Object}
     *
     * @memberOf BehatStepsParser
     */
    parseStep(step) {
        if (!trim(step)) {
            throw new Error("Empty step");
        }

        let lines = step.split("\n");

        let suiteAndRegex = this.extractSuiteAndRegex(lines[0]);
        let context = this.extractContext(lines.pop());

        return {
            suite: suiteAndRegex.suite,
            regex: suiteAndRegex.regex,
            context: context
        };
    }

    /**
     * Extract the suite's name and the regex of the step from the string (first line).
     *
     * @param {String} str
     * @returns {Object}
     *
     * @memberOf BehatStepsParser
     */
    extractSuiteAndRegex(str) {
        let regexSuiteStep = /([a-zA-Z0-9-_]+)\s+\|\s+\[(.+)\] (.+)/;
        let matches = regexSuiteStep.exec(str);

        if (!matches || matches.length !== 4) {
            throw new Error("Invalid format");
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
     * Extract the class and method where the step is implemented
     * (last line from step)
     *
     * @param {String} str
     * @returns {Object}
     *
     * @memberOf BehatStepsParser
     */
    extractContext(str) {
        let regexContextFinder = /at \`([a-zA-ZÀ-úÀ-ÿ-_\\]+)::([a-zA-ZÀ-úÀ-ÿ-_]+)\(\)/;
        let matches = regexContextFinder.exec(str);
        if (!matches || matches.length < 3) {
            // if the method name has accents may don't match
            throw new Error(`Invalid context format: ${str}`);
        }

        return {
            className: matches[1],
            methodName: matches[2]
        };
    }

    /**
     * Turns the step phrase into an valid regexp
     *
     * @param {any} step
     * @returns
     *
     * @memberOf BehatStepsParser
     */
    makeStepRegex(step) {
        const regexTest = /^\/(.+)\/$/;
        const argFormat = '"?([^"]*)"?';
        let regex = "";

        // if step is regex, remove the slashes
        if (regexTest.test(step)) {
            regex = trim(step, "/");
        } else {
            regex = `^${step}$`;
        }

        // transform args type ":arg1" in valid regex expressions
        regex = regex.replace(/:([a-zA-Z+]+)(\d+)/g, argFormat);

        // remove argument name from regex
        regex = regex.replace(/\?P?\<([a-zA-Z0-9]+)\>/g, "");

        try {
            new RegExp(regex);
            return regex;
        } catch (e) {
            let errorMessage = `Invalid regex. Input: ${step} | Output: ${regex}`;
            throw new Error(errorMessage);
        }
    }
}

module.exports = BehatStepsParser;
