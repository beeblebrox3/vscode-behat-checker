const execSync = require('child_process').execSync;
const exec = require("child_process").exec;
const DS = "/";
const trim = require("trim");

class BehatStepsParser {
    constructor(projectDirectory, configFile = "behat.yml") {
        this.steps = [];
        this.projectDirectory = projectDirectory + DS;
        this.behatCMD = `php ${this.projectDirectory}vendor${DS}bin${DS}behat`;
        this.configFile = this.projectDirectory + configFile;
        this.updateStepsCache();
    }

    updateStepsCache() {
        let out = execSync(`${this.behatCMD} -c ${this.configFile} -di ${this.projectDirectory}`).toString();
        this.parseSteps(out);
    }

    parseSteps(rawSteps) {
        let stepsLines = rawSteps.split("\n\n");
        this.steps = stepsLines.reduce(function (steps, step) {
            if (!trim(step).length) {
                return steps;
            }
            let lines = step.split("\n");

            let regexSuiteStep = /([a-zA-Z0-9-_]+)\s+\|\s+\[(.+)\] (.+)/;
            let matches = regexSuiteStep.exec(lines[0]);
            if (!matches || matches.length !== 4) {
                console.log("error : " + step);
                return steps;
            }
            let suite = trim(matches[1]);
            let regex = {
                keyword: trim(matches[2]),
                step: trim(matches[3])
            };

            let regexContextFinder = /at \`([a-zA-Z-_\\]+)::([a-zA-Z-_]+)\(\)/;
            let lastLine = lines[lines.length - 1];
            matches = regexContextFinder.exec(lastLine);
            let context = {
                className: matches[1],
                methodName: matches[2]
            };

            steps.push({
                suite: suite,
                regex: regex,
                context: context,
            });
            return steps;
        }, []);
    }

    check(stepText, stepArgs, stepKeyword) {
        let stepsCount = this.steps.length;
        for (let i = 0; i < stepsCount; i++) {
            let stepRegex = this.steps[i].regex.step;
            if (stepRegex[0] === "/") {
                stepRegex = stepRegex.substr(1, stepRegex.length - 2)
            }
            let argFormat = '"([^"]*)"';
            stepRegex = stepRegex.replace(/:arg(\d+)/g, argFormat);
            stepRegex = new RegExp(stepRegex);
            if (stepRegex.exec(stepText)) {
                return true;
            }
        }
        return false;
    }
}

module.exports = BehatStepsParser;
