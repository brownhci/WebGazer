# [WebGazer.js](https://webgazer.cs.brown.edu)

WebGazer.js is an eye tracking library that uses common webcams to infer the eye-gaze locations of web visitors on a page in real time. The eye tracking model it contains self-calibrates by watching web visitors interact with the web page and trains a mapping between the features of the eye and positions on the screen. WebGazer.js is written entirely in JavaScript and with only a few lines of code can be integrated in any website that wishes to better understand their visitors and transform their user experience. WebGazer.js runs entirely in the client browser, so no video data needs to be sent to a server. WebGazer.js can run only if the user consents in giving access to their webcam.

* [Official website](https://webgazer.cs.brown.edu)
* [API Docs](https://github.com/brownhci/WebGazer/wiki/Top-Level-API)

## Features

* Real time gaze prediction on most major browsers
* No special hardware; WebGazer.js uses your webcam
* Self-calibration from clicks and cursor movements
* Easy to integrate with a few lines of JavaScript
* Swappable components for eye detection
* Multiple gaze prediction models
* Useful video feedback to user

## Build the repository

If you want to build the repository from source follow these instructions:

    # Ensure NodeJS is downloaded: https://nodejs.org/en/download/
    git clone https://github.com/brownhci/WebGazer.git
    cd WebGazer
    #install the dependencies
    npm install
    #build the project
    npm run build

<!-- To use the webgazer script in the head of an HTML file add the `async` tag to ensure the clmtrackr does not collapse to a slower version -->

## Examples

Examples of how WebGazer.js works can be found [here](https://webgazer.cs.brown.edu/#examples).

### to use on any website

```
<script src="webgazer.js" type="text/javascript" >
```

### to use in any modern framework

````  
const webgazer = require('webgazer'); // npm package 'webgazer' is sync with this repository
```` 

or you can you do

```` 
import webgazer from 'webgazer'
````

### How to run the Example HTML files

Within the /www directory there are two example HTML files:

  * `calibration.html`: This example includes additional user feedback, such as a 9-point calibration sequence, accuracy measurements and an informative help module.
  * `collision.html`: This example contains a game where the user can move an orange ball with their eyes, which in turn collides with blue balls.

To run the example files as a server:

	# Clone the repository and download NodeJS using the steps listed above
	# Move into the www directory and download the additional dependencies
	cd www
	npm install
	# Run the webpage index.html as a server
	npm run serve

## Browser Support

The following browsers support WebGazer.js:

  * Google Chrome
  * Microsoft Edge
  * Mozilla Firefox
  * Opera
  * Safari

## Publications

  _**Note:** The current iteration of WebGazer no longer corresponds with the WebGazer described in the following publications and which can be found [here](https://github.com/brownhci/WebGazer/tree/2a4a70cb49b2d568a09362e1b52fd3bd025cd38d)._

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
    booktitle  = {Proceedings of the ACM SIGIR Conference on Human Information Interaction \& Retrieval (CHIIR)},
    year       = {2017},
    organization={ACM}
    }

    @inproceedings{papoutsaki2018eye,
    author={Papoutsaki, Alexandra and Gokaslan, Aaron and Tompkin, James and He, Yuze and Huang, Jeff},
    title={The eye of the typer: a benchmark and analysis of gaze behavior during typing.},
    booktitle={Proceedings of the 2018 ACM Symposium on Eye Tracking Research \& Applications (ETRA)},
    pages={16--1},
    year={2018},
    organization={ACM}
    }



## Who We Are

  * Alexandra Papoutsaki
  * Aaron Gokaslan
  * Ida De Smet
  * Xander Koo
  * James Tompkin
  * Jeff Huang

## Other Collaborators

  * Nediyana Daskalova
  * James Hays
  * Yuze He
  * James Laskey
  * Patsorn Sangkloy
  * Elizabeth Stevenson
  * Preston Tunnell Wilson
  * Jack Wong

### Acknowledgements

Webgazer is developed based on the research that is done by Brown University, with recent work at Pomona College. The work of the calibration example file was developed in the context of a course project with the aim to improve the feedback of WebGazer. It was proposed by Dr. Gerald Weber and his team Dr. Clemens Zeidler and Kai-Cheung Leung.

This research is supported by NSF grants IIS-1464061, IIS-1552663, and the Brown University Salomon Award.

## License

Copyright (C) 2020 [Brown HCI Group](http://hci.cs.brown.edu)

Licensed under GPLv3. Companies have the option to license WebGazer.js under LGPLv3 while their valuation is under $1,000,000.
