// Main development entrypoint
// This file basically exists purely to set up babel-register for future includes

"use strict";

require("babel-register")({
	presets: ["es2015", "stage-0"]
});

require("babel-polyfill");
require("./lib");
