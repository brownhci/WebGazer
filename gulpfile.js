/****************
 * DEPENDENCIES *
 ****************/
var path = require('path')
var fs = require('fs')
var del = require('del')

var gulp = require('gulp')
var gutil = require('gulp-util')
var gulpif = require('gulp-if')
var runSequence = require('run-sequence');

var jsdoc = require('gulp-jsdoc3')
var plumber = require('gulp-plumber')
var concat = require('gulp-concat')
var rollup = require('rollup')
var uglify = require('rollup-plugin-uglify')
var babel = require('rollup-plugin-babel')

/**
 * API
 */
function checkFiles(files){

    for(var fileIndex = 0, numberOfFiles = files.length ; fileIndex < numberOfFiles ; ++fileIndex){
        checkPath(files[fileIndex])
    }

}

function checkPath(path) {
    var filePath = path;
    fs.stat(filePath, function(err) {
        if(err === null) {
            gutil.log("Concat:", gutil.colors.cyan(filePath));
        } else {
            gutil.log("Error:", gutil.colors.red(err.code), gutil.colors.red(err.message));
        }
    });
}


/***********
 * TESTING *
 ***********/
gulp.task('test', ['unit', 'benchmark'], function(){

    console.log(gutil.env);

});

gulp.task('benchmark', function() {

    gutil.log('No benchmarks yet...');

});

gulp.task('unit', function() {

    gutil.log('No units test yet...');

});

/******************
 * CODE INTEGRITY *
 ******************/
gulp.task('lint', function() {

    gutil.log('No lint here yet...');

});


/*******
 * DOC *
 *******/
gulp.task('doc', function() {

    var config = require('./jsdoc.json')

    return gulp.src(['README.md', './src/**/*.js'], {read: false})
        .pipe(jsdoc(config));
    
});


/****************
 * BUILDING APP *
 ****************/
gulp.task('build', function(callback) {

    runSequence(
        'build-clean',
        'build-dependencies',
        //TODO: ['build-dep-a', 'build-dep-...', 'build-dep-n'], // => ||
        'build-webgazer',
        callback
    );

});

gulp.task('build-dependencies', function() {
    
    var dependencies = [
        'dependencies/js-objectdetect/js/objectdetect.js',
        'dependencies/js-objectdetect/js/objectdetect.eye.js',
        'dependencies/js-objectdetect/js/objectdetect.frontalface_alt.js',

        'dependencies/tracking.js/build/tracking.js',
        'dependencies/tracking.js/build/data/face-min.js',
        'dependencies/tracking.js/build/data/eye-min.js',

        'dependencies/numeric/numeric-1.2.6.js',

        'dependencies/jsfeat/jsfeat.js',
        'dependencies/jsfeat/frontalface.js',
        'dependencies/jsfeat/jsfeat_detect.js',

        'dependencies/clmtrackr/left_eye_filter.js',
        'dependencies/clmtrackr/right_eye_filter.js',
        'dependencies/clmtrackr/nose_filter.js',
        'dependencies/clmtrackr/model_pca_20_svm.js',

        'dependencies/clmtrackr/mosse.js',
        'dependencies/clmtrackr/mossefilter.js',

        'dependencies/clmtrackr/utils.js',
        'dependencies/clmtrackr/clm.js',

        'dependencies/clmtrackr/svmfilter.js',
        'dependencies/clmtrackr/svmfilter_fft.js',
        'dependencies/clmtrackr/svmfilter_webgl.js',

        'dependencies/dependencies_wrapper.js'
    ];

    checkFiles(dependencies)

    return gulp.src(dependencies)
        .pipe(gulpif(gutil.env.production, gutil.noop(), plumber()))
        .pipe(concat('dependencies.js'))
        .pipe(gulp.dest('./build/tmp/'));

});

gulp.task('build-webgazer', function() {

    //TODO check gulp-rollup-plugin !!!
    
    var rollupConfiguration = {}

    if (gutil.env.production) {

        rollupConfiguration = {
            entry:   path.join(__dirname, './src/webgazer.js'),
            plugins: [
                // babel({
                //     presets: [
                //         ["es2015", { "modules": false }]
                //     ],
                //     babelrc: false,
                //     exclude: ['node_modules/**']
                // }),
                uglify()
            ],
            context: 'window'
        }

    } else {

        rollupConfiguration = {
            entry:   path.join(__dirname, './src/webgazer.js'),
            plugins: [
                // babel({
                //     exclude: 'node_modules/**'
                // })
            ],
            context: 'window',
            globals: {
                tracking: "Tracking"
            }
        }

    }

    rollup.rollup(rollupConfiguration).then(function( bundle ) {

        bundle.write({
            format: 'amd',
            sourceMap: 'inline',
            dest:   path.join(__dirname, (gutil.env.production) ? './build/webgazer.amd.min.js' : './build/webgazer.amd.js')
        });

        bundle.write({
            format: 'cjs',
            sourceMap: 'inline',
            dest:   path.join(__dirname, (gutil.env.production) ? './build/webgazer.cjs.min.js' : './build/webgazer.cjs.js')
        });

        bundle.write({
            format: 'es',
            sourceMap: 'inline',
            dest:   path.join(__dirname, (gutil.env.production) ? './build/webgazer.es.min.js' : './build/webgazer.es.js')
        });

        bundle.write({
            format:     'iife',
            sourceMap:  'inline',
            moduleName: 'WebGazer',
            dest:       path.join(__dirname, (gutil.env.production) ? './build/webgazer.iife.min.js' : './build/webgazer.iife.js')
        });

        bundle.write({
            format: 'umd',
            // sourceMap: 'inline',
            moduleName: 'WebGazer',
            dest:   path.join(__dirname, (gutil.env.production) ? './build/webgazer.umd.min.js' : './build/webgazer.umd.js')
        });

    });

});

gulp.task('build-clean', function(){

    // Delete Temp Files & Folders
    return del(['build/tmp/*.js']);

});

/****************
 * DEFAULT TASK *
 ****************/
gulp.task('default', ['']);
