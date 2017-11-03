/**
 * Created by keyvan on 8/31/16.
 */

const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

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
        path: path.resolve(__dirname, './dist/spec'),
        filename: 'all.spec.js'
    },
    externals: mods,
    module: {
        rules: [
            { test: /\.coffee$/, loader: 'coffee-loader' },
            {
                test: /\.jsx?$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.coffee']
    },
    plugins: plugins
};

module.exports = config;
