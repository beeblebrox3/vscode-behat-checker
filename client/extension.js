"use strict";

const vscode = require("vscode");
const vscodelangclient = require("vscode-languageclient");
const path = require("path");

let extensionUserConfig = vscode.workspace.getConfiguration("behatChecker");
let debug = extensionUserConfig.get("debug", false);

// show notification if debug is enabled
const notify = str => !debug || vscode.window.showInformationMessage(str);

exports.activate = context => {
    !debug || vscode.window.showInformationMessage("Behat Checker Activated");

    const serverModule = context.asAbsolutePath(path.join('server', 'index.js'));
    const debugOptions = { execArgv: ["--nolazy", "--debug=6199"] };
    const serverOptions = {
        run : { module: serverModule, transport: vscodelangclient.TransportKind.ipc },
        debug: { module: serverModule, transport: vscodelangclient.TransportKind.ipc, options: debugOptions }
    }

    const clientOptions = {
        documentSelector: ["feature"],
        synchronize: {
            configurationSection: "behatChecker",
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        },
        initializationOptions: {
            configFile: extensionUserConfig.get("configFile"),
            trigger: extensionUserConfig.get("trigger"),
            debug: extensionUserConfig.get("debug")
        }
    }

    let client = new vscodelangclient.LanguageClient("Behat Checker", serverOptions, clientOptions);
    let updateCacheDisponsable = vscode.commands.registerCommand("behatChecker.updateCache", () => {
        notify("requesting steps cache update");
        client.sendRequest({method: "behatChecker.updateCache"}).then(() => {
            vscode.window.showInformationMessage("Steps cache updated!");
        });
    });

    let validateDisponsable = vscode.commands.registerCommand("behatChecker.validate", () => {
        // @todo how to check if the current file is an feature file?
        if (!vscode.window.activeTextEditor) {
            vscode.window.showWarningMessage("Open an feature file to use this command.");
            return;
        }
        notify("requesting validation");
        client.sendRequest({method: "behatChecker.validate"}, {}).then(() => {
            notify("Validated")
        });
    });

    let reloadDisponsable = vscode.commands.registerCommand("behatChecker.reload", () => {
        client.sendRequest({method: "behatChecker.reload"}, {}).then(() =>{
            notify("Reloaded!");
        });
    });

    client.start();

    context.subscriptions.push(client);
    context.subscriptions.push(updateCacheDisponsable);
    context.subscriptions.push(validateDisponsable);
} 

exports.deactivate = () => {
}
