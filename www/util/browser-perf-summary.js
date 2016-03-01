// generally stolen from https://github.com/axemclion/browser-perf

var fs = require('fs');

function TimelineMetrics() {
    this.timelineMetrics = {};
    this.eventStacks = {};
}

TimelineMetrics.prototype.onData = function(events) {
    events.forEach((event) =>
        this.processTracingRecord_(event)
    )
};

TimelineMetrics.prototype.addSummaryData_ = function(e, source) {
    if (typeof this.timelineMetrics[e.type] === 'undefined') {
        this.timelineMetrics[e.type] = new StatData();
    }
    this.timelineMetrics[e.type].add(e.startTime && e.endTime ? e.endTime - e.startTime : 0);
}


// Timeline format at https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU/edit#heading=h.yr4qxyxotyw
TimelineMetrics.prototype.processTracingRecord_ = function(e) {
    switch (e.ph) {
        case 'I': // Instant Event
        case 'X': // Duration Event
            var duration = e.dur || e.tdur || 0;
            this.addSummaryData_({
                type: e.name,
                data: e.args ? e.args.data : {},
                startTime: e.ts / 1000,
                endTime: (e.ts + duration) / 1000
            }, 'tracing');
            break;
        case 'B': // Begin Event
            if (typeof this.eventStacks[e.tid] === 'undefined') {
                this.eventStacks[e.tid] = [];
            }
            this.eventStacks[e.tid].push(e);
            break;
        case 'E': // End Event
            if (typeof this.eventStacks[e.tid] === 'undefined' || this.eventStacks[e.tid].length === 0) {
                debug('Encountered an end event that did not have a start event', e);
            } else {
                var b = this.eventStacks[e.tid].pop();
                if (b.name !== e.name) {
                    debug('Start and end events dont have the same name', e, b);
                }
                this.addSummaryData_({
                    type: e.name,
                    data: extend(e.args.endData, b.args.beginData),
                    startTime: b.ts / 1000,
                    endTime: e.ts / 1000
                }, 'tracing');
            }
            break;
    }
};

TimelineMetrics.prototype.report = function(file){

    var filename = file + '.summary.json';


    var arr = Object.keys(tm.timelineMetrics).map(k => {
        var obj = {};
        obj[k] = tm.timelineMetrics[k]
        return obj;
    }).sort((a,b) =>
        b[Object.keys(b)].sum - a[Object.keys(a)].sum
    );

    var data = JSON.stringify(arr, null, 2);
    fs.writeFileSync(filename, data);

    console.log('Recording Summary: ' + filename);
}



function StatData() {
    this.count = this.sum = 0;
    this.max = this.min = null;
}

StatData.prototype.add = function(val) {
    if (typeof val === 'number') {
        this.count++;
        this.sum += val;
        if (this.max === null || val > this.max) {
            this.max = val;
        }
        if (this.min === null || val < this.min) {
            this.min = val;
        }
    }
};

StatData.prototype.getStats = function() {
    return {
        mean: this.count === 0 ? 0 : this.sum / this.count,
        max: this.max,
        min: this.min,
        sum: this.sum,
        count: this.count
    }
}



var extend = function(obj1, obj2) {
    if (typeof obj1 !== 'object' && !obj1) {
        obj1 = {};
    }
    if (typeof obj2 !== 'object' && !obj2) {
        obj2 = {};
    }
    for (var key in obj2) {
        if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
            obj1[key] = obj1[key].concat(obj2[key]);
        } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object' && !Array.isArray(obj1[key]) && !Array.isArray(obj2[key])) {
            obj1[key] = extend(obj1[key], obj2[key]);
        } else {
            obj1[key] = obj2[key];
        }
    }
    return obj1;
}

var tm = new TimelineMetrics();

module.exports = tm;