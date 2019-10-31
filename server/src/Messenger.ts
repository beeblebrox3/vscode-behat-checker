import { RemoteWindow } from 'vscode-languageserver';

let window: RemoteWindow;

export function configure(newWindow: RemoteWindow) {
  window = newWindow;
}

export const BehatIsNotAvailable = (path: string) => window && window.showErrorMessage(`Behat was not found on the configured path (${path}).\nIf it is correct, check if behat is installed (try to run \`composer install\`).`);
