const BehatStepsParser = require("./src/BehatStepsParser");
const FeatureLinter = require("./src/FeatureLinter");
const VSCodeLangServer = require("vscode-languageserver");
const exec = require("child_process").exec;
const winston = require("winston");
const fs = require("fs");
const logfile = __dirname + "/behatchecker.log";
winston.level = process.env.LOG_LEVEL;
winston.add(winston.transports.File, { filename: logfile });

let connection = VSCodeLangServer.createConnection(
    new VSCodeLangServer.IPCMessageReader(process),
    new VSCodeLangServer.IPCMessageWriter(process)
);
winston.log("debug", "connection created");

let documents = new VSCodeLangServer.TextDocuments();
documents.listen(connection);

let workspaceRoot;
let BehatStepsParserInstance;
let FeatureLinterInstance;
let settings = {
    trigger: "onChange",
    configFile: "behat.yml"
};
connection.onInitialize(function (params) {
    winston.log("debug", "connection initialize");

    workspaceRoot = params.rootPath;
    settings.trigger = params.initializationOptions.trigger || settings.trigger;
    settings.configFile = params.initializationOptions.configFile || settings.configFile;

    winston.log("debug", `workspaceRoot: ${workspaceRoot}`);
    winston.log("debug", "config", settings);

    BehatStepsParserInstance = new BehatStepsParser(workspaceRoot, settings.configFile);
    FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);

    winston.log("debug", "Parsed steps", BehatStepsParserInstance.steps);

    const method = settings.trigger === "onChange" ? "onDidChangeContent" : "onDidSave";
    winston.log("debug", "listen to method: " + method);
    documents[method]((change) => {
        let invalidLines = FeatureLinterInstance.lint(change.document.getText());
        winston.log("debug", "invalid lines", invalidLines);

        let diagnostics = invalidLines.map(function (line) {
            return {
                severity: 1,
                range: {
                    start: { line: line - 1, character: 1},
                    end: { line: line - 1, character: Number.MAX_VALUE }
                },
                message: `This step is undefined (line ${line})`,
            }
        });

        connection.sendDiagnostics({
            uri: change.document.uri,
            diagnostics: diagnostics
        });
    });

    return {
        capabilities: {
            textDocumentSync: documents.syncKind
        }
    }
});

connection.onRequest({method: "behatChecker.updateCache"}, function () {
    winston.log("debug", "requested update cache");
    BehatStepsParserInstance.updateStepsCache();
    connection.sendNotification({method: "behatChecker.cacheUpdated"}, {});
    winston.log("debug", "cache updated");
    winston.log("debug", "steps", BehatStepsParserInstance.steps);
});

connection.onRequest({method: "behatChecker.clearLogs"}, function () {
    fs.unlinkSync(logfile);
    connection.sendNotification({method: "behatChecker.logsClean"}, {});
});

connection.listen();