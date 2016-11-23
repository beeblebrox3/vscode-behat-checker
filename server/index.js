const BehatStepsParser = require("./src/BehatStepsParser");
const FeatureLinter = require("./src/FeatureLinter");
const VSCodeLangServer = require("vscode-languageserver");
const path = require("path");

let connection = VSCodeLangServer.createConnection(
    new VSCodeLangServer.IPCMessageReader(process),
    new VSCodeLangServer.IPCMessageWriter(process)
);

// @todo make it external
const llog = (str, type = "info") => connection.console.log(`[${type}] ${str}`);

let documents = new VSCodeLangServer.TextDocuments();
documents.listen(connection);

let workspaceRoot;
let BehatStepsParserInstance;
let FeatureLinterInstance;
let settings = {
    trigger: "onChange",
    configFile: "behat.yml",
    debug: false
};

let listenerDisposable;
connection.onInitialize(function (params) {
    llog("connection initialize", "debug");

    workspaceRoot = params.rootPath;
    settings.trigger = params.initializationOptions.trigger || settings.trigger;
    settings.configFile = params.initializationOptions.configFile || settings.configFile;

    llog(`workspaceRoot: ${workspaceRoot}`, "debug");
    llog(`seggints: ${JSON.stringify(settings)}`, "debug");

    BehatStepsParserInstance = new BehatStepsParser(workspaceRoot, settings.configFile);
    FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);

    llog(`Parsed steps: ${JSON.stringify(BehatStepsParserInstance.steps)}`, "log");

    configureListener();

    return {
        capabilities: {
            textDocumentSync: documents.syncKind
        }
    }
});

connection.onRequest({method: "behatChecker.updateCache"}, function () {
    BehatStepsParserInstance.updateStepsCache();
    connection.sendNotification({method: "behatChecker.cacheUpdated"}, {});
    llog(`Parsed steps: ${JSON.stringify(BehatStepsParserInstance.steps)}`, "log");
});

connection.onRequest({method: "behatChecker.reload"}, function () {
    BehatStepsParserInstance = new BehatStepsParser(workspaceRoot, settings.configFile);
    FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);
    llog(`Parsed steps: ${JSON.stringify(BehatStepsParserInstance.steps)}`, "log");
});

connection.onDidChangeConfiguration((param) => {
    llog("configuration did changed", "debug");
    settings.configFile = param.settings.behatChecker.configFile || settings.configFile;
    settings.trigger = param.settings.behatChecker.trigger || settings.trigger;
    settings.debug = param.settings.behatChecker.debug || settings.debug;
    BehatStepsParserInstance.updateConfig(workspaceRoot, settings.configFile);
    BehatStepsParserInstance.updateStepsCache();
    configureListener();
    configureAutoUpdateListener();
});

function validate(document) {
    let invalidLines = FeatureLinterInstance.lint(document.getText());
    llog(`invalid lines: ${invalidLines.join(",")}`, "debug");

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
        uri: document.uri,
        diagnostics: diagnostics
    });
}

function configureListener() {
    if (listenerDisposable && listenerDisposable.dispose) {
        listenerDisposable.dispose();
    }

    let eventName = settings.trigger === "onChange" ? "onDidChangeContent" : "onDidSave";
    listenerDisposable = documents[eventName]((change) => validate(change.document));
    llog(`listen event ${eventName}`, "debug");
}

function configureAutoUpdateListener() {
    let disposable = documents.onDidSave((change) => {
        if (change.document.languageId === "php") {
            BehatStepsParserInstance.updateStepsCache();
            llog("PHP file saved, cache updated", "info");

            documents.all().map((document) => {
                llog(`Validating document ${document.uri}`);
                validate(document);
            });
        }
    });
}

connection.listen();