const puppeteer = require('puppeteer');
let common = {};

common.init = async function () {      
	this.browser = await puppeteer.launch();
	this.page = await this.browser.newPage();
}

module.exports = common;
