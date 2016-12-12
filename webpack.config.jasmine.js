/**
 * Created by keyvan on 8/31/16.
 */

const webpack = require('webpack');
const path = require('path');
const fs = require('file-system');

const mods = {};
fs.readdirSync('node_modules')
    .filter(x => ['.bin'].indexOf(x) === -1)
    .forEach(mod => {
        mods[mod] = 'commonjs ' + mod;
    });

const plugins = [];

const config = {
    target: 'node',
    entry: './src/spec/index.coffee',
    devtool: 'source-map',
    output: {
        path: './spec',
        filename: 'all.spec.js'
    },
    externals: mods,
    module: {
        rules: [
            { test: /\.coffee$/, loader: 'coffee-loader' }
        ]
    },
    resolve: {
        extensions: ['.js', '.coffee']
    },
    plugins: plugins
};

module.exports = config;
