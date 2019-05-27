# [SearchGazer](https://webgazer.cs.brown.edu/search)

SearchGazer is an eye tracking library that uses common webcams to infer the eye-gaze locations of visitors on a search engine in real time. In addition, SearchGazer predicts in real-time which area of interest within a search engine result page is being examined by a visitor at any moment. SearchGazer extends WebGazer and its eye tracking model that self-calibrates by watching web visitors interact with the web page and trains a mapping between the features of the eye and positions on the screen. SearchGazer is written entirely in JavaScript and with only a few lines of code can be integrated in any search engine that wishes to conduct remote eye tracking studies. SearchGazer runs entirely in the client browser, therefore no video data needs to be sent to a server. SearchGazer runs only if the user consents in giving access to their webcam.



* [Official website](https://webgazer.cs.brown.edu/search)



## How to install
Download the searchgazer.js file located [here](https://webgazer.cs.brown.edu/search#download).

## Examples

Examples of how SearchGazer.js works can be found [here](https://webgazer.cs.brown.edu/search#examples).


## Browser Support

The following browsers support WebGazer.js:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox
* Opera

Your browser needs to support the getUserMedia API as seen [here](http://caniuse.com/#feat=stream).

## Search Engine Support
SearchGazer supports the following search engines for identification of areas of interest:

* Bing
* Google

## Citation

	@inproceedings{papoutsaki2017searchgazer,
	author = {Alexandra Papoutsaki and James Laskey and Jeff Huang},
	title = {SearchGazer: Webcam Eye Tracking for Remote Studies of Web Search},
	booktitle = {Proceedings of the ACM SIGIR Conference on Human Information Interaction \& Retrieval (CHIIR)},
	year = {2016},
	organization={ACM}
	}



## Who We Are

* Alexandra Papoutsaki
* James Laskey
* Jeff Huang

## License

Copyright (C) 2017 [Brown HCI Group](http://hci.cs.brown.edu)

Licensed under GPLv3.

