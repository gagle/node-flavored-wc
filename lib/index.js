"use strict";

var path = require ("path");
var fs = require ("fs");
var reader = require ("./reader");

var dir = function (p, fail, walk, options, cb){
	fs.readdir (p, function (error, entries){
		if (error) return fail (error);
		
		var remaining = entries.length;
		if (!remaining) return cb ();
		
		var errors = [];
		
		var finish = function (error){
			if (error) errors = errors.concat (error);
			if (!--remaining) cb (errors.length ? errors : null);
		};
		
		if (options._ignoreIsFunction){
			entries.forEach (function (entry){
				var pa = p + path.sep + entry;
				options.ignore (pa, p, entry,
						function (error, exec){
							if (error) return finish (error);
							if (!exec) return finish ();
							walk (pa, finish);
						});
			});
		}else{
			entries.forEach (function (entry){
				entry = p + path.sep + entry;
				if (isIgnored (options.ignore, entry)) return finish ();
				walk (entry, finish);
			});
		}
	});
};

var count = function (p, options, counters, cb){
	if (options.data){
		if (typeof p !== "string"){
			throw new TypeError ("The data to evaluate must be a string");
		}
		
		if (!p) return cb (null, counters);
		var r = reader.create (options, counters);
		r.chunk (p);
		r.end ();
		
		return cb (null, counters);
	}

	var walk = function (p, cb){
		var fail = function (error){
			errors = errors.concat (error);
			cb ();
		};
		
		var r = reader.create (options, counters);
		var readMaxTries = 10;
		
		var read = function (){
			fs.createReadStream (p)
					.on ("error", function (error){
						if (error.code === "EAGAIN"){
							if (!--readMaxTries) return fail (error);
							return read ();
						}
						
						if (error.code !== "EISDIR") return fail (error);
						
						counters.directories++;
						dir (p, fail, walk, options, function (error){
							if (error) return fail (error);
							cb ();
						});
					})
					.on ("readable", function (){
						var buffer = this.read ();
						if (options.bytes) counters.bytes += buffer.length;
						r.chunk (buffer.toString ());
					})
					.on ("end", function (){
						counters.files++;
						r.end ();
						cb ();
					});
		};
		
		read ();
	};
	
	var errors = [];
	
	walk (p, function (){
		if (errors.length) return cb (errors, null);
		cb (null, counters);
	});
};

var countBytes = function (p, options, counters, cb){
	var walk = function (p, cb){
		var fail = function (error){
			errors = errors.concat (error);
			cb ();
		};
		
		fs.stat (p, function (error, stats){
			if (error) return fail (error);
			
			if (stats.isFile ()){
				counters.files++;
				counters.bytes += stats.size;
				cb ();
			}else if (stats.isDirectory ()){
				counters.directories++;
				dir (p, fail, walk, options, cb);
			}else{
				cb ();
			}
		});
	};
	
	var errors = [];
	
	walk (p, function (){
		if (errors.length) return cb (errors, null);
		cb (null, counters);
	});
};

var isIgnored = function (ignore, p){
	for (var i=0, ii=ignore.length; i<ii; i++){
		if (p.indexOf (ignore[i]) !== -1) return true;
	}
	return false;
};

module.exports = function (p, options, cb){
	if (arguments.length === 2){
		cb = options;
		options = {
			bytes: true,
			chars: true,
			words: true,
			lines: true
		};
	}
	
	//Speed improvement if only the bytes must be count
	var cnt = options.bytes && !options.chars && !options.words &&
			!options.lines && !options.data ? countBytes : count;
	
	if (!Array.isArray (p)){
		p = [p];
	}
	
	if (!options.data){
		options._ignoreIsFunction = true;
		options.ignore = options.ignore || [];
		
		if (typeof options.ignore !== "function"){
			options._ignoreIsFunction = false;
			
			if (!Array.isArray (options.ignore)){
				options.ignore = [options.ignore];
			}
			
			for (var i=0, ii=options.ignore.length; i<ii; i++){
				options.ignore[i] = path.resolve (options.ignore[i]);
			}
		}
	}
	
	var remaining = p.length;
	if (!remaining) return cb (null, filter ());
	
	var finish = function (error){
		if (error) errors = errors.concat (error);
		
		if (!--remaining){
			delete options._ignoreIsFunction;
			if (errors.length) return cb (errors, null);
			cb (null, counters);
		}
	};
	
	var errors = [];
	var counters = {};
	
	if (!options.data){
		counters.files = counters.directories = 0;
	}
	
	if (options.bytes) counters.bytes = 0;
	if (options.chars) counters.chars = 0;
	if (options.words) counters.words = 0;
	if (options.lines) counters.lines = 0, counters.maxLineLength = 0;
	
	if (options.data){
		p.forEach (function (p){
			count (p, options, counters, finish);
		});
		return;
	}
	
	if (options._ignoreIsFunction){
		p.forEach (function (p){
			p = path.resolve (p);
			options.ignore (p, path.dirname (p), path.basename (p),
					function (error, exec){
						if (error) return finish (error);
						if (!exec) return finish ();
						cnt (p, options, counters, finish);
					});
		});
	}else{
		p.forEach (function (p){
			p = path.resolve (p);
			if (isIgnored (options.ignore, p)) return finish ();
			cnt (p, options, counters, finish);
		});
	}
};