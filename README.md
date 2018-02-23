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
* Useful video feedback to user

## Build the repository

If you want to build the repository from source follow these instructions:

    # Ensure NodeJS is downloaded: https://nodejs.org/en/download/
    # Install grunt-cli if not installed (this may require you to use `sudo` or run the console as Administrator)
    npm install -g grunt-cli
    git clone https://github.com/brownhci/WebGazer.git
    npm install
    # Run grunt to build the webgazer.js and webgazer.min.js file in the build directory
    grunt

To use the webgazer script in the head of an HTML file add the `async` tag to ensure the clmtrackr does not collapse to a slower version

## Examples

Examples of how WebGazer.js works can be found [here](https://webgazer.cs.brown.edu/#examples).

### How to run the Index HTML

The Index HTML File provides the additional features of an integrated action bar that provides the functionality of a calibration system, accuracy measurements and an informative "help" module.

This is a good example that shows how WebGazer can be used.

1. Clone and build the repository using the steps listed above (including downloading NodeJS and running `npm install`)
2. Run the index.html file as a server by running the command `browser-sync start --server --files "*"` in the WebGazer directory

## Browser Support

The following browsers support WebGazer.js:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Opera

Your browser needs to support the getUserMedia API as seen [here](http://caniuse.com/#feat=stream).

## Publications

	@inproceedings{papoutsaki2016webgazer,
	author     = {Alexandra Papoutsaki and Patsorn Sangkloy and James Laskey and Nediyana Daskalova and Jeff Huang and James Hays},
	title      = {{WebGazer}: Scalable Webcam Eye Tracking Using User Interactions},
    booktitle  = {Proceedings of the 25th International Joint Conference on Artificial Intelligence (IJCAI-16)},
    pages      = {3839--3845},
	year       = {2016},
	organization={AAAI}
	}

	@inproceedings{papoutsaki2017searchgazer,
	author     = {Alexandra Papoutsaki and James Laskey and Jeff Huang},
    title      = {SearchGazer: Webcam Eye Tracking for Remote Studies of Web Search},
    booktitle  = {Proceedings of the ACM SIGIR Conference on Human Information Interaction \& 	Retrieval (CHIIR)},
    year       = {2017},
    organization={ACM}
    }


## Who We Are

* Alexandra Papoutsaki
* James Laskey
* Aaron Gokaslan
* Yuze He
* Jeff Huang

## Other Collaborators

* Ida De Smet - Software engineering student at the University of Auckland
* Elizabeth Stevenson - Software engineering student at the University of Auckland
* Jack Wong - Software engineering student at the University of Auckland

### Acknowledgements

Webgazer project is developed based on the research that is done by Brown University. The work of the calibration example file was developed in the context of a course project topic to improve the feedback of WebGazer. It was proposed by Dr. Gerald Weber and his team Dr. Clemens Zeidler and Kai-Cheung Leung.

This research is supported by NSF grants IIS-1464061, IIS-1552663, and the Brown University Salomon Award.

## License

Copyright (C) 2018 [Brown HCI Group](http://hci.cs.brown.edu)

Licensed under GPLv3. Companies have the option to license WebGazer.js under LGPLv3 while their valuation is under $10,000,000.
