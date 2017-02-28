# [WebGazer.js](https://webgazer.cs.brown.edu)

WebGazer.js is an eye tracking library that uses common webcams to infer the eye-gaze locations of web visitors on a page in real time. The eye tracking model it contains self-calibrates by watching web visitors interact with the web page and trains a mapping between the features of the eye and positions on the screen. WebGazer.js is written entirely in JavaScript and with only a few lines of code can be integrated in any website that wishes to better understand their visitors and transform their user experience. WebGazer.js runs entirely in the client browser, so no video data needs to be sent to a server. WebGazer.js can run only if the user consents in giving access to their webcam. 


* [Official website](https://webgazer.cs.brown.edu)
* [Documentation](https://webgazer.cs.brown.edu/documentation)
* [API Docs](https://github.com/brownhci/WebGazer/wiki/Top-Level-API)


## Features

* Real time gaze prediction on most major browsers
* No special hardware - WebGazer.js uses common webcams
* Self-calibration from clicks and cursor movements
* Easy to integrate with a few lines of JavaScript
* Swappable components for eye detection
* Multiple gaze prediction models


## How to install
Download the webgazer.js file located [here](https://webgazer.cs.brown.edu/#download) or use the file build/webgazer.js from [this](https://github.com/brownhci/WebGazer.git) repository.

If you want to build the repository from source follow these instructions:

    git clone https://github.com/brownhci/WebGazer.git
    cd build
    ./build_library


## Examples

Examples of how WebGazer.js works can be found [here](https://webgazer.cs.brown.edu/#examples).


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



## Who We Are

* Alexandra Papoutsaki
* James Laskey
* Aaron Gokaslan
* Jeff Huang

## License

Copyright (C) 2016 [Brown HCI Group](http://hci.cs.brown.edu)

Licensed under GPLv3. Companies with a valuation of less than $10M can use WebGazer.js under LGPLv3.
