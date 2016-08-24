var webpack = require('webpack');
var path = require('path');
var fs = require("file-system");

var mods = {};
fs.readdirSync("node_modules")
    .filter(x => [".bin"].indexOf(x) === -1)
    .forEach(mod => {
        mods[mod] = "commonjs " + mod;
    });

var libraryName = 'koa-neo4j';

var plugins = [];

var config = {
    entry: ['babel-polyfill', './src/entry.js'],
    devtool: 'source-map',
    output: {
        filename: 'lib/' + libraryName + '.js',
        library: libraryName,
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    externals: mods,
    module: {
        loaders: [
            // Support for ES6 modules and the latest ES syntax.
            {
                test: /\.jsx?$/,
                exclude: /(node_modules)/,
                loader: "babel",
                query: {
                    presets: ["es2015", "stage-0"]
                }
            }
        ]
},
    resolveLoader: {
        root: path.join(__dirname, 'node_modules')
    },
    resolve: {
        root: path.resolve('./src'),
        extensions: ['', '.js']
    },
    plugins: plugins
};

module.exports = config;
