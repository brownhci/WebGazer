console.log("Start");

const ARRAY_SIZE = 10000;
var testArray = new Array(ARRAY_SIZE);


function one() {
    for(var j = 0 ; j < testArray.length ; j++){
        //code
    }
}

function oneb() {
    for(var j = 0 ; j < testArray.length ; ++j){
        //code
    }
}

function two() {
    for(var j = 0, l = testArray.length ; j < l ; j++){
        //code
    }
}

function twob() {
    for(var j = 0, l = testArray.length ; j < l ; ++j){
        //code
    }
}

function three() {
    var k;
    var l = testArray.length;

    for(k = 0 ; k < l ; k++){
        //code
    }
}

function threeb() {
    var k;
    var l = testArray.length;

    for(k = 0 ; k < l ; ++k){
        //code
    }
}

function four() {
    var k = 0;
    var l = testArray.length;

    for(; k < l ; k++){
        //code
    }
}

function fourb() {
    var k = 0 ;
    var l = testArray.length;

    for(; k < l ; ++k){
        //code
    }
}

function fivea() {
    var i = 0;
    while(i < testArray.length){
        //code
        ++i;
    }
}

function five() {
    var i = 0;
    var k = testArray.length;
    while(i < k){
        //code
        ++i;
    }
}

function fiveb() {
    var k = testArray.length;
    while(--k){
        //code
    }
}

function six () {

    var j = testArray.length - 1
    for (; j >= 0; --j) {
        //code
    }

}


function perfIt(fn) {
    const SAMPLE = 1000000;
    var average = 0;
    var t0 = undefined;
    var t1 = undefined;
    var i = 0;

    while(i < SAMPLE){
        t0 = performance.now();
        fn();
        t1 = performance.now();
        average += (t1 - t0);
        ++i;
    }

    console.log("Call to " + fn.name + " took " + (average / SAMPLE) + " milliseconds.")
}


//perfIt(one);
//perfIt(oneb);
//perfIt(two);
//perfIt(twob);
//perfIt(three);
//perfIt(threeb);
//perfIt(four);
//perfIt(fourb);
//perfIt(fivea);
//perfIt(five);
//perfIt(fiveb);
//perfIt(six);
//
//perfIt(one);

console.log("Stop");

function resA() {
    return (10 * 5.11133);
}
function resB() {
    return (10 * 5.11133) | 0;
}
function resC() {
    return ~~(10 * 5.11133);
}
function resD() {
    return Math.floor(10 * 5.11133);
}

perfIt(one);
perfIt(resA);
perfIt(resB);
perfIt(resC);
perfIt(resD);
perfIt(one);
