const puppeteer = require('puppeteer');
const { expect, assert } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');

describe('Page Basics', async () => {
	let browser,page,doc;
	before(async () => {
		//convert .webm to mp4 https://cloudconvert.com/webm-to-mp4
		//convert mp4 to y4m with:
		//ffmpeg -i 1491487691210_2_-study-dot_test_instructions.webm -pix_fmt yuv420p dot.y4m
		//sed -i '0,/C420mpeg2/s//C420/' *.y4m (make accessible to chrome)
		//give absolute path!
		let my_y4m_video = '/home/robin/workspace/WebGazer/www/data/src/P_02/dot.y4m'
		browser = await puppeteer.launch({args:['--use-file-for-fake-video-capture='+my_y4m_video,
		'--allow-file-access', '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
		'--no-sandbox','--disable-setuid-sandbox']
		,devtools:true });
		page = await browser.newPage();
  		await page.goto('http://localhost:3000');
	})

	after(async () => {
		await browser.close();
	})

  	it('Page response should be 200', async() =>{
  		await page.on('response', (response) => {
  			if (response.request().method === 'POST'){
		  		expect(response.status).to.equal(200)
			}
		})
  	});

  	it('clicking the collision button should send you to new page' , async() =>{
		
  		const collision_button = "#collision_button";
		const [response] = await Promise.all([
		  page.waitForNavigation(),
		  page.click(collision_button),
		]);
		expect(page.url()).to.equal('http://localhost:3000/collision.html?')
		expect(response.status()).to.equal(200)
	});
  	it('clicking the calibration button should send you to new page' , async() =>{
  		await page.goto('http://localhost:3000');
  		const calibration_button = "#calibration_button";
<<<<<<< HEAD
		await page.click(calibration_button);
		expect(page.url()).to.equal('http://localhost:3000/calibration.html?')
	});
	//
=======
  		const [response] = await Promise.all([
		  page.waitForNavigation(), 
		  page.click(calibration_button),
		]);
		assert.equal(page.url(),'http://localhost:3000/calibration.html?')
		expect(response.status()).to.equal(200)
	});	
>>>>>>> 05ac092... More top level webgazer tests
	it('should be able to recognize video input', async() =>{
		await page.evaluate(async() => {
			document.querySelector("#start_calibration").click()
		})
		await page.waitForSelector("body > div.swal-overlay.swal-overlay--show-modal > div > div.swal-footer > div > button")
		await page.evaluate(async() =>{
			document.querySelector("body > div.swal-overlay.swal-overlay--show-modal > div > div.swal-footer > div > button").click()
		})
		const videoAvailable = await page.evaluate(async() => {
			return await webgazer.params.showFaceFeedbackBox;
		});
		assert.equal(videoAvailable,true);
	});
	it('webgazerVideoFeed should display', async() => {
		
		let video_display = await page.evaluate(async() => {
			return document.getElementById('webgazerVideoFeed').style.display
		})
		assert.notEqual(video_display,"none");
	})
	it('webgazerFaceFeedbackBox should display', async() => {
		await page.waitForSelector('#webgazerFaceFeedbackBox')
		let face_overlay = await page.evaluate(async() => {
			return await document.getElementById('webgazerFaceFeedbackBox').style.display
		})
		assert.notEqual(face_overlay,"none");
	})
	it('faceoverlay should hide when showFaceOverlay is false', async() => {
		face_overlay = await page.evaluate(async() => {
			await webgazer.showFaceFeedbackBox(false)
			return await document.getElementById('webgazerFaceFeedbackBox').style.display
		})
		assert.equal(face_overlay,"none");
	})
	// it('webgazerGazeDot should display', async() => {
	// 	let webgazer_gazedot = await page.evaluate(async() => {
	// 		await document.getElementsByClassName('Calibration')[0].click()
	// 		return await document.getElementById('webgazerGazeDot').style.display
	// 	})
	// 	assert.notEqual(webgazer_gazedot,"none");
	// })
	// it('webgazerGazeDot should hide when showPredictionPoints is false', async() =>{
	// 	let webgazer_gazedot = await page.evaluate(async() => {
	// 		return await document.getElementById('webgazerGazeDot').style.display
	// 	})
	// 	assert.equal(webgazer_gazedot,"none");
	// })
	it('webgazerVideoFeed should hide when showVideo is false', async() => {
		video_display = await page.evaluate(async() => {
			
			await webgazer.showVideo(false)
			return await document.getElementById('webgazerVideoFeed').style.display
		});
		assert.equal(video_display,"none");

	it('clicking the collision button should send you to new page' , async() =>{
		await page.goto('http://localhost:3000');
  		const collision_button = "#collision_button";
		await page.click(collision_button);
		expect(page.url()).to.equal('http://localhost:3000/collision.html?')
	});
});

// webgazer.showFaceFeedbackBox(true) 
// webgazer.showPredictionPoints(true)
					//getVideoElementCanvas:JSON.stringify(await webgazer.getVideoElementCanvas()),
					//getVideoPreviewToCameraResolutionRatio:JSON.stringify(await webgazer.getVideoPreviewToCameraResolutionRatio()),
					//checkEyesInValidationBox
//setVideoViewerSize: await webgazer.setVideoViewerSize(640, 480),
//stopVideo:JSON.stringify(await webgazer.stopVideo()),
//see which elements now disappear


// webgazer.setStaticVideo('../www/data/src/P_02/1491487691210_2_-study-dot_test_instructions.webm')
// returns webgazer instance 
// webgazer.setVideoViewerSize(640, 480)
// //returns nothing 
// webgazer.recordScreenPosition(100, 100) 
// webgazer.recordScreenPosition(100, 100, 'mouseclick') 
// webgazer.storePoints(100, 100, 0) 
// webgazer.setTracker('TFFacemesh') 
// webgazer.setRegression('ridge') 
// webgazer.addTrackerModule(name, constructor) 
// webgazer.addRegressionModule(name, constructor) 
// webgazer.addRegression(name) 
// webgazer.setGazeListener(listener) 
// webgazer.setVideoElementCanvas(canvas - get from page) 

// it('webgazer begins without error', async() => {
	// 	await page.waitForSelector("#start_calibration")
	// 	let webgazer_begin = await page.evaluate(async() =>{
	// 		return await webgazer.begin();
	// 	})
	// 	assert.notEqual(webgazer_begin,null)
	// });