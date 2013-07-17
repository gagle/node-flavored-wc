"use strict";

var assert = require ("assert");

var wc = require ("../lib");

wc (["f", "empty"], function (error, counters){
	assert.ifError (error);
	
	assert.strictEqual (counters.files, 2);
	assert.strictEqual (counters.directories, 0);
	assert.strictEqual (counters.bytes, 31);
	assert.strictEqual (counters.chars, 29);
	assert.strictEqual (counters.words, 3);
	assert.strictEqual (counters.lines, 5);
	assert.strictEqual (counters.maxLineLength, 7);
});