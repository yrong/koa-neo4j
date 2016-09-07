/**
 * Created by keyvan on 8/31/16.
 */

var webpack = require('webpack');
var path = require('path');
var fs = require("file-system");

var mods = {};
fs.readdirSync("node_modules")
    .filter(x => [".bin"].indexOf(x) === -1)
    .forEach(mod => {
        mods[mod] = "commonjs " + mod;
    });

var plugins = [];

var config = {
    target: "node",
    entry: './src/spec/index.coffee',
    devtool: 'source-map',
    output: {
        path: './spec',
        filename: 'all.spec.js'
    },
    externals: mods,
    module: {
        loaders: [
            { test: /\.coffee$/, loader: "coffee" }
        ]
    },
    resolveLoader: {
        root: path.join(__dirname, 'node_modules')
    },
    resolve: {
        root: path.resolve('./src'),
        extensions: ['', '.js', '.coffee']
    },
    plugins: plugins
};

module.exports = config;
