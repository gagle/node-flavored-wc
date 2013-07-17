"use strict";

//TODO, añadir control de error emfile
//https://github.com/isaacs/node-graceful-fs/blob/master/graceful-fs.js

var path = require ("path");
var fs = require ("fs");
var reader = require ("./reader");

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
			fs.createReadStream (p, { encoding: "utf8" })
					.on ("error", function (error){
						if (error.code === "EAGAIN"){
							if (!--readMaxTries) return fail (error);
							return read ();
						}
						
						if (error.code !== "EISDIR") return fail (error);
						
						counters.directories++;
						
						fs.readdir (p, function (error, entries){
							if (error) return fail (error);
							
							var remaining = entries.length;
							if (!remaining) return cb ();
							
							var finish = function (){
								if (!--remaining) cb ();
							};
							
							if (settings.ignoreIsFunction){
								entries.forEach (function (entry){
									var pa = p + path.sep + entry;
									settings.ignoreIsFunction (pa, p, entry,
											function (error, exec){
												if (error) return fail (error);
												if (!exec) return finish ();
												walk (entry, finish);
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
					})
					.on ("readable", function (){
						r.chunk (this.read ());
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
	
	if (!Array.isArray (p)){
		p = [p];
	}
	
	if (!settings.data){
		settings.ignoreIsFunction = true;
		settings.ignore = settings.ignore || [];
		
		if (typeof settings.ignore !== "function"){
			settings.ignoreIsFunction = false;
			
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
	
	if (settings.ignoreIsFunction){
		p.forEach (function (p){
			p = path.normalize (p);
			settings.ignore (p, path.dirname (p), path.basename (p),
					function (error, exec){
						if (error) return finish (error);
						if (!exec) return;
						count (p, settings, counters, finish);
					});
		});
	}else{
		p.forEach (function (p){
			p = path.resolve (p);
			if (isIgnored (settings.ignore, p)) return finish ();
			count (p, settings, counters, finish);
		});
	}
};