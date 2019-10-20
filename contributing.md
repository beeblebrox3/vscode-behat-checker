# Behat Checker


This is a vscode extension to work with [Behat](http://behat.org). It aims to allow people that doesn't use PHPStorm (or Intellij) to have a decent tool to write features ;)

## Development setup

### Requirements:
Will be helpful to have at least PHP installed on your machine and an example project. I use [this one](https://github.com/beeblebrox3/behat-example).


### Steps
For linux with Make available you just have to run `make dev`. It will install all dependencies and start webpack in watch mode. Open the project on vscode and press `F5` to debug it.
If you don't have or don't want to use make, you have to:

```bash
cd <project folder>
// install client deps
cd client && npm install

// install server deps
cd ../server && npm install

// install shared deps
cd ../ && npm install

// start webpack in development mode
npm run dev
```

### Package
You can run `make package` or `vsce package`.
