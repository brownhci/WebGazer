const puppeteer = require('puppeteer');
const { assert } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');

before(async () => {
	const parent_dir = __dirname.substring(0,__dirname.length-4)
	let my_y4m_video = parent_dir + 'www/data/src/P_01/dot.y4m'
	browser = await puppeteer.launch({args:['--use-file-for-fake-video-capture='+my_y4m_video,
	'--allow-file-access', '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
	'--no-sandbox','--disable-setuid-sandbox',
	]
	//,devtools:true //enable for debugging
	});
	page = await browser.newPage();
	await page.goto('http://localhost:3000/calibration.html?');
	page.coverage.startJSCoverage();
	await page.goto('http://localhost:3000/calibration.html?');
	await page.waitFor(1500)
	await page.waitForSelector('#start_calibration')
	//calibration button is not immediately clickable due to css transition
	await page.waitFor(2500)

	await page.evaluate(async() => {
		document.querySelector("#start_calibration").click()
	})
	await page.waitFor(1500)
	await page.evaluate(async() =>{
		document.querySelector("body > div.swal-overlay.swal-overlay--show-modal > div > div.swal-footer > div > button").click()
	})
})
describe('webgazer function', async() => {
	after(async () => {
		const jsCoverage = await page.coverage.stopJSCoverage();
		let usedBytes = 0;
		let webgazer_coverage;
		jsCoverage.forEach(item => {if (item.url == "http://localhost:3000/webgazer.js")
			{webgazer_coverage = item}
		})
		webgazer_coverage.ranges.forEach(range => (usedBytes += range.end - range.start - 1));
		console.log((100*usedBytes/webgazer_coverage.text.length).toFixed(4), "% Code Coverage on webgazer.js")
		await browser.close();
	})	
	describe('top level functions', async() =>{
		it('should be able to recognize video input', async() =>{
			const videoAvailable = await page.evaluate(async() => {
				return await webgazer.params.showFaceFeedbackBox;
			});
			const isReady = await page.evaluate(async() => {
				return await webgazer.isReady()
			});
			assert.equal(videoAvailable,true);
			assert.equal(isReady,true);
		});
		//modifying visibility params
		it('webgazerVideoFeed should display', async() => {
			let video_display = await page.evaluate(async() => {
				return document.getElementById('webgazerVideoFeed').style.display
			})
			assert.notEqual(video_display,"none");
		})
		it('webgazerFaceFeedbackBox should display', async() => {
			await page.waitForSelector('#webgazerFaceFeedbackBox')
			let face_overlay = await page.evaluate(async() => {
				return document.getElementById('webgazerFaceFeedbackBox').style.display
			})
			assert.notEqual(face_overlay,"none");
		})
		it('webgazerGazeDot should display', async() => {
			let webgazer_gazedot = await page.evaluate(async() => {
				return document.getElementById('webgazerGazeDot').style.display
			})
			assert.notEqual(webgazer_gazedot,"none");
		})
		it('faceoverlay should hide when showFaceOverlay is false', async() => {
			face_overlay = await page.evaluate(async() => {
				await webgazer.showFaceFeedbackBox(false)
				return document.getElementById('webgazerFaceFeedbackBox').style.display
			})
			assert.equal(face_overlay,"none");
		})
		it('webgazerGazeDot should hide when showPredictionPoints is false', async() =>{
			let webgazer_gazedot = await page.evaluate(async() => {
				await webgazer.showPredictionPoints(false)
				return document.getElementById('webgazerGazeDot').style.display
			})
			assert.equal(webgazer_gazedot,"none");
		})
		it('webgazerVideoFeed should hide when showVideo is false', async() => {
			video_display = await page.evaluate(async() => {			
				await webgazer.showVideo(false)
				return document.getElementById('webgazerVideoFeed').style.display
			});
			assert.equal(video_display,"none");
		})
		it('getVideoElementCanvas should exist and be a canvas element', async() => {
			let video_element_canvas_type = await page.evaluate(async() => {
				return await webgazer.getVideoElementCanvas().nodeName
			})
			assert.equal(video_element_canvas_type,'CANVAS')
		})
		it('preview to camera resolution ratio should be [0.5,0.5]', async() =>{
			let preview_to_camera_resolution_ratio = await page.evaluate(async() => {
				return await webgazer.getVideoPreviewToCameraResolutionRatio()
			})
			assert.equal(preview_to_camera_resolution_ratio[0],0.5)
			assert.equal(preview_to_camera_resolution_ratio[1],0.5)
		})
		it('should be able to change video viewer size', async()=>{
			const video_dimensions = await page.evaluate(async()=>{
				return [webgazer.params.videoViewerWidth,webgazer.params.videoViewerHeight]
			})
			const new_dimensions = [video_dimensions[0],video_dimensions[1]]
			const new_video_dimensions = await page.evaluate(async(new_dimensions)=>{
				await webgazer.setVideoViewerSize(new_dimensions[0],new_dimensions[1])
				return [webgazer.params.videoViewerWidth,webgazer.params.videoViewerHeight] 
			},new_dimensions)
			assert.equal(new_video_dimensions[0],new_dimensions[0])
			assert.equal(new_video_dimensions[1],new_dimensions[1])
		})
		it('top level, non-video no arguments webgazer functions should work', async() =>{
			let basic_functions = await page.evaluate(async() => {		
				return {getCurrentPrediction: JSON.stringify(await webgazer.getCurrentPrediction()),
						addMouseEventListeners: JSON.stringify(await webgazer.addMouseEventListeners()),
						getStoredPoints:JSON.stringify(await webgazer.getStoredPoints()),
						removeMouseEventListeners:JSON.stringify(await webgazer.removeMouseEventListeners()),
						isReady:JSON.stringify(await webgazer.isReady()),
						detectCompatibility:JSON.stringify(await webgazer.detectCompatibility()),
						clearGazeListener:JSON.stringify(await webgazer.clearGazeListener()),
						getRegression:JSON.stringify(await webgazer.getRegression()),
						getStoredPoints:JSON.stringify(await webgazer.getStoredPoints()),
						pause:JSON.stringify(await webgazer.pause())
					}
				})


			for(const [k,v] of Object.entries(basic_functions)){ 
					assert.notEqual(Object.keys(v),null)
					assert.notEqual(Object.keys(v),{})
					}

			assert.equal(basic_functions.isReady,"true")
			assert.equal(basic_functions.detectCompatibility,"true")
		})
		it('can record screen position, set tracker and regression and set static video', async() =>{
			const screen_functions = page.evaluate(async() => {
				return {setStaticVideo: await webgazer.setStaticVideo('../www/data/src/P_02/1491487691210_2_-study-dot_test_instructions.webm'),
						setTracker: await webgazer.setTracker('TFFacemesh'), 
						setRegression: await webgazer.setRegression('ridge')}
			})
			for(const [k,v] of Object.entries(screen_functions)){ 
				assert.notEqual(Object.keys(v),null)
				assert.notEqual(Object.keys(v),{})
		  	}
		})
		//checkEyesInValidationBox exists in code but the comment above says it's wrong and it returns nothing
	})
	require('./regression_test')
	require('./util_test')

})