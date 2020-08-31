if exist www\data\src\P_01\dot.y4m (
	echo "Creating %CD%y4m file for video input"
	ffmpeg -hide_banner -loglevel panic -i www\data\src\P_01\1491423217564_2_-study-dot_test_instructions.webm -pix_fmt yuv420p dot.y4m
	sed -i.bak 0,\C420mpeg2\s\\C420\ dot.y4m
	mv dot.y4m www\data\src\P_01\
	DEL  dot.y4m.bak
)
if not (netstat --ano | findstr ':8000') (
	cd www\data\src
	python3 webgazerExtractServer.py
	cd %CD%.\%CD%.\%CD%.
)
if not (netstat --ano | findstr ':3000') (
	cd www\
	browser-sync start --server --no-open
	cd %CD%.
)
echo "starting tests..."
npx mocha test --recursive --no-timeouts
echo "finishing tests, killing servers..."
npx kill-port 8000
npx kill-port 3000
