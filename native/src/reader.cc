#include <node.h>
#include <v8.h>
#include <ctype.h>

#include "reader.h"

using v8::Arguments;
using v8::Function;
using v8::FunctionTemplate;
using v8::Handle;
using v8::HandleScope;
using v8::Local;
using v8::Number;
using v8::Object;
using v8::Persistent;
using v8::String;
using v8::Undefined;
using v8::Value;

//Code points: https://en.wikipedia.org/wiki/UTF-8
unsigned char Reader::masks[5] = { 192, 224, 240, 248, 252 };

Reader::Reader (options_t* options, Persistent<Object> countersObject){
	this->options = options;
	counters = new counters_t ();
	this->countersObject = countersObject;
	meta = 0;
}

Reader::~Reader (){}

void Reader::Init (Handle<Object> module){
	Local<FunctionTemplate> tpl = FunctionTemplate::New (New);
	
	tpl->InstanceTemplate ()->SetInternalFieldCount (2);
	NODE_SET_PROTOTYPE_METHOD (tpl, "chunk", Chunk);
	NODE_SET_PROTOTYPE_METHOD (tpl, "end", End);
	
	module->Set(String::NewSymbol ("Reader"),
			Persistent<Function>::New (tpl->GetFunction ()));
}

Handle<Value> Reader::New (const Arguments& args){
	options_t* options = new options_t;
	
	Local<Object> optionsObject = Local<Object>::Cast (args[0]);
	
	options->bytes =
			optionsObject->Get (String::NewSymbol ("bytes"))->BooleanValue ();
	options->chars =
			optionsObject->Get (String::NewSymbol ("chars"))->BooleanValue ();
	options->words =
			optionsObject->Get (String::NewSymbol ("words"))->BooleanValue ();
	options->lines =
			optionsObject->Get (String::NewSymbol ("lines"))->BooleanValue ();

	Reader* r = new Reader (options,
			Persistent<Object>::New (Local<Object>::Cast (args[1])));
	r->Wrap (args.This());
	
	return args.This ();
}

Handle<Value> Reader::Chunk (const Arguments& args){
	HandleScope scope;
	
	Reader* r = ObjectWrap::Unwrap<Reader>(args.This ());
	
	if (!r->meta){
		r->meta = new meta_t ();
		if (r->options->lines) r->counters->lines++;
	}
	
	Local<String> str = Local<String>::Cast (args[0]);
	
	if (r->options->chars) r->counters->chars += str->Length ();
	
	if (r->options->words || r->options->lines){
		String::Utf8Value s (str->ToString ());
		bool lineBreak = false;
		unsigned char c;
		int utf8Bytes = 0;
		
		for (uint64_t i=0; (c = (*s)[i]) != 0; i++){
			//Ignore utf8 check for one byte chars
			if (c > 127){
				if (utf8Bytes){
					utf8Bytes--;
					continue;
				}
				
				//Check whether is a utf8 multibyte char
				for (int i=4; i>=0; i--){
					if ((c & r->masks[i]) == r->masks[i]){
						utf8Bytes = i + 1;
						break;
					}
				}
				
				if (utf8Bytes){
					r->meta->lineLength++;
					r->meta->word = true;
				}
				
				continue;
			}
			
			if (r->options->lines && c == '\n'){
				r->counters->lines++;
				if (!lineBreak && r->meta->lineLength > r->counters->maxLineLength){
					r->counters->maxLineLength = r->meta->lineLength;
				}
				r->meta->lineLength = 0;
				lineBreak = false;
				r->word ();
			}else if (r->options->lines && (c == '\r' || c == '\f' || c == 'v')){
				r->word ();
				lineBreak = true;
				if (r->meta->lineLength > r->counters->maxLineLength){
					r->counters->maxLineLength = r->meta->lineLength;
				}
			}else if (r->options->words && (c == '\t' || c == ' ')){
				r->meta->lineLength++;
				r->word ();
			}else if (isprint (c)){
				//Printable characters
				r->meta->lineLength++;
				r->meta->word = true;
			}
		}
	}
	
	return scope.Close (Undefined ());
}

Handle<Value> Reader::End (const Arguments& args){
	HandleScope scope;
	
	Reader* r = ObjectWrap::Unwrap<Reader>(args.This ());
	
	if (r->meta){
		if (r->options->lines && r->meta->lineLength > r->counters->maxLineLength){
			r->counters->maxLineLength = r->meta->lineLength;
		}
		r->word ();
	}
	
	Local<String> bytesSymbol = String::NewSymbol ("bytes");
	Local<String> charsSymbol = String::NewSymbol ("chars");
	Local<String> wordsSymbol = String::NewSymbol ("words");
	Local<String> linesSymbol = String::NewSymbol ("lines");
	Local<String> maxLineLengthSymbol = String::NewSymbol ("maxLineLength");
	
	if (r->options->bytes){
		r->counters->bytes += r->countersObject->Get (bytesSymbol)->NumberValue ();
		r->countersObject->Set (bytesSymbol, Number::New (r->counters->bytes));
	}
	if (r->options->chars){
		r->counters->chars += r->countersObject->Get (charsSymbol)->NumberValue ();
		r->countersObject->Set (charsSymbol, Number::New (r->counters->chars));
	}
	if (r->options->words){
		r->counters->words += r->countersObject->Get (wordsSymbol)->NumberValue ();
		r->countersObject->Set (wordsSymbol, Number::New (r->counters->words));
	}
	if (r->options->lines){
		r->counters->lines += r->countersObject->Get (linesSymbol)->NumberValue ();
		r->countersObject->Set (linesSymbol, Number::New (r->counters->lines));
		
		r->counters->maxLineLength +=
				r->countersObject->Get (maxLineLengthSymbol)->NumberValue ();
		r->countersObject->Set (maxLineLengthSymbol,
				Number::New (r->counters->maxLineLength));
	}
	
	r->countersObject.Dispose ();
	delete r->options;
	delete r->counters;
	delete r->meta;
	
	return scope.Close (Undefined ());
}

void Reader::word (){
	if (options->words && meta->word){
		meta->word = false;
		counters->words++;
	}
}