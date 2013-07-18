"use strict";

var path = require ("path");
var fs = require ("fs");
var reader = require ("./reader");

var dir = function (p, fail, walk, settings, cb){
	fs.readdir (p, function (error, entries){
		if (error) return fail (error);
		
		var remaining = entries.length;
		if (!remaining) return cb ();
		
		var errors = [];
		
		var finish = function (error){
			if (error) errors = errors.concat (error);
			if (!--remaining) cb (errors.length ? errors : null);
		};
		
		if (settings._ignoreIsFunction){
			entries.forEach (function (entry){
				var pa = p + path.sep + entry;
				settings.ignore (pa, p, entry,
						function (error, exec){
							if (error) return finish (error);
							if (!exec) return finish ();
							walk (pa, finish);
						});
			});
		}else{
			entries.forEach (function (entry){
				entry = p + path.sep + entry;
				if (isIgnored (settings.ignore, entry)) return finish ();
				walk (entry, finish);
			});
		}
	});
};

var count = function (p, settings, counters, cb){
	if (settings.data){
		if (typeof p !== "string"){
			throw new TypeError ("The data to evaluate must be a string");
		}
		
		if (!p) return cb (null, counters);
		var r = reader.create (settings, counters);
		r.chunk (p);
		r.end ();
		
		return cb (null, counters);
	}

	var walk = function (p, cb){
		var fail = function (error){
			errors = errors.concat (error);
			cb ();
		};
		
		var r = reader.create (settings, counters);
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
						dir (p, fail, walk, settings, function (error){
							if (error) return fail (error);
							cb ();
						});
					})
					.on ("readable", function (){
						var buffer = this.read ();
						if (settings.bytes) counters.bytes += buffer.length;
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

var countBytes = function (p, settings, counters, cb){
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
				dir (p, fail, walk, settings, cb);
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

module.exports = function (p, settings, cb){
	if (arguments.length === 2){
		cb = settings;
		settings = {
			bytes: true,
			chars: true,
			words: true,
			lines: true
		};
	}
	
	//Speed improvement if only the bytes must be count
	var cnt = settings.bytes && !settings.chars && !settings.words &&
			!settings.lines && !settings.data ? countBytes : count;
	
	if (!Array.isArray (p)){
		p = [p];
	}
	
	if (!settings.data){
		settings._ignoreIsFunction = true;
		settings.ignore = settings.ignore || [];
		
		if (typeof settings.ignore !== "function"){
			settings._ignoreIsFunction = false;
			
			if (!Array.isArray (settings.ignore)){
				settings.ignore = [settings.ignore];
			}
			
			for (var i=0, ii=settings.ignore.length; i<ii; i++){
				settings.ignore[i] = path.resolve (settings.ignore[i]);
			}
		}
	}
	
	var remaining = p.length;
	if (!remaining) return cb (null, filter ());
	
	var finish = function (error){
		if (error) errors = errors.concat (error);
		
		if (!--remaining){
			delete settings._ignoreIsFunction;
			if (errors.length) return cb (errors, null);
			cb (null, counters);
		}
	};
	
	var errors = [];
	var counters = {};
	
	if (!settings.data){
		counters.files = counters.directories = 0;
	}
	
	if (settings.bytes) counters.bytes = 0;
	if (settings.chars) counters.chars = 0;
	if (settings.words) counters.words = 0;
	if (settings.lines) counters.lines = 0, counters.maxLineLength = 0;
	
	if (settings.data){
		p.forEach (function (p){
			count (p, settings, counters, finish);
		});
		return;
	}
	
	if (settings._ignoreIsFunction){
		p.forEach (function (p){
			p = path.resolve (p);
			settings.ignore (p, path.dirname (p), path.basename (p),
					function (error, exec){
						if (error) return finish (error);
						if (!exec) return finish ();
						cnt (p, settings, counters, finish);
					});
		});
	}else{
		p.forEach (function (p){
			p = path.resolve (p);
			if (isIgnored (settings.ignore, p)) return finish ();
			cnt (p, settings, counters, finish);
		});
	}
};