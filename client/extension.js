let vscode = require("vscode");
let vscodelangclient = require("vscode-languageclient");
const path = require("path");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    vscode.window.showInformationMessage("extension activated :)");

	let serverModule = context.asAbsolutePath(path.join('../server', 'index.js'));

    let debugOptions = { execArgv: ["--nolazy", "--debug=6199"] };
    let serverOptions = {
		run : { module: serverModule, transport: vscodelangclient.TransportKind.ipc },
		debug: { module: serverModule, transport: vscodelangclient.TransportKind.ipc, options: debugOptions }
	}

    // Options to control the language client
	let clientOptions = {
		// Register the server for plain text documents
		documentSelector: ["feature"],
		synchronize: {
			configurationSection: "behatCheckerServer",
			// Synchronize the setting section 'languageServerExample' to the server
			// configurationSection: 'languageServerExample',
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	}


	// Create the language client and start the client.
	let disposable = new vscodelangclient.LanguageClient("Behat Checker", serverOptions, clientOptions);
	disposable.start();

    // Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;