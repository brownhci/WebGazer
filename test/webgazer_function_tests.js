const puppeteer = require('puppeteer');
const { expect, assert } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');
const common = require('./common');

it('top level, non-video no arguments webgazer functions should work', async() =>{
		await common.page.setDefaultNavigationTimeout(60000);
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
					
					//stopVideo:JSON.stringify(await webgazer.stopVideo()),
					detectCompatibility:JSON.stringify(await webgazer.detectCompatibility()),
					clearGazeListener:JSON.stringify(await webgazer.clearGazeListener()),
					getRegression:JSON.stringify(await webgazer.getRegression()),
					//getEventTypes:JSON.stringify(await webgazer.getEventTypes()), -needs params
					//getVideoElementCanvas:JSON.stringify(await webgazer.getVideoElementCanvas()),
					//getVideoPreviewToCameraResolutionRatio:JSON.stringify(await webgazer.getVideoPreviewToCameraResolutionRatio()),
					getStoredPoints:JSON.stringify(await webgazer.getStoredPoints()),
					pause:JSON.stringify(await webgazer.pause())
				}
		})
		//can use to ensure prediction is accurately displayed on page, just need to do some math
		//and get variables from page
		debugger
		let wgGP_location = await common.page.evaluate(async() => {
			return {left:document.getElementById('wgGP').style.left,
					top:document.getElementById('wgGP').style.top}
				})
		for(const [k,v] of Object.entries(basic_functions)){ 
  			assert.notEqual(Object.keys(v),null)
  			assert.notEqual(Object.keys(v),null)
  			}

		assert.equal(basic_functions.isReady,"true")
		assert.equal(basic_functions.detectCompatibility,"true")
	}) 