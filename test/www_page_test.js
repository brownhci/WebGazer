const puppeteer = require('puppeteer');
const { expect, assert } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');

describe('Page Basics', async () => {
	let browser,page,doc;
	before(async () => {
		//convert .webm to mp4 https://cloudconvert.com/webm-to-mp4
		//convert mp4 to y4m with:
		//ffmpeg -i 1491487691210_2_-study-dot_test_instructions.webm -pix_fmt yuv420p dot.y4m
		//sed -i '0,/C420mpeg2/s//C420/' *.y4m
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
		await page.click(calibration_button);
		expect(page.url()).to.equal('http://localhost:3000/calibration.html?')
	});
	//
	it('should be able to recognize video input', async() =>{
		await page.waitForSelector("#start_calibration")
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
		console.log(videoAvailable)
		// debugger
		assert.equal(videoAvailable,true);

	it('clicking the collision button should send you to new page' , async() =>{
		await page.goto('http://localhost:3000');
  		const collision_button = "#collision_button";
		await page.click(collision_button);
		expect(page.url()).to.equal('http://localhost:3000/collision.html?')
	});
});

// webgazer.begin(()=>{})
// return webgazer instance - errors?
// webgazer.showVideo(true)
// return webgazer instance
// webgazer.showFaceOverlay(true)
// return webgazer instance 
// //can we simulate a webcam or do we have to use the video?
// //how can we simulate webcam input for puppeteer?
// //https://stackoverflow.com/questions/52464583/possible-to-get-puppeteer-audio-feed-and-or-input-audio-directly-to-puppeteer
// webgazer.showFaceFeedbackBox(true) 
// webgazer.showPredictionPoints(true)
					//getVideoElementCanvas:JSON.stringify(await webgazer.getVideoElementCanvas()),
					//getVideoPreviewToCameraResolutionRatio:JSON.stringify(await webgazer.getVideoPreviewToCameraResolutionRatio()),
					//checkEyesInValidationBox
//setVideoViewerSize: await webgazer.setVideoViewerSize(640, 480),



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