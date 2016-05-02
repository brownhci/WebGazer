# WebGazer.js

WebGazer.js is an open-source, client-side JavaScript library that performs real-time gaze tracking on the browser. WebGazer.js uses HTML5 to access the webcam of the user and upon their consent uses a series of computational models to predict where the user is looking at any given time. All computations are performed locally and are not transmitted outside the user's computer.

* [Official website](https://webgazer.cs.brown.edu)
* [Documentation](https://github.com/brownhci/WebGazer/wiki)
* [API Docs](https://github.com/brownhci/WebGazer/wiki/Top-Level-API)


## How to install
Download the webgazer.js file located [here](https://webgazer.cs.brown.edu/#download) or use the file build/webgazer.js from this repository.

If you want to build the repository from source follow these instructions:

    git clone https://github.com/brownhci/WebGazer.git
    cd build
    ./build_library


## Demo

Demos can be found [here](https://webgazer.cs.brown.edu/#examples)

## Operation
    WebGazer.js contains the top level api commands which control the state of webgazer. At a high level, webgazer's flow of operation is

       (set parameters like tracker)
        \/
        isReady()
        \/
        begin()
             ||                             
            (load global parameters)        
               ||                             
   |-------->  loop()
   |             || 
   |            getPrediction()
   |            \/
   |            (gaze listener called)
   |
   |
   |    (move or click listener)
   |        ||
   |       (training data is given to regression module via addData) 
   |
   |
   |    getPrediction()
   |        ||
   |       tracker.getEyePatches()
   |
   |
   |    pause()
   |    \/
   |<---resume()
        \/
        end()
            ||
           (save global parameters)


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


