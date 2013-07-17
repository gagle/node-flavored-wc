"use strict";

var Reader = require ("../build/Release/reader").Reader;

module.exports.create = function (settings, counters){
	return new Reader (settings, counters);
};

