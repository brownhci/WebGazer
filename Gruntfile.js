module.exports = function(grunt) {
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-uglify-es');

	var banner_string =
	'/** WebGazer.js: Scalable Webcam EyeTracking Using User Interactions \n' +
	' * \n' +
	' * Copyright (c) 2016-2020, Brown HCI Group \n' +
	'\n' +
	'* Licensed under GPLv3. Companies with a valuation of less than $10M can use WebGazer.js under LGPLv3. \n' +
	'*/\n\n';

	grunt.initConfig({
		concat: {
			options: {
				banner: banner_string,
				sourceMap: true
			},
			dist: {
				nonull: true,
				src: [
					'dependencies/heatmap.js',
					'dependencies/localforage.min.js',
					'dependencies/numeric-1.2.6.min.js',
					'dependencies/tensorflow/tfjs-core.js',
					'dependencies/tensorflow/tfjs-converter.js',
					'dependencies/tensorflow/facemesh.js',
					'dependencies/utils.js',
					'src/facemesh.js',
					'src/mat.js',
					'src/pupil.js',
					'src/regression.js',
					'src/ridgeReg.js',
					'src/blinkDetector.js',
					'src/util.js',
					'src/precision.js',
					'src/webgazer.js'
				],
				dest: './build/webgazer.js'
			}
		},
		copy: {
			dist: {
					files: {
							'./www/webgazer.js': './build/webgazer.js'
					}
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
				},
				sourceMap: function(path) { return path.replace(/.js/,".map")}
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
		'copy',
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
