"use strict";

const vscode = require("vscode");
const vscodelangclient = require("vscode-languageclient");
const path = require("path");

let extensionUserConfig = vscode.workspace.getConfiguration("behatChecker");
let debug = extensionUserConfig.get("debug", false);

// show notification if debug is enabled
const notify = str => !debug || vscode.window.showInformationMessage(str);

exports.activate = context => {
  notify("Behat Checker Activated");

  const serverModule = context.asAbsolutePath(
    path.join('server', 'index.js')
  );

  const debugOptions = {
    execArgv: ["--nolazy", "--inspect=6009"]
  };
  const serverOptions = {
    run: {
      module: serverModule,
      transport: vscodelangclient.TransportKind.ipc
    },
    debug: {
      module: serverModule,
      transport: vscodelangclient.TransportKind.ipc,
      options: debugOptions
    }
  }

  const clientOptions = {
    documentSelector: ["feature", "php"],
    synchronize: {
      configurationSection: "behatChecker",
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    },
    initializationOptions: {
      configFile: extensionUserConfig.get("configFile"),
      trigger: extensionUserConfig.get("trigger"),
      debug: extensionUserConfig.get("debug"),
      behatPath: extensionUserConfig.get("behatPath"),
    }
  }

  let client = null;
  try {
    client = new vscodelangclient.LanguageClient("Behat Checker", serverOptions, clientOptions);
  } catch (e) {
    vscode.window.showErrorMessage("Failed to create client");
    console.log(e);
    return
  }


  let updateCacheDisponsable = vscode.commands.registerCommand("behatChecker.updateCache", () => {
    notify("requesting steps cache update");
    client.sendRequest({
      method: "behatChecker.updateCache"
    }).then(() => {
      vscode.window.showInformationMessage("Steps cache updated!");
    });
  });

  let reloadDisponsable = vscode.commands.registerCommand("behatChecker.reload", async () => {
    try {
      await sendRequest({
        method: "behatChecker.reload"
      }, {});
      notify("Reloaded!");
    } catch (e) {
      notify(`Failed!\n ${e.message}`);
      console.log(e);
    }
  });

  client.start();

  context.subscriptions.push(client);
  context.subscriptions.push(updateCacheDisponsable);
  context.subscriptions.push(reloadDisponsable);
}

exports.deactivate = () => {}
