client/node_modules:
	$(info installing client deps)
	cd client && npm install

server/node_modules:
	$(info installing server deps)
	cd server && npm install

node_modules:
	$(info instaling shared deps)
	npm install

install-deps: client/node_modules server/node_modules node_modules

clear-deps:
	rm -Rf client/node_modules server/node_modules node_modules

clear: clear-deps
	rm -Rf dist

dev: install-deps
	npm run dev

test: install-deps
	cd server && npm run test

test-coverage: install-deps
	cd server && npm run test-coverage

test-watch: install-deps
	cd server && npm run test-watch

package: install-deps
	vsce package
