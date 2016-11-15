const BehatStepsParser = require("./src/BehatStepsParser");
const FeatureLinter = require("./src/FeatureLinter");
const VSCodeLangServer = require("vscode-languageserver");
const exec = require("child_process").exec;

exec(`notify-send "start"`);

let connection = VSCodeLangServer.createConnection(
    new VSCodeLangServer.IPCMessageReader(process),
    new VSCodeLangServer.IPCMessageWriter(process)
);

let documents = new VSCodeLangServer.TextDocuments();
documents.listen(connection);

let workspaceRoot;
let BehatStepsParserInstance;
let FeatureLinterInstance;
connection.onInitialize(function (params) {
    workspaceRoot = params.rootPath;
    BehatStepsParserInstance = new BehatStepsParser(workspaceRoot);
    FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);

    return {
        capabilities: {
            textDocumentSync: documents.syncKind
        }
    }
});

// documents.onDidSave((change) => {
documents.onDidChangeContent((change) => {
    // exec(`notify-send "content changed"`);
    let invalidLines = FeatureLinterInstance.lint(change.document.getText());
    let diagnostics = invalidLines.map(function (line) {
        return {
            severity: 1,
            range: {
                start: { line: line - 1, character: 1},
                end: { line: line - 1, character: Number.MAX_VALUE }
            },
            message: `This step is undefined (line ${line})`,
            // source: 'ex'
        }
    });

    // exec(`notify-send "invalid: ${invalidLines.join(',')}"`);
    // exec(`notify-send "invalid file: ${change.document.uri}"`);

    connection.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: diagnostics
    });
});

connection.listen();
// exec(`notify-send "connection listening"`);