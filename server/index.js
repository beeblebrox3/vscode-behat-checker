const BehatStepsParser = require("./src/BehatStepsParser");
const FeatureLinter = require("./src/FeatureLinter");
const VSCodeLangServer = require("vscode-languageserver");
const exec = require("child_process").exec;

const notify = function (str) {
    exec(`notify-send "${str}"`);
}

notify("start");

let connection = VSCodeLangServer.createConnection(
    new VSCodeLangServer.IPCMessageReader(process),
    new VSCodeLangServer.IPCMessageWriter(process)
);

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
    workspaceRoot = params.rootPath;
    settings.trigger = params.initializationOptions.trigger || settings.trigger;
    settings.configFile = params.initializationOptions.configFile || settings.configFile;

    BehatStepsParserInstance = new BehatStepsParser(workspaceRoot, settings.configFile);
    FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);


    const method = settings.trigger === "onChange" ? "onDidChangeContent" : "onDidSave";
    documents[method]((change) => {
        let invalidLines = FeatureLinterInstance.lint(change.document.getText());
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

connection.onRequest("behatChecker.updateCache", function () {
    notify("requested update cache");
    connection.sendNotification("behatChecker.cacheUpdated", {});
});

connection.listen();