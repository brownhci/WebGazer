var fs = require('fs');
var Chrome = require('chrome-remote-interface');

Chrome(function (chrome) {
    with (chrome) {
        Page.enable();
        Page.loadEventFired(function () {
            // on load we'll start profiling, kick off the test, and finish
            // alternatively, Profiler.start(), Profiler.stop() are accessible via chrome-remote-interface
            Runtime.evaluate({ "expression": "console.profile(); setup(); " });
        });

        Profiler.enable();
        
        // 100 microsecond JS profiler sampling resolution, (1000 is default)
        Profiler.setSamplingInterval({ 'interval': 100 }, function () {
            Page.navigate({'url': 'http://localhost:8000/profiling/profiling.html'});
        });

        Profiler.consoleProfileFinished(function (params) {
            // CPUProfile object (params.profile) described here:
            //    https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/devtools/protocol.json&q=protocol.json%20%22CPUProfile%22,&sq=package:chromium

            // Either:
            // 1. process the data however you wish… or,
            // 2. Use the JSON file, open Chrome DevTools, Profiles tab,
            //    select CPU Profile radio button, click `load` and view the
            //    profile data in the full devtools UI.
            var file = 'profile-' + Date.now() + '.cpuprofile';
            var data = JSON.stringify(params.profile, null, 2);
            fs.writeFileSync(file, data);
            console.log('Done! See ' + file);
            close();
        });
    }
}).on('error', function () {
    console.error('Cannot connect to Chrome');
});