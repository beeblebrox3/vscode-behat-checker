#!/bin/bash

cd ../server
rm -Rf node_modules
yarn install
cd ../
cp server client/server -R
cd client