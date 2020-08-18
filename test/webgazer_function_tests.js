const puppeteer = require('puppeteer');
const { expect, assert } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');
const common = require('./common');


function startTimer() {
   const time = process.hrtime();
   return time;
 }

 function endTimer(time) {
   const diff = process.hrtime(time);
   const NS_PER_SEC = 1e9;
   const result = (diff[0] * NS_PER_SEC + diff[1]); // Result in Nanoseconds
   return elapsed = result * 0.001;
 }


it('top level, non-video no arguments webgazer functions should work', async() =>{
		await common.page.setDefaultNavigationTimeout(60000);
		let time = startTimer()
		let basic_functions = await common.page.evaluate(async() => {
			while (document.getElementById('wgGP').style.height == ""){
				await new Promise(r => setTimeout(r, 1000));
			}
			let pred = await webgazer.getCurrentPrediction()
			
			return {getCurrentPrediction: JSON.stringify(await webgazer.getCurrentPrediction()),
					getEyeFeats: JSON.stringify(await webgazer.util.getEyeFeats(pred.eyeFeatures)),
					addMouseEventListeners: JSON.stringify(await webgazer.addMouseEventListeners()),
					getStoredPoints:JSON.stringify(await webgazer.getStoredPoints()),
					removeMouseEventListeners:JSON.stringify(await webgazer.removeMouseEventListeners()),
					isReady:JSON.stringify(await webgazer.isReady()),
					
					detectCompatibility:JSON.stringify(await webgazer.detectCompatibility()),
					clearGazeListener:JSON.stringify(await webgazer.clearGazeListener()),
					getRegression:JSON.stringify(await webgazer.getRegression()),
					//getEventTypes:JSON.stringify(await webgazer.getEventTypes()), -needs params
					//
					getStoredPoints:JSON.stringify(await webgazer.getStoredPoints()),
					pause:JSON.stringify(await webgazer.pause())
				}
			})
		console.log("took ",endTimer(time)," nanoseconds")
		//can use to ensure prediction is accurately displayed on page, just need to do some math
		//and get variables from page
		debugger
		// let wgGP_location = await common.page.evaluate(async() => {
		// 	return {left:document.getElementById('wgGP').style.left,
		// 			top:document.getElementById('wgGP').style.top}
		// 		})
		for(const [k,v] of Object.entries(basic_functions)){ 
  			assert.notEqual(Object.keys(v),null)
  			assert.notEqual(Object.keys(v),{})
  			}

		assert.equal(basic_functions.isReady,"true")
		assert.equal(basic_functions.detectCompatibility,"true")
	})
it('can record screen position, set tracker and regression and set static video', async() =>{
	const screen_functions = common.page.evaluate(async() => {
		return {setStaticVideo: await webgazer.setStaticVideo('../www/data/src/P_02/1491487691210_2_-study-dot_test_instructions.webm'),
				recordScreenPosition: await webgazer.recordScreenPosition(100, 100), 
				recordScreenPositionAction: await webgazer.recordScreenPosition(100, 100, 'mouseclick'), 
				storePoints: await webgazer.storePoints(100, 100, 0), 
				setTracker: await webgazer.setTracker('TFFacemesh'), 
				setRegression: await webgazer.setRegression('ridge')}
	})
	for(const [k,v] of Object.entries(screen_functions)){ 
		assert.notEqual(Object.keys(v),null)
		assert.notEqual(Object.keys(v),{})
  	}
})



