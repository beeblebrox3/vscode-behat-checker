#!/bin/bash

cd ../server
rm -Rf node_modules
yarn install
cd ../
cp server client/server -R
cd client
rm server/__tests__ server/__mocks__ server/coverage-report server/.idea server/server -Rf