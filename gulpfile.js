/****************
 * DEPENDENCIES *
 ****************/
var path    = require('path'),
    gulp    = require('gulp'),
    gutil   = require('gulp-util');

gulp.task('test-util', function() {

    gutil.log('stuff happened', 'Really it did', gutil.colors.magenta('123'));
    gutil.beep();

    gutil.log('env', gutil.env);
    gutil.log('__dirname', __dirname);

});


/***********
 * TESTING *
 ***********/
gulp.task('run-tests', function() {

    gulp.start('benchmarks');
    gulp.start('units');

});

gulp.task('benchmarks', function() {

    gutil.log('No benchmarks yet...');

});

gulp.task('units', function() {

    gutil.log('No units test yet...');

});

/******************
 * CODE INTEGRITY *
 ******************/
gulp.task('check-code', function() {



});


/*******
 * DOC *
 *******/
gulp.task('build-doc', function() {

    var jsdoc = require('gulp-jsdoc3');
    var config = require('./jsdoc.json');
    
    gulp.src(['README.md', './src/**/*.js'], {read: false})
        .pipe(jsdoc(config));
    
});


/****************
 * BUILDING APP *
 ****************/
gulp.task('build-webgazer', function() {

    var rollup  = require('rollup')
    var uglify  = require('rollup-plugin-uglify')
    var babel   = require('rollup-plugin-babel')
    
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
            context: 'window'
        }
        
    }
    
    rollup.rollup(rollupConfiguration).then(function( bundle ) {

        // bundle.write({
        //     format: 'amd',
        //     sourceMap: 'inline',
        //     dest:   "assets/javascript/nodix/build/nodix.amd.js"
        // });
        //
        // bundle.write({
        //     format: 'cjs',
        //     sourceMap: 'inline',
        //     dest:   "assets/javascript/nodix/build/nodix.cjs.js"
        // });
        //
        // bundle.write({
        //     format: 'es',
        //     sourceMap: 'inline',
        //     dest:   "assets/javascript/nodix/build/nodix.es.js"
        // });

        // bundle.write({
        //     format:     'iife',
        //     sourceMap:  'inline',
        //     moduleName: 'WebGazer',
        //     dest:       path.join(__dirname, './build/webgazer.iife.js')
        // });

        bundle.write({
            format: 'umd',
            // sourceMap: 'inline',
            moduleName: 'WebGazer',
            dest:   path.join(__dirname, (gutil.env.production) ? './build/webgazer.umd.min.js' : './build/webgazer.umd.js')
        });

    });

});

gulp.task('build-dependencies', function() {

    console.log((gutil.env.production) ? 'Building dependencies.min.js...' : 'Building dependencies.js...')

    var plumber = require('gulp-plumber')
    var concat  = require('gulp-concat')
    var gulpif  = require('gulp-if')

    gulp.src([
        'dependencies/js-objectdetect/js/objectdetect.js',
        'dependencies/js-objectdetect/js/objectdetect.eye.js  ',
        'dependencies/js-objectdetect/js/objectdetect.frontalface_alt.js  ',
        'dependencies/tracking.js/build/tracking.js',
        'dependencies/tracking.js/build/data/face-min.js',
        'dependencies/tracking.js/build/data/eye-min.js',
        'dependencies/clmtrackr/utils.js',
        'dependencies/numeric-1.2.6.min.js',
        'dependencies/clmtrackr/mosse.js',
        'dependencies/clmtrackr/jsfeat-min.js',
        'dependencies/clmtrackr/frontalface.js',
        'dependencies/clmtrackr/jsfeat_detect.js',
        'dependencies/clmtrackr/left_eye_filter.js',
        'dependencies/clmtrackr/right_eye_filter.js',
        'dependencies/clmtrackr/nose_filter.js',
        'dependencies/clmtrackr/model_pca_20_svm.js',
        'dependencies/clmtrackr/clm.js',
        'dependencies/clmtrackr/svmfilter_webgl.js',
        'dependencies/clmtrackr/svmfilter_fft.js',
        'dependencies/clmtrackr/mossefilter.js'
    ])
        .pipe(gulpif(!gutil.env.production, plumber(), gutil.noop()))
        .pipe(concat('dependencies.js'))
        .pipe(gulp.dest('./dependencies/'));

});


/****************
 * DEFAULT TASK *
 ****************/
gulp.task('default', function() {

    console.log('Running gulp default task...');

    gulp.start('test-util');

});
