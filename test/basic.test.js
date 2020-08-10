const TFFaceMesh = require('@tensorflow-models/facemesh')
if (typeof fetch !== 'function') {
    global.fetch = require('node-fetch-polyfill');
}
const expect = require('chai');
const { JSDOM } = require("jsdom");
const { window } = new JSDOM('<!doctype html><html><body></body></html>');
const assert = require('chai').assert

// Save these two objects in the global space so that libraries/tests
// can hook into them, using the above doc definition.
global.document = window.document;
global.window = window;

global.performance = window.performance;
const webgazer = require('../dist/webgazer.js');

const jsdom = require("jsdom");
require('jsdom-global')()
//console.log(document.window.performance)

const webgazerInstance = async() => {
	return await webgazer.setRegression('ridge')  
    .setTracker('TFFacemesh')
    .begin();
}

describe('basic webgazer tests', () => {
  it('webgazer tracker should be facemesh', () => {
  	console.log(webgazerInstance.then((x)=>{console.log(x)}))

	assert.equal(webgazerInstance.tracker,TFFaceMesh);
  });
})    
describe('Simple Math Test', () => {
 it('should return 2', () => {
        assert.equal(1 + 1, 2);
    });
 it('should return 9', () => {
        assert.equal(3 * 3, 9);
    });
});
