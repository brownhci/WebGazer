/**
 * Created by Tristan on 16/11/2016.
 */

/**
 * Write statistics in debug paragraph panel
 * @param {HTMLElement} para - The <p> tag where write data
 * @param {Object} stats - The stats data to output
 */
// function debugBoxWrite(para, stats) {
//     var str = '';
//     for (var key in stats) {
//         str += key + ': ' + stats[key] + '\n';
//     }
//     para.innerText = str;
// }

/**
 * Constructor of DebugBox object,
 * it insert an paragraph inside a div to the body, in view to display debug data
 * @param {Number} interval - The log interval
 * @constructor
 */
var DebugBox = function ( interval ) {

    this.para = document.createElement( 'p' );
    this.div  = document.createElement( 'div' );
    this.div.appendChild( this.para );
    document.body.appendChild( this.div );

    this.buttons = {};
    this.canvas  = {};
    this.stats   = {};

    var updateInterval = interval || 300;
    (function ( localThis ) {
        setInterval( function () {
            localThis.write( localThis.para, localThis.stats );
        }, updateInterval );
    }( this ));

};

/**
 * Add stat data for log
 * @param {String} key - The data key
 * @param {*} value - The value
 */
DebugBox.prototype.set = function ( key, value ) {

    this.stats[ key ] = value;

};

/**
 * Initialize stats in case where key does not exist, else
 * increment value for key
 * @param {String} key - The key to process
 * @param {Number} incBy - Value to increment for given key (default: 1)
 * @param {Number} init - Initial value in case where key does not exist (default: 0)
 */
DebugBox.prototype.inc = function ( key, incBy, init ) {

    if ( !this.stats[ key ] ) {
        this.stats[ key ] = init || 0;
    }
    this.stats[ key ] += incBy || 1;

};

/**
 * Create a button and register the given function to the button click event
 * @param {String} name - The button name to link
 * @param {Function} func - The onClick callback
 */
DebugBox.prototype.addButton = function ( name, func ) {

    if ( !this.buttons[ name ] ) {
        this.buttons[ name ] = document.createElement( 'button' );
        this.div.appendChild( this.buttons[ name ] );
    }
    var button           = this.buttons[ name ];
    this.buttons[ name ] = button;
    button.addEventListener( 'click', func );
    button.innerText = name;

};

/**
 * Search for a canvas elemenet with name, or create on if not exist.
 * Then send the canvas element as callback parameter.
 * @param {String} name - The canvas name to send/create
 * @param {Function} func - The callback function where send canvas
 */
DebugBox.prototype.show = function ( name, func ) {

    if ( !this.canvas[ name ] ) {
        this.canvas[ name ] = document.createElement( 'canvas' );
        this.div.appendChild( this.canvas[ name ] );
    }
    var canvas = this.canvas[ name ];
    canvas.getContext( '2d' )
          .clearRect( 0, 0, canvas.width, canvas.height );
    func( canvas );

};

DebugBox.prototype.write = function ( para, stats ) {

    var str = '';
    for ( var key in stats ) {
        str += key + ': ' + stats[ key ] + '\n';
    }
    para.innerText = str;
    
};

export { DebugBox };
