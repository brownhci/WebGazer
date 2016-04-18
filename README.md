# WebGazer.js

WebGazer.js is an open-source, client-side JavaScript library that performs real-time gaze tracking on the browser. WebGazer.js uses HTML5 to access the webcam of the user and upon their consent uses a series of computational models to predict where the user is looking at any given time. All computations are performed locally and are not transmitted outside the user's computer.

* [Official website](https://webgazer.cs.brown.edu)
* [Documentation](https://github.com/brownhci/WebGazer/wiki)
* [API Docs](https://github.com/brownhci/WebGazer/wiki/Top-Level-API)


## How to install



## Example

## Video

## Demo

<!--WebGazer.js can integrated in any website that wishes to use gaze tracking either to better understand users-->

## Operation
    WebGazer.js contains the top level api commands which control the state of webgazer. At a high level, webgazer's flow of operation is

        (set parameters like tracker)
        \/
        isReady()
        \/
   |--->begin()
   |         ||                             
   |        (load global parameters)        
   |         ||                             
   |        loop()
   |            || 
   |           getPrediction()     
   |
   |
   |    (move or click listener)
   |        ||
   |       (training data is given to regression module via addData) 
   |
   |    getPrediction()
   |        ||
   |       tracker.getEyePatches()
   |            ||
   |           blickDetector.detectBlink()
   |                ||
   |               pupil.getPupils()
   |
   |    pause()
   |    \/
   |<---resume()
        \/
        end()
            ||
           (save global parameters)
            


Development Tooling


Bugs

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
    booktitle  = {Proceedings of the 25th International Joint Conference on Artificial Intelligence (IJCAI)},
	year       = {2016},
	}




## Who We Are

* Alexandra Papoutsaki
* James Laskey
* Jeff Huang

## License

Copyright (C) 2016 Brown HCI Group

Licensed under GPLv3.


