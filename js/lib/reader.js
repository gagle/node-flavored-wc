"use strict";

module.exports.create = function (options, counters){
	return new Reader (options, counters);
};

var Reader = function (options, counters){
	this._options = options;
	this._counters = counters;
	this._meta = null;
};

Reader.prototype._word = function (){
	if (this._options.words && this._meta.word){
		this._meta.word = false;
		this._counters.words++;
	}
};

Reader.prototype.chunk = function (str){
	if (!this._meta){
		this._meta = {
			lineLength: 0
		};
		if (this._options.lines) this._counters.lines++;
	}
	
	if (this._options.chars) this._counters.chars += str.length;
	
	if (this._options.words || this._options.lines){
		var lineBreak = false;
		var n;
		
		for (var i=0, len=str.length; i<len; i++){
			n = str[i].charCodeAt (0);
			
			//code 10: \n
			//code 13: \r
			//code 12: \f
			//code 11: \v
			//code 9: \t
			//code 32: space
			if (this._options.lines && n === 10){
				this._counters.lines++;
				if (!lineBreak && this._meta.lineLength > this._counters.maxLineLength){
					this._counters.maxLineLength = this._meta.lineLength;
				}
				this._meta.lineLength = 0;
				lineBreak = false;
				this._word ();
			}else if (this._options.lines &&
					(n === 13 || n === 12 || n === 11)){
				this._word ();
				lineBreak = true;
				if (this._meta.lineLength > this._counters.maxLineLength){
					this._counters.maxLineLength = this._meta.lineLength;
				}
			}else if (this._options.words && (n === 9 || n === 32)){
				this._meta.lineLength++;
				this._word ();
			}else{
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
	if (this._options.lines &&
			this._meta.lineLength > this._counters.maxLineLength){
		this._counters.maxLineLength = this._meta.lineLength;
	}
	this._word ();
};