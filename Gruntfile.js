module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	var banner_string =
	'/** WebGazer.js: Scalable Webcam EyeTracking Using User Interactions \n' +
	' * \n' +
	' * Copyright (c) 2016, Brown HCI Group \n' +
	'\n' +
	'* Licensed under GPLv3. Companies with a valuation of less than $10M can use WebGazer.js under LGPLv3. \n' +
	'*/\n\n';

	grunt.initConfig({
		concat: {
			options: {
				banner: banner_string
			},
			dist: {
				nonull: true,
				src: [
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
					'dependencies/clmtrackr/mossefilter.js',
					'src/blinkDetector.js',
					'src/clmGaze.js',
					'src/trackingjsGaze.js',
					'src/js_objectdetectGaze.js',
					'src/linearReg.js',
					'src/mat.js',
					'src/pupil.js',
					'src/regression.js',
					'src/ridgeReg.js',
					'src/ridgeWeightedReg.js',
					'src/ridgeRegThreaded.js',
					'src/util.js',
					'src/webgazer.js',
				],
				dest: './build/webgazer.js',
			}
		},
		uglify: {
			options: {
				banner: banner_string,
				preserveComments: false,
				mangle: false,
				compress: {
					sequences: true,
					dead_code: true,
					conditionals: true,
					booleans: true,
					loops: true,
					unused: false,
					evaluate: true,
					comparisons: true,
					if_return: true,
					join_vars: true,
					properties: true,
				}
			},
			dist: {
				src: ['./build/webgazer.js'],
				dest: 'build/webgazer.min.js'
			}
		}
	});

	// Default task.
	grunt.registerTask('default', [
		'concat',
		'uglify'
	]);

	grunt.registerTask('warn-fail', 'Fail on warning log', function() {
		var log = grunt.log;
		var _warn = log.warn;
		log.warn = function() {
			_warn.apply(log, arguments);
			grunt.fail.warn("Warning log has triggered failure");
		};
	});
};
