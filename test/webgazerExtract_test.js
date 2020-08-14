const puppeteer = require('puppeteer');
const { expect } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');

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
  	});

  	it('webgazer properties should be set correctly', async() =>{
  		await page.waitForSelector('#overlay');
		let model = await page.evaluate(async() => {
			let tracker = webgazer.getTracker();
			return tracker.name//.toString()
  			})
		expect(model).to.equal('TFFaceMesh')
  	})
	it('the page should have elemnts', async() =>{
		let bodyHTML = await page.content();

	})
  // 		

});
