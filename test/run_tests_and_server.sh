#!/bin/sh
if ! netstat -ltnp | grep :8000 ; then
	cd www/data/src
	python3 webgazerExtractServer.py > /dev/null &
	cd ../../..
fi
if ! netstat -ltnp | grep :3000 ; then
	cd www/
	browser-sync start --server --no-open > /dev/null &
	cd ..
fi
echo "starting tests..."
npx mocha test --recursive --no-timeouts
echo "finishing tests, killing servers..."

kill $(lsof -t -i:3000)
kill $(lsof -t -i:8000) 