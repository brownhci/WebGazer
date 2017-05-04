750 Group Project

Team Laybluff.

Project G5) (JavaScript) Improving a webcam-based gaze tracker.

# [WebGazer.js](https://webgazer.cs.brown.edu)

This repository is modified from the original [WebGazer Repository](https://github.com/brownhci/WebGazer.git)

* [Official website](https://webgazer.cs.brown.edu)
* [Documentation](https://webgazer.cs.brown.edu/documentation)
* [API Docs](https://github.com/brownhci/WebGazer/wiki/Top-Level-API)

## This repository is modified by Laybluff

Our team is working on improving Webgazer, a webcam-based gaze tracker. This open-source project provides a library which integrates with the client’s computer webcam, allowing real time eye-tracking. The purpose of this library is to track the client’s eye movements whilst browsing the internet, using self-calibration model to provide predictions on the user’s gaze.

The model struggles to immediately correctly identify the client’s face. Whilst the Webgazer’s predictions are correct within a certain vicinity, the predictions move quickly with a lot of extra “noise”; the red dot representing where the user is looking on the screen is very jittery. Because of this, it can be difficult for the user to understand what is going on, and what these eye movement predictions represent.

Therefore our project aims to perform calibration to refine the eye tracking and provide the user with better, more intuitive feedback.

## Additional Features

* Ability to integrate demonstation HTML into website
* An integrated, intuitive and sleek action bar
* Informative "help" module accessible at all times
* Structured calibration system
* Accuracy measure of predictions
* Video feedback: lighting & positioning
* Improved eye predictions visible to the user

Our demonstration (index.html) provides a action bar at the top with features including:

1. accuracy measure
2. recalibration
4. help (instructions)

This action bar provides the functionality with the simple click of a button. This is intuitive. This also has the ability to integrate into an existing website by using the example code provided in this example HTML. This is done with the intention to use as little amount of space as possible, and not obstruct the view of the proposed website template.

The structured calibration system makes use of:

1. the reputable 9-point calibration technique.
2. the ability to provide a measure of the generated prediction model

This requires the user to click 5 times on each of the 9 points on the screen. Following this the user is prompted with the instructions to look at a place on the screen for 5 seconds. Our framework then gathers these drawn prediction points and calculates a percentage of accuracy from this.

Example measures:

- 100%: all the prediction points land on the calibration point
- 0%: the prediction points are very scattered and in-accurately predict where the user is looking

Out action bar also provides the ability to clear the prediction model with the use of the "recalibrate" button & create a new one.

The user is also suggested to have their facial recognition within a "box" that is on top of the video feed. This turns green when the user is sitting in optimal position from the computer, and allows the facial recognition to do an optimal job. This also ensures that the user understands what the facial recognition drawn on their face means.

On top of this, we have added popups that the user will be prompted with when their lighting is too dark in their video feedback. They will be suggested to move into better lighting conditions.

Last of all, we have improved the user feedback by drawing less eye prediction points on the screen. Instead, we are taking the average from the previous 3 predictions and only showing the user this value. This allows for the user to be provided with:

1. more accurate eye predictions
2. reduces the amount of "jitter" of the eye predictions, as less are shown per second

There are also other points/ dots drawn on the screen throughout the process:

- red: the user's eye movements predicted by the model
- black: where the user has clicked on the screen to calibrate the model. Provides them with real-time knowledge of this
- blue: all the predictions plotted & remain on the screen

Please see the "help" module in the action bar to view further instructions.

Below are instructions on how to view & run these proposed changes.

## How to install & run webgazer.js

Use the file build/webgazer.js from [this](https://github.com/abbyythompson/WebGazer) repository.

If you want to build the repository from source follow these instructions:

    git clone https://github.com/brownhci/WebGazer.git
    cd build
    ./build_library


## How to run our example calibration HTML

download nodejs from https://nodejs.org/en/download/

run `npm install` within the repository to download the packages from the package.json file

then run the index.html file as a server (e.g. using browsersync)

This index.html file will run you through the modified user feedback module by Laybluff.

The original examples of how WebGazer.js works can be found [here](https://webgazer.cs.brown.edu/#examples).


---------------------------------------------------------


# README information from original repository

WebGazer.js is an eye tracking library that uses common webcams to infer the eye-gaze locations of web visitors on a page in real time. The eye tracking model it contains self-calibrates by watching web visitors interact with the web page and trains a mapping between the features of the eye and positions on the screen. WebGazer.js is written entirely in JavaScript and with only a few lines of code can be integrated in any website that wishes to better understand their visitors and transform their user experience. WebGazer.js runs entirely in the client browser, so no video data needs to be sent to a server. WebGazer.js can run only if the user consents in giving access to their webcam.

## Features

* Real time gaze prediction on most major browsers
* No special hardware - WebGazer.js uses common webcams
* Self-calibration from clicks and cursor movements
* Easy to integrate with a few lines of JavaScript
* Swappable components for eye detection
* Multiple gaze prediction models

## Browser Support

The following browsers support WebGazer.js:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Opera

Your browser needs to support the getUserMedia API as seen [here](http://caniuse.com/#feat=stream).

## Citation

	@inproceedings{papoutsaki2016webgazer,
	author     = {Alexandra Papoutsaki and Patsorn Sangkloy and James Laskey and Nediyana Daskalova and Jeff Huang and James Hays},
	title      = {{WebGazer}: Scalable Webcam Eye Tracking Using User Interactions},
    booktitle  = {Proceedings of the 25th International Joint Conference on Artificial Intelligence (IJCAI-16)},
    pages      = {3839--3845},
	year       = {2016},
	organization={AAAI}
	}

## Who the original modifiers were

* Alexandra Papoutsaki
* James Laskey
* Aaron Gokaslan
* Jeff Huang

## License

Copyright (C) 2016 [Brown HCI Group](http://hci.cs.brown.edu)

Licensed under GPLv3. Companies with a valuation of less than $10M can use WebGazer.js under LGPLv3.
