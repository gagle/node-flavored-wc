"use strict";

var wc = require ("flavored-wc");
var fs = require ("fs");

var settings = {
	data: true,
	lines: true
};

fs.readFile ("data-input.js", { encoding: "utf8" }, function (error, data){
	if (error) return console.error (error);
	
	wc (data, settings, function (error, counters){
		if (error) return console.error (error);
		console.log (counters);
	});
});