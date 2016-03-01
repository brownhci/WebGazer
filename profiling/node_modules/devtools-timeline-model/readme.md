# devtools-timeline-model [![Build Status](https://travis-ci.org/paulirish/devtools-timeline-model.svg?branch=master)](https://travis-ci.org/paulirish/devtools-timeline-model)

> Parse raw trace data into the Chrome DevTools' structured profiling data models

If you use something like [big-rig](https://github.com/googlechrome/big-rig) or [automated-chrome-profiling](https://github.com/paulirish/automated-chrome-profiling#timeline-recording) you may end up with raw trace data. It's pretty raw. This module will parse that stuff into something a bit more consumable, and should help you with higher level analysis.


## Install

```sh
$ npm install --save devtools-timeline-model
```


## Usage

```js
const filename = 'demo/mdn-fling.json'

var fs = require('fs')
var events = fs.readFileSync(filename, 'utf8')
const devtoolsTimelineModel = require('devtools-timeline-model');
var model = devtoolsTimelineModel(events)

//=>
model.timelineModel // full event tree
model.irModel // interactions, input, animations
model.frameModel // frames, durations
model.filmStripModel // screenshots
```

![image](https://cloud.githubusercontent.com/assets/39191/13276174/6e8284e8-da71-11e5-89a1-190abbac8dfd.png)

Using [devtool](https://github.com/Jam3/devtool) to view the full output:
![image](https://cloud.githubusercontent.com/assets/39191/13277814/7b6ca6b6-da80-11e5-8841-71305ade04b4.png)


## API

### devtoolsTimelineModel(traceData)

#### traceData

Type: `string` or `object`

Either a string of the trace data or the `JSON.parse`'d equivalent.


#### return object `model`

* `model.timelineModel` full event tree
* `model.irModel` interactions, input, animations
* `model.frameModel` frames, durations
* `model.filmStripModel` screenshots

These objects are huge. You'll want to explore them in a UI like [devtool](https://github.com/Jam3/devtool).


## License

Apache © [Paul Irish](https://github.com/paulirish/)
