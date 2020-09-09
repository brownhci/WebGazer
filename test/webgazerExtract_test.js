const puppeteer = require('puppeteer');
const { assert } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');

describe('webgazerExtract functions', async () => {
  let browser,page;
	before(async () => {
    browser = await puppeteer.launch()
    page = await browser.newPage();
		await page.goto('http://localhost:8000/webgazerExtractClient.html');
	})
	after(async () => {
		await browser.close();
	})
  	it('should load elements', async() =>{
  		const elements = await page.evaluate(() => {
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
  	});

  	it('webgazer properties should be set correctly', async() =>{
  		await page.waitForSelector('#overlay');
		  let model = await page.evaluate(async() => {
			  let tracker = webgazer.getTracker();
        return tracker.name
  		})
		assert.equal(model,'TFFaceMesh')
  	})
});

