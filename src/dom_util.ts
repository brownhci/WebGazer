/* eslint-disable @typescript-eslint/ban-ts-comment */
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
    (callback => window.setTimeout(callback, 1000 / 60));

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
    window.clearTimeout;

// We need to export this before the polyfill
export const isBrowserCompatible = !!(navigator.mediaDevices.getUserMedia ||
    // @ts-ignore
    navigator.getUserMedia ||
    // @ts-ignore
    navigator.webkitGetUserMedia ||
    // @ts-ignore
    navigator.mozGetUserMedia);

/**
 * Provides mediaDevices.getUserMedia in a cross browser way.
 */
if (navigator.mediaDevices === undefined) {
  Object.assign(navigator.mediaDevices, {});
}
if (navigator.mediaDevices.getUserMedia === undefined) {
  navigator.mediaDevices.getUserMedia = async function (constraints) {
    // gets the alternative old getUserMedia is possible
    // @ts-ignore
    const getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // set an error message if browser doesn't support getUserMedia
    if (!getUserMedia) {
      return Promise.reject(new Error('Unfortunately, your browser does not support access to the webcam through the getUserMedia API. Try to use the latest version of Google Chrome, Mozilla Firefox, Opera, or Microsoft Edge instead.'));
    }

    // uses navigator.getUserMedia for older browsers
    return new Promise(function (resolve, reject) {
      getUserMedia.call(navigator, constraints, resolve, reject);
    });
  };
}
