const fs = require("fs");
const path = require("path");
const yaml = require('js-yaml');
const dot = require("dot-prop");
const childProcess = require('child_process');
const exec = childProcess.exec;
const execSync = childProcess.execSync;

class ContextsLocator {
    /**
     * Creates an instance of ContextsLocator.
     *
     * @param {String} projectDirectory
     * @param {String} configFile
     */
    constructor(projectDirectory, configFile) {
        this.updateConfig(projectDirectory, configFile);
        // console.log(this.filesMap);
    }

    updateConfig(projectDirectory, configFile) {
        this.projectDirectory = projectDirectory;
        this.configFile = configFile;
        this.behatConfig = this._getBehatConfig();
    }

    updateMap() {
        this.filesMap = this._findAllContexts();
    }

    /**
     *
     * @param {String} contextName
     * @param {string} [suite="default"]
     * @param {string} [profile="default"]
     * @returns
     *
     * @memberOf ContextsLocator
     */
    getPathByContext(contextName, suite = "default", profile = "default") {
        const cpath = [profile, suite, contextName].join(".");
        return dot.get(this.filesMap, cpath, false);
    }

    /**
     * @param {String} contextName
     * @param {String} methodName
     * @param {string} [suite="default"]
     * @param {string} [profile="default"]
     *
     * @memberOf ContextsLocator
     */
    getFileAndLineNumberByContext(contextName, methodName, suite = "default", profile = "default") {
        const fileName = this.getPathByContext(contextName);
        if (!fileName) {
            return false;
        }

        const lines = this.getLinesOfMethod(fileName, contextName, methodName);
        return {
            file: fileName,
            startLine: lines.start,
            endLine: lines.end
        };
    }

    /**
     * @returns {Object}
     *
     * @memberOf ContextsLocator
     */
    _getBehatConfig() {
        const configFilePath = path.resolve(this.projectDirectory, this.configFile);
        if (!this._fileExists(configFilePath)) {
            throw "Config file not found.";
        }

        const behatConfigContent = fs.readFileSync(configFilePath)
            .toString()
            .replace(/%paths.base%/gi, this.projectDirectory);

        return yaml.safeLoad(behatConfigContent);
    }

    _findAllContexts() {
        let map = {};
        const defaultPath = path.resolve(this.projectDirectory, "app/features/bootstrap");

        Object.keys(this.behatConfig).map(profileName => {
            map[profileName] = {};

            let profile = this.behatConfig[profileName];
            let profilePaths = profile.autoload || [];

            if (typeof profilePaths === "string") {
                profilePaths = [profilePaths];
            }

            Object.keys(profile.suites).map(suiteName => {
                const suite = profile.suites[suiteName];
                map[profileName][suiteName] = {};

                let suitePaths = suite.paths || [];
                if (typeof suitePaths === "string") {
                    suitePaths = [suitePaths];
                }

                suite.contexts.map(context => {
                    const contextPath = this._locateContext(context, suitePaths.concat(profilePaths));
                    if (contextPath) {
                        map[profileName][suiteName][context] = contextPath;
                    }
                });
            });
        });

        return map;
    }

    /**
     *
     * @param {String} contextName
     * @param {String[]} paths
     */
    _locateContext(contextName, paths) {
        let contextPath = false;

        paths.some(basedir => {
            if (this._fileExists(basedir, contextName + ".php")) {
                contextPath = path.resolve(basedir, contextName + ".php");
                return true;
            }
        });

        if (!contextPath) {
            contextPath = this._findWithComposer(contextName);
        }

        return contextPath;
    }

    _findWithComposer(contextName) {
        const cmd = [
            `require "${path.resolve(this.projectDirectory, "vendor/autoload.php")}";`,
            `$r = new ReflectionClass("${contextName}");`,
            'echo $r->getFileName();'
        ].join("\n");

        try {
            return execSync(`php -r '${cmd}'`).toString();
        } catch (e) {
            return false;
        }
    }

    _fileExists() {
        return fs.existsSync(path.resolve(...arguments));
    }

    /**
     * @param {any} fileName
     * @param {any} className
     * @param {any} methodName
     * @returns
     *
     * @memberOf ContextsLocator
     */
    getLinesOfMethod(fileName, className, methodName) {
        const cmd = [
            `require "${path.resolve(this.projectDirectory, "vendor/autoload.php")}";`,
            `require "${fileName}";`,
            `$r = new ReflectionClass("${className}");`,
            `$start = $r->getMethod("${methodName}")->getStartLine();`,
            `$end = $r->getMethod("${methodName}")->getEndLine();`,
            `echo json_encode(["start" => $start, "end" => $end]);`
        ].join("\n");

        try {
            return JSON.parse(execSync(`php -r '${cmd}'`).toString());
        } catch (e) {
            return false;
        }
    }
}

module.exports = ContextsLocator;