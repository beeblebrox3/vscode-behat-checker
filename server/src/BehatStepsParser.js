const execSync = require('child_process').execSync;
const DS = "/";
const trim = require("super-trim");
const winston = require("winston");

class BehatStepsParser {
    constructor(projectDirectory, configFile = "behat.yml") {
        this.steps = [];
        this.updateConfig(projectDirectory, configFile);
        this.updateStepsCache();
    }

    updateConfig(projectDirectory, configFile) {
        this.projectDirectory = projectDirectory + DS;
        this.configFile = this.projectDirectory + configFile;
        this.behatCMD = `php ${this.projectDirectory}vendor${DS}bin${DS}behat`;
    }

    getCmdListSteps() {
        return `${this.behatCMD} -c ${this.configFile} -di ${this.projectDirectory}`;
    }

    updateStepsCache() {
        let out = execSync(this.getCmdListSteps()).toString();
        this.steps = this.parseSteps(out);
    }

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
        regex = regex.replace(/\?\<([a-zA-Z0-9]+)\>/g, "");

        try {
            new RegExp(regex);
            return regex;
        } catch (e) {
            winston.error(`Invalid regex. Input: ${step} | Output: ${regex}`);
            throw new Error("Invalid regex");
        }
    }
}

module.exports = BehatStepsParser;
