const puppeteer = require('puppeteer');
const { expect } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');
<<<<<<< HEAD

describe('first test', async () => {
	let browser,page,doc;
	before(async () => {
		//browser = await puppeteer.launch({devtools: true});
		browser = await puppeteer.launch();
	})

	after(async () => {
		await browser.close();
	})
  	it('should go to a local webgazerExtractClient', async() =>{
  		page = await browser.newPage();
  		await page.goto('http://localhost:8000/webgazerExtractClient.html');
  		await page.setDefaultNavigationTimeout(0); 
  		const mouse = await page.evaluate(() => {
  			return document.getElementById('myMouse')
  			//'tobiiGP','wpGP','wsCanvas','screencap','scTimeOffsetDiv','diagDiv'
  		})
  		expect(Object.keys(mouse).length === 0 && mouse.constructor === Object).to.equal(true)
=======
const common = require('./common');
//ensure that file is written,
//test util functions
//look into code coverage
//write script that starts server then runs these tests

function importTest(name, path) {
    describe(name, function () {
        require(path);
    });
}

describe('webgazerExtract functions', async () => {
	before(async () => {
		await common.init();
		await common.page.goto('http://localhost:8000/webgazerExtractClient.html');
  		await common.page.coverage.startJSCoverage();
	})

	after(async () => {
		const jsCoverage = await common.page.coverage.stopJSCoverage();
	  	const calculateUsedBytes = (type, coverage) =>
	    	coverage.map(({ url, ranges, text }) => {
	      		let usedBytes = 0;
	      		ranges.forEach(range => (usedBytes += range.end - range.start - 1));
				return {url,coverage:(100*usedBytes/text.length).toFixed(2)};
			});

		console.info(...calculateUsedBytes('js', jsCoverage));
		await common.browser.close();
	})

  	it('should load elements', async() =>{
  		const elements = await common.page.evaluate(() => {
  			return {myMouse:document.getElementById('myMouse'),
  			tobiiGP:document.getElementById('tobiiGP'),
  			wsCanvas: document.getElementById('wsCanvas'),
  			screencap: document.getElementById('screencap'),
  			showScreenCap: document.getElementById('showScreenCap'),
  			scTimeOffsetDiv: document.getElementById('scTimeOffsetDiv'),
  			diagDiv: document.getElementById('diagDiv')}
  		})
  		for(const [k,v] of Object.entries(elements)){ 
  			assert.equal((Object.keys(v).length === 0 
  				&& v.constructor === Object), true)
  			}
>>>>>>> d3a281f... Refactor and clean
  	});

  	it('webgazer properties should be set correctly', async() =>{
  		await common.page.waitForSelector('#overlay');
		let model = await common.page.evaluate(async() => {
			let tracker = webgazer.getTracker();
			return tracker.name//.toString()
  			})
		assert.equal(model,'TFFaceMesh')
  	})
<<<<<<< HEAD
	it('the page should have elemnts', async() =>{
		let bodyHTML = await page.content();

	})
  // 		

=======
  	importTest("webgazer_functions", './webgazer_function_tests');
	
>>>>>>> d3a281f... Refactor and clean
});
