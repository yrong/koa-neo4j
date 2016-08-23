"use strict";

const webpack = require("webpack");
const fs = require("file-system");

let mods = {};
fs.readdirSync("node_modules")
	.filter(x => [".bin"].indexOf(x) === -1)
	.forEach(mod => {
		mods[mod] = "commonjs " + mod;    
	});

module.exports = {
	entry: [
		"babel-polyfill",
		"./server.js"
	],
	output: {
		filename: "bin/index.js"
	},
	externals: mods,
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /(node_modules)/,
				loader: "babel",
				query: {
					presets: ["es2015", "stage-0"]
				}
			},
			{
				test: /\.json$/,
				loader: "json-loader"
			}
		]
	}
};
