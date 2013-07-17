"use strict";

module.exports.create = function (settings, counters){
	return new Reader (settings, counters);
};

var Reader = function (settings, counters){
	this._settings = settings;
	this._counters = counters;
	this._meta = null;
};

Reader.prototype._word = function (){
	if (this._settings.words && this._meta.word){
		this._meta.word = false;
		this._counters.words++;
	}
};

Reader.prototype.chunk = function (str){
	if (!this._meta){
		this._meta = {
			lineLength: 0
		};
		this._counters.lines++;
	}
	
	if (this._settings.bytes) this._counters.bytes += Buffer.byteLength (str);
	if (this._settings.chars) this._counters.chars += str.length;
	
	if (this._settings.words || this._settings.lines){
		var lineBreak = false;
		var c;
		var n;
		
		for (var i=0, len=str.length; i<len; i++){
			c = str[i];
			
			if (this._settings.lines && c === "\n"){
				this._counters.lines++;
				if (!lineBreak && this._meta.lineLength > this._counters.maxLineLength){
					this._counters.maxLineLength = this._meta.lineLength;
				}
				this._meta.lineLength = 0;
				lineBreak = false;
				this._word ();
			}else if (this._settings.lines &&
					(c === "\r" || c === "\f" || c === "\v")){
				this._word ();
				lineBreak = true;
				if (this._meta.lineLength > this._counters.maxLineLength){
					this._counters.maxLineLength = this._meta.lineLength;
				}
			}else if (this._settings.words && (c === "\t" || c === " ")){
				this._meta.lineLength++;
				this._word ();
			}else{
				n = c.charCodeAt (0);
				//Printable characters
				if (n > 31 && n != 127){
					this._meta.lineLength++;
					this._meta.word = true;
				}
			}
		}
	}
};

Reader.prototype.end = function (){
	//Empty file
	if (!this._meta) return;
	if (this._settings.lines &&
			this._meta.lineLength > this._counters.maxLineLength){
		this._counters.maxLineLength = this._meta.lineLength;
	}
	this._word ();
};