import vscode, { ExtensionContext } from 'vscode';

import { TransportKind, LanguageClient } from 'vscode-languageclient';
import { join } from 'path';

const extensionUserConfig = vscode.workspace.getConfiguration('behatChecker');
const debug = extensionUserConfig.get('debug', false);

// show notification if debug is enabled
const notify = (str: string) => !debug || vscode.window.showInformationMessage(str);

exports.activate = (context: ExtensionContext) => {
  notify('Behat Checker Activated');

  const serverModule = context.asAbsolutePath(
    join('dist', 'server.js')
  );

  const debugOptions = {
    execArgv: ['--nolazy', '--inspect=6009']
  };
  const serverOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions = {
    documentSelector: ['feature', 'php'],
    synchronize: {
      configurationSection: 'behatChecker',
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    },
    initializationOptions: {
      configFile: extensionUserConfig.get('configFile'),
      trigger: extensionUserConfig.get('trigger'),
      debug: extensionUserConfig.get('debug'),
      behatPath: extensionUserConfig.get('behatPath'),
    }
  };

  let client: LanguageClient;
  try {
    client = new LanguageClient('Behat Checker', serverOptions, clientOptions);
  } catch (e) {
    vscode.window.showErrorMessage('Failed to create client');
    console.log(e);
    return;
  }

  const updateCacheDisponsable = vscode.commands.registerCommand('behatChecker.updateCache', () => {
    notify('requesting steps cache update');
    client.sendRequest('behatChecker.updateCache')
      .then(() => {
        vscode.window.showInformationMessage('Steps cache updated!');
      });
  });

  const reloadDisponsable = vscode.commands.registerCommand('behatChecker.reload', async () => {
    try {
      await client.sendRequest('behatChecker.reload', {});
      notify('Reloaded!');
    } catch (e) {
      notify(`Failed!\n ${e.message}`);
      console.log(e);
    }
  });

  context.subscriptions.push(client.start());
  context.subscriptions.push(updateCacheDisponsable);
  context.subscriptions.push(reloadDisponsable);
};

exports.deactivate = () => {
};
