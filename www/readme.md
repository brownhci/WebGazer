Let's say you want to evaluate the performance of some clientside JavaScript and want to automate it. Let's kick off our measurement in Node.js and collect the performance metrics from Chrome. Oh yeah.

We can use the [Chrome debugging protocol](https://developer.chrome.com/devtools/docs/debugger-protocol) and go directly to [how Chrome's JS sampling profiler interacts with V8](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/devtools/protocol.json&q=file:protocol.json%20%22Profiler%22,&sq=package:chromium&type=cs).

So much power here, so we'll use [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) as a nice client in front of the protocol:

    npm install chrome-remote-interface

Run Chrome with an open debugging port:

    # linux
    google-chrome --remote-debugging-port=9222

    # mac
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222


#### CPU Profiling
See `get-cpu-profile.js`. Here's what it does:

* Opens `http://localhost:8080/perf-test.html`
* Starts profiling
* run's the page's `startTest();`
* Stop profiling and retrieve the profiling result
* Save it to disk. We can then load the data into Chrome DevTools to view

<img src="http://i.imgur.com/zAZa3iU.jpg" height=150>


#### Timeline recording

You can record from the timeline. The saved files is drag/droppable into the Timeline panel.
See `get-timeline-trace.js`

<img src="https://cloud.githubusercontent.com/assets/39191/12309969/774c0c1e-ba02-11e5-9a8a-b45e33ef6e5f.png">

### Finding forced layouts (reflows)

A bit more specialized, you can take that timeline recording and probe it with questions like.. "How many times is layout forced"

See `test-for-layout-trashing.js`

### Timeline model

The raw trace data is.. pretty raw.  The [`devtools-timeline-model` package](https://github.com/paulirish/devtools-timeline-model)  provides an ability to use the Chrome DevTools frontend's trace parsing.

```js
const filename = 'demo/mdn-fling.json'

var fs = require('fs')
var traceToTimelineModel = require('./lib/timeline-model.js')

var events = fs.readFileSync(filename, 'utf8')
var model = traceToTimelineModel(events)

model.timelineModel // full event tree
model.irModel // interactions, input, animations
model.frameModel // frames, durations
```
![image](https://cloud.githubusercontent.com/assets/39191/13276174/6e8284e8-da71-11e5-89a1-190abbac8dfd.png)

![image](https://cloud.githubusercontent.com/assets/39191/13276306/d3ebcb36-da72-11e5-8204-0812e92f4df1.png)


#### Way more is possible

This is just the tip of the iceberg when it comes to using [the protocol](https://developer.chrome.com/devtools/docs/debugger-protocol) to manipulate and measure the browser. Plenty of other projects around this space as well: [Chromium Telemetry](http://www.chromium.org/developers/telemetry), [ChromeDriver frontend for WebDriver](https://sites.google.com/a/chromium.org/chromedriver/), [trace-viewer](http://dev.chromium.org/developers/how-tos/trace-event-profiling-tool), the aforementioned [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface) Node API, and a number of [other debugging protocol client applications collected here](https://developer.chrome.com/devtools/docs/debugging-clients).  [browser-perf](https://github.com/axemclion/browser-perf) and its viewer [perfjankie](https://github.com/axemclion/perfjankie) are definitely worth a look as well.

#### Why profile JS like this?

Well, it started because testing the performance of asynchronous code is difficult. Obviously measuring `endTime - startTime` doesn't work. However, using a profiler gives you the insight of how many microseconds the CPU spent within each script, function and its children, making analysis much more sane.

### Contributors
* paul irish
* [@vladikoff](http://github.com/vladikoff)
* [Andrea Cardaci](https://github.com/cyrus-and)
