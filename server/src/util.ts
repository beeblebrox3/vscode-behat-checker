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

export interface ServerSettings {
  trigger: string;
  configFile: string;
  debug: boolean;
  behatPath: string;
}
