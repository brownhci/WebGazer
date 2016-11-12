import babel from 'rollup-plugin-babel';
import uglify from 'rollup-plugin-uglify';

export default {
    entry:      'src/webgazer.js',
    dest:       'build/webgazer.min.js',
    format:     'umd',
    moduleName: 'WebGazer',
    sourceMap:  true,
    plugins: [
        babel({
            presets: [
                ["es2015", { "modules": false }]
            ],
            babelrc: false,
            exclude: ['node_modules/**']
        }),
        uglify()
    ]
};
