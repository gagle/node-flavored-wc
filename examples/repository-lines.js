"use strict";

var wc = require ("flavored-wc");

var settings = {
	lines: true,
	ignore: [".git", ".gitignore", ".npmignore", "node_modules"]
};

wc (".", settings, function (error, counters){
	if (error) return console.error (error);
	console.log (counters);
});