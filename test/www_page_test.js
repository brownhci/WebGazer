const puppeteer = require('puppeteer');
const { assert } = require('chai');

describe('Main Page Basics', async () => {
	let browser,page,response;
	before(async () => {
		browser = await puppeteer.launch();
		page = await browser.newPage();
  		response = await page.goto('http://localhost:3000');
	})

	after(async () => {
		await browser.close();
	})

  	it('Page response should be 200', async() =>{
  		assert.equal(response.status(),200)
  	})
  	it('clicking the collision button should send you to new page' , async() =>{
  		const collision_button = "#collision_button";
		const [response] = await Promise.all([
		  page.waitForNavigation(),
		  page.click(collision_button),
		]);
		assert.equal(page.url(),'http://localhost:3000/collision.html?')
		assert.equal(response.status(),200)
	});
  	it('clicking the calibration button should send you to new page' , async() =>{
  		await page.goto('http://localhost:3000');
  		const calibration_button = "#calibration_button";
  		const [response] = await Promise.all([
		  page.waitForNavigation(), 
		  page.click(calibration_button),
		]);
		assert.equal(page.url(),'http://localhost:3000/calibration.html?')
		assert.equal(response.status(),200)
	});	
});



