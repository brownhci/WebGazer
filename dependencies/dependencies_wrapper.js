/**
 * Created by tvalcke on 17/11/2016.
 */

// 'dependencies/js-objectdetect/js/objectdetect.js',
// 'dependencies/js-objectdetect/js/objectdetect.eye.js  ',
// 'dependencies/js-objectdetect/js/objectdetect.frontalface_alt.js  ',
export {objectdetect as ObjectDetect};

// tracker need to be an external dependency of webgazer package
// It can be exported here due to his global location :S weird
// 'dependencies/tracking.js/build/tracking.js',
// 'dependencies/tracking.js/build/data/face.js',
// 'dependencies/tracking.js/build/data/eye.js',
// 'dependencies/tracking.js/build/data/mouth.js',
var _tracking = window.tracking;
export {_tracking as Tracking};

// 'dependencies/numeric/numeric-1.2.6.js',
// var numeric = numeric;
// export {numeric as numeric};
// export {numeric};

// 'dependencies/jsfeat/jsfeat.js',
// 'dependencies/jsfeat/frontalface.js',
// 'dependencies/jsfeat/jsfeat_detect.js',
export {
    jsfeat as JsFeat,
    jsfeat_face as FaceDetector
};

// 'dependencies/clmtrackr/left_eye_filter.js',
// 'dependencies/clmtrackr/right_eye_filter.js',
// 'dependencies/clmtrackr/nose_filter.js',
export {
    left_eye_filter as leftEyeFilter,
    right_eye_filter as rightEyeFilter,
    nose_filter as noseFilter,
};

// 'dependencies/clmtrackr/mossefilter.js',
// 'dependencies/clmtrackr/mosse.js',
export {
    mosseFilterResponses as MosseFilterResponses,
    mosseFilter as MosseFilter,
    FFT as fastFourierTransformation
};

// 'dependencies/clmtrackr/utils.js',
export {
    supports_video as supportsVideo,
    supports_h264_baseline_video as supportsH264BaselineVideo,
    supports_ogg_theora_video as supportsOggTheoraVideo
};

// 'dependencies/clmtrackr/clm.js',
export {clm as ClmTrackr};

// 'dependencies/clmtrackr/model_pca_20_svm.js',
export {pModel as pcaFilter};

// 'dependencies/clmtrackr/svmfilter.js',
// 'dependencies/clmtrackr/svmfilter_fft.js',
// 'dependencies/clmtrackr/svmfilter_webgl.js',
export {
    // svmFilter as SvmFilter,
    // svmFilterWebGL as SvmFilter,
    // svmFilterFFT as SvmFilter
    svmFilter as SvmFilter
};




