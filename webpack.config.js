const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const entries = fs.readdirSync('src')
    .filter(x => x.slice(-3) === '.js' && ['spec'].indexOf(x) === -1)
    .map(x => `./${x.slice(0, -3)}`)
    .reduce((obj, x) => {
        obj[x] = [`./src/${x.slice(2)}`];
        return obj;
    }, {});

const externals = fs.readdirSync('node_modules').concat(Object.keys(entries))
    .filter(x => ['.bin'].indexOf(x) === -1)
    .reduce((obj, mod) => {
        obj[mod] = 'commonjs ' + mod;
        return obj;
    }, {});

const plugins = [];

const config = {
    target: 'node',
    entry: entries,
    devtool: 'source-map',
    output: {
        path: './',
        filename: '[name].js',
        library: '[name]',
        libraryTarget: 'umd',
        umdNamedDefine: true
    },
    externals: externals,
    module: {
        rules: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js']
    },
    plugins: plugins
};

module.exports = config;
