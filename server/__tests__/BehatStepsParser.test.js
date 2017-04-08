const fs = require("fs");
jest.mock("child_process");

const BehatStepsParser = require("../src/BehatStepsParser");

const project_path = "/project";
const config_file = "behat.yml";

let instance = new BehatStepsParser(project_path, config_file);

const equals = (actual, expected) => expect(actual).toBe(expected);
const equalsObject = (actual, expect) => {
    Object.keys(expect).map(key => equals(actual[key], expect[key]));
}

describe("paths and config file", () => {
    test("should get correct behat command and config file", () => {
        equals(instance.behatCMD, `php ${project_path}/vendor/bin/behat`);
        equals(instance.configFile, `${project_path}/${config_file}`);
    });

    test("should update command and config file", () => {
        let project_path = "/my/new/path";
        let config_file = "config/custom_behat.yml";

        instance.updateConfig(project_path, config_file);
        equals(instance.behatCMD, `php ${project_path}/vendor/bin/behat`);
        equals(instance.configFile, `${project_path}/${config_file}`);
    });

    test("should get correct cmd", () => {
        instance.updateConfig("/app", "b.yml");
        equals(instance.getCmdListSteps(), "php /app/vendor/bin/behat -c /app/b.yml -di /app");
    });
});

describe("make regex", () => {
    test("should make steps regex", () => {
        let exampleData = [
            ["simple step", "^simple step$"],
            ["/simple step/", "simple step"],
            ["/^simple step/", "^simple step"],
            ["/simple step$/", "simple step$"],
            ["simple :arg1", '^simple "?([^"]*)"?$'],
            ["simple :arg1 :arg2", '^simple "?([^"]*)"? "?([^"]*)"?$'],
            ["simple :simple1", '^simple "?([^"]*)"?$'],
            ["/^simple (\d+)$/", "^simple (\d+)$"],
            ["/^simple (?:|optional )$/", "^simple (?:|optional )$"],
            ["/simple (?:|optional | opt )$/", "simple (?:|optional | opt )$"],
            ["/^simple (options|choices)/", "^simple (options|choices)"],
            ['/^simple "(?P<theuglyargument>.*)"$/', '^simple "(.*)"$'],
        ];

        exampleData.map(config => {
            equals(instance.makeStepRegex(config[0]), config[1]);
        });
    });

    test("shoud throw an error when the regex is invalid", () => {
        try {
            instance.makeStepRegex("/^simple (yopa$/");
            throw "This call should throw an error";
        } catch(e) {
            equals(true, true);
        }
    });
});

describe("extract context", () => {
    test("should extract the class and method", () => {
        equalsObject(instance.extractContext("   | at `Class::method()`"), {className: "Class", methodName: "method"});
    });

    test("should extract the class and method with namespace", () => {
        equalsObject(instance.extractContext("   | at `App\Class::method()`"), {className: "App\Class", methodName: "method"});
    });

    test("should extract the class and method with underline", () => {
        equalsObject(instance.extractContext("   | at `Class_xpto::method_foo()`"), {className: "Class_xpto", methodName: "method_foo"});
    });

    test("should extract class and method with accents", () => {
        equalsObject(instance.extractContext("   | at `Cláss::méthodã()`"), {className: "Cláss", methodName: "méthodã"});
    });
});

test("extract suite and regex", () => {
    let response = instance.extractSuiteAndRegex("default | [When|*] simple step");
    equals(response.suite, "default");
    equals(response.regex.keyword, "When|*");
    equals(response.regex.originalStep, "simple step");
    equals(response.regex.step, "^simple step$");
});

describe("parse step", () => {
    test("parse step", () => {
        let step = `suite | [When|*] step with arguments :arg1 :name1
                        | Example: When step with arguments 1 "two"
                        | at \`Class::method()\``;

        let response = instance.parseStep(step);
        equals(response.suite, "suite");
        equals(response.regex.keyword, "When|*");
        equals(response.regex.originalStep, "step with arguments :arg1 :name1");
        equals(response.regex.step, '^step with arguments "?([^"]*)"? "?([^"]*)"?$');
        equals(response.context.className, "Class");
        equals(response.context.methodName, "method");
    });

    test("shoud throw an error on invalid step", () => {
        try {
            instance.parseStep("invalid step");
            throw "This call should throw an error";
        } catch(e) {
            equals(true, true);
        }
    });

    test("shoud throw an error on empty step", () => {
        try {
            instance.parseStep("");
            throw "This call should throw an error";
        } catch(e) {
            equals(true, true);
        }
    });
});

test("update cache", () => {
    let test_steps = fs.readFileSync(__dirname + "/test_steps.txt").toString();
    require("child_process").__setMockSteps(test_steps);

    let instance = new BehatStepsParser(project_path, config_file);

    // the 9th is invalid
    equals(instance.steps.length, 12);

    // fix the problem
    test_steps = test_steps.replace(/\(yopa/, "");
    require("child_process").__setMockSteps(test_steps);
    instance.updateStepsCache();
    equals(instance.steps.length, 13);

    require("child_process").__setMockSteps("");
    instance.updateStepsCache();
    equals(instance.steps.length, 0);
});
