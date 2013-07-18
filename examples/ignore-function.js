"use strict";

var wc = require ("flavored-wc");
var fs = require ("fs");

var settings = {
	bytes: true,
	chars: true,
	words: true,
	lines: true,
	ignore: function (p, dirname, basename, cb){
		//Random asynchronous function
		fs.stat (p, function (error, stats){
			if (error) return cb (error);
			cb (null, !!(stats.ino%2));
		});
	}
};

wc (".", settings, function (error, counters){
	if (error) return console.error (error);
	console.log (counters);
});