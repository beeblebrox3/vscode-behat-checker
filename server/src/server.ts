import {
  createConnection,
  TextDocuments,
  TextDocument,
  Diagnostic,
  ProposedFeatures,
  TextDocumentChangeEvent,
  Disposable
} from 'vscode-languageserver';

import { BehatStepsParser } from './BehatStepsParser';
import { FeatureLinter } from './FeatureLinter';
import { llog, ServerSettings, updateSettings } from './util';

const connection = createConnection();

const documents = new TextDocuments();
documents.listen(connection);

let workspaceRoot: string = '';
let BehatStepsParserInstance: BehatStepsParser;
let FeatureLinterInstance: FeatureLinter;

const defaultSettings: ServerSettings = {
  trigger: 'onChange',
  configFile: 'behat.yml',
  debug: false,
  behatPath: 'vendor/bin/behat',
};

let settings: ServerSettings;

let listenerDisposable: Disposable;

connection.onInitialize(params => {
  llog('connection initialize', 'debug');

  workspaceRoot = params.rootPath as string;
  settings = updateSettings(defaultSettings, params.initializationOptions);

  llog(`workspaceRoot: ${workspaceRoot}`, 'debug');
  llog(`settings: ${JSON.stringify(settings)}`, 'debug');

  BehatStepsParserInstance = new BehatStepsParser(
    workspaceRoot, settings.configFile, settings.behatPath
  );
  FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);

  llog(`Detected behat path: ${BehatStepsParserInstance.getBehatPath()}`, 'debug');
  llog(`Parsed steps: ${JSON.stringify(BehatStepsParserInstance.getSteps())}`, 'debug');

  configureListener();

  return {
    capabilities: {
      textDocumentSync: documents.syncKind
    }
  };
});

connection.onRequest('behatChecker.updateCache', () => {
  BehatStepsParserInstance.updateStepsCache();
  connection.sendNotification('behatChecker.cacheUpdated', {});

  llog(`Parsed steps: ${JSON.stringify(BehatStepsParserInstance.getSteps())}`, 'debug');
});

connection.onRequest('behatChecker.reload', () => {
  BehatStepsParserInstance = new BehatStepsParser(workspaceRoot, settings.configFile, settings.behatPath);
  FeatureLinterInstance = new FeatureLinter(BehatStepsParserInstance);
  llog(`Parsed steps: ${JSON.stringify(BehatStepsParserInstance.getSteps())}`, 'log');
});

connection.onDidChangeConfiguration((param) => {
  llog('configuration did changed', 'debug');
  settings = updateSettings(defaultSettings, param.settings.behatChecker);
  BehatStepsParserInstance.updateConfig(workspaceRoot, settings.configFile, settings.behatPath);
  BehatStepsParserInstance.updateStepsCache();
  configureListener();
  configureAutoUpdateListener();
});

function validate(document: TextDocument) {
  const supportedLanguages = ['feature', 'gherkin'];
  if (supportedLanguages.indexOf(document.languageId) === -1) {
    return;
  }

  const invalidLines = FeatureLinterInstance.lint(document.getText());
  llog(`invalid lines: ${invalidLines.join(',')}`, 'debug');

  const diagnostics: Diagnostic[] = invalidLines.map(function (line) {
    return {
      severity: 1,
      range: {
        start: {
          line: line - 1,
          character: 1
        },
        end: {
          line: line - 1,
          character: Number.MAX_VALUE
        }
      },
      message: `This step is undefined (line ${line})`,
    };
  });

  connection.sendDiagnostics({
    uri: document.uri,
    diagnostics,
  });
}

function configureListener() {
  if (listenerDisposable && listenerDisposable.dispose) {
    listenerDisposable.dispose();
  }

  const fn = (change: TextDocumentChangeEvent) => validate(change.document);

  const eventName = settings.trigger === 'onChange' ? 'onDidChangeContent' : 'onDidSave';
  listenerDisposable = documents[eventName](fn);

  llog(`listening event ${eventName}`, 'debug');
}

function configureAutoUpdateListener() {
  const disposable = documents.onDidSave((change) => {
    if (change.document.languageId === 'php') {
      BehatStepsParserInstance.updateStepsCache();
      llog('PHP file saved, cache updated', 'info');

      documents.all().map((document) => {
        llog(`Validating document ${document.uri}`);
        validate(document);
      });
    }
  });
}

connection.listen();
