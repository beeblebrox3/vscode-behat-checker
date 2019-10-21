export function llog(message: string, type = 'info') {
  console.log(`[${type}] ${message}`);
}

export function updateSettings(defaultSettings: ServerSettings, newSettings: ServerSettings) {
  return {
    trigger: newSettings.trigger || defaultSettings.trigger,
    configFile: newSettings.configFile || defaultSettings.configFile,
    debug: newSettings.debug || defaultSettings.debug,
    behatPath: newSettings.behatPath || defaultSettings.behatPath,
  };
}

export function asArray<T>(arg: T | T[]): T[] {
  if (Array.isArray(arg)) return arg;
  return [arg];
}

export interface ServerSettings {
  trigger: string;
  configFile: string;
  debug: boolean;
  behatPath: string;
}
