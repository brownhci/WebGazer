#!/bin/sh
cd www/data/src
python3 webgazerExtractServer.py > /dev/null &
cd ../..
browser-sync start --server --no-open > /dev/null &
cd ..
echo "starting tests..."
npx mocha test --recursive --no-timeouts
echo "finishing tests, killing servers..."

kill $(lsof -t -i:3000)
kill $(lsof -t -i:8000) 