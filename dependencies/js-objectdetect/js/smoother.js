/**
 * Double-exponential smoothing based on Wright's modification of Holt's method
 * for irregular data.
 * 
 * Copyright 2014 Martin Tschirsich
 * Released under the MIT license
 * 
 * @param {Array}  alphas        Exponential smoothing factors
 * @param {Array}  initialValues Initial values before smoothing
 * @param {Number} lookAhead     Additionally added linear trend, between 0 - 1
 */

var Smoother = function(alphas, initialValues, lookAhead) {
	"use strict";
	
	var lastUpdate = +new Date(),
		initialAlphas = alphas.slice(0),
		alphas = alphas.slice(0),
		a = initialValues.slice(0),
		b = initialValues.slice(0),
		numValues = initialValues.length,
		lookAhead = (typeof lookAhead !== 'undefined') ? lookAhead : 1.0;

	this.smooth = function(values) {
		var smoothedValues = [];
		
		// time in seconds since last update:
		var time = new Date() - lastUpdate;
		lastUpdate += time;
		time /= 1000;
		
		// update:
		for (var i = 0; i < numValues; ++i) {
			
			// Wright's modification of Holt's method for irregular data:
			alphas[i] = alphas[i] / (alphas[i] + Math.pow(1 - initialAlphas[i], time));

			var oldA = a[i];
			a[i] = alphas[i] * values[i] + (1 - alphas[i]) * (a[i] + b[i] * time);
			b[i] = alphas[i] * (a[i] - oldA) / time + (1 - alphas[i]) * b[i];
			
			smoothedValues[i] = a[i] + time * lookAhead * b[i];
			
			// Alternative approach:
			//a[i] = alphas[i] * values[i] + (1 - alphas[i]) * a[i];
			//b[i] = alphas[i] * a[i] + (1 - alphas[i]) * b[i];
			//smoothedValues[i] = 2*a[i] - 1*b[i];*/
		}
		
		return smoothedValues;
	};
};
