const vscode = require("vscode");
const vscodelangclient = require("vscode-languageclient");
const path = require("path");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    vscode.window.showInformationMessage("extension activated :)");

    const serverModule = context.asAbsolutePath(path.join('../server', 'index.js'));
    const debugOptions = { execArgv: ["--nolazy", "--debug=6199"] };
    const serverOptions = {
        run : { module: serverModule, transport: vscodelangclient.TransportKind.ipc },
        debug: { module: serverModule, transport: vscodelangclient.TransportKind.ipc, options: debugOptions }
    }

    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: ["feature"],
        synchronize: {
            configurationSection: "behatCheckerServer",
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        },
        initializationOptions: function () {
            let configuration = vscode.workspace.getConfiguration('behatChecker');
            return {
                configFile: configuration ? configuration.get('configFile', undefined) : undefined,
                trigger: configuration ? configuration.get('trigger', undefined) : undefined,
            };
        }()
    }

    // Create the language client and start the client.
    let client = new vscodelangclient.LanguageClient("Behat Checker", serverOptions, clientOptions);

    vscode.commands.registerCommand("behatChecker.updateCache", function () {
        client.sendRequest({method: "behatChecker.updateCache"}).then(function () {
            vscode.window.showInformationMessage("Steps cache updated!");
        });
    });

    client.start();

    // Push the disposable to the context's subscriptions so that the 
    // client can be deactivated on extension deactivation
    context.subscriptions.push(client);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;