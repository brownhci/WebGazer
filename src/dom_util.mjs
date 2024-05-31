// @ts-check
// helper functions

/**
 * Provides requestAnimationFrame in a cross browser way.
 */
window.requestAnimationFrame = window.requestAnimationFrame ||
    // @ts-ignore
    window.webkitRequestAnimationFrame ||
    // @ts-ignore
    window.mozRequestAnimationFrame ||
    // @ts-ignore
    window.oRequestAnimationFrame ||
    // @ts-ignore
    window.msRequestAnimationFrame ||
    /**
     * @callback
     * @param {FrameRequestCallback} callback
     */
    (callback => window.setTimeout(callback, 1000 / 60))

/**
 * Provides cancelRequestAnimationFrame in a cross browser way.
 */
window.cancelAnimationFrame = window.cancelAnimationFrame ||
    // @ts-ignore
    window.webkitCancelRequestAnimationFrame ||
    // @ts-ignore
    window.mozCancelRequestAnimationFrame ||
    // @ts-ignore
    window.oCancelRequestAnimationFrame ||
    // @ts-ignore
    window.msCancelRequestAnimationFrame ||
    window.clearTimeout
