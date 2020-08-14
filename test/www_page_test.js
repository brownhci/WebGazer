const puppeteer = require('puppeteer');
const { expect } = require('chai');
const TFFaceMesh = require('@tensorflow-models/facemesh');

describe('Page Basics', async () => {
	let browser,page,doc;
	before(async () => {
		browser = await puppeteer.launch();
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

  	it('clicking the calibration button should send you to new page' , async() =>{
  		const calibration_button = "#calibration_button";
		await page.click(calibration_button);
		expect(page.url()).to.equal('http://localhost:3000/calibration.html?')
	});

	it('clicking the collision button should send you to new page' , async() =>{
		await page.goto('http://localhost:3000');
  		const collision_button = "#collision_button";
		await page.click(collision_button);
		expect(page.url()).to.equal('http://localhost:3000/collision.html?')
	});
});
