import {
  createConnection,
  TextDocuments,
  TextDocument,
  Diagnostic,
  TextDocumentChangeEvent,
  Disposable,
  Location,
  Range,
  Position
} from 'vscode-languageserver';

import { BehatStepsParser } from './BehatStepsParser';
import { FeatureLinter } from './FeatureLinter';
import { llog, ServerSettings, updateSettings } from './util';
import strim from 'super-trim';

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
      textDocumentSync: documents.syncKind,
      definitionProvider: BehatStepsParserInstance.behatCanProvideGoToDefinition(),
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

connection.onDefinition(target => {
  if (!target) return null;
  const document = documents.get(target.textDocument.uri);

  if (!document) return null;

  let context = strim(document.getText().split("\n")[target.position.line]);
  context = strim(context.split(' ').splice(1).join(' '));

  const contextFound = FeatureLinterInstance.getContext(context);
  if (!contextFound) return null;
  if (!contextFound.context.lines) return null;

  return Location.create(
    `file://${contextFound.context.filePath}`,
    Range.create(
      Position.create(contextFound.context.lines.start, 0),
      Position.create(contextFound.context.lines.end, Number.MAX_SAFE_INTEGER)
    )
  );
});

function validate(document: TextDocument) {
  const supportedLanguages = ['feature', 'gherkin'];
  if (supportedLanguages.indexOf(document.languageId) === -1) {
    return;
  }

  const invalidLines = FeatureLinterInstance.lint(document.getText());
  llog(`invalid lines: ${invalidLines.join(',')}`, 'debug');

  const diagnostics: Diagnostic[] = invalidLines.map(line => ({
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
  }));

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
  documents.onDidSave((change) => {
    if (change.document.languageId === 'php') {
      BehatStepsParserInstance.updateStepsCache();
      llog('PHP file saved, cache updated', 'info');

      documents.all().forEach((document) => {
        llog(`Validating document ${document.uri}`);
        validate(document);
      });
    }
  });
}

connection.listen();
