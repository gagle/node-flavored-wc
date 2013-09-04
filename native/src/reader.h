#ifndef READER_H#define READER_H#include <node.h>
#include <v8.h>

using v8::Arguments;
using v8::Handle;
using v8::Object;
using v8::Persistent;
using v8::Value;

typedef struct{
	uint64_t bytes;
	uint64_t chars;
	uint64_t words;
	uint64_t lines;
	uint64_t maxLineLength;
} counters_t;

typedef struct{
	bool bytes;
	bool chars;
	bool words;
	bool lines;
} options_t;

typedef struct{
	bool word;
	uint64_t lineLength;
} meta_t;class Reader : public node::ObjectWrap{	public:		static void Init (Handle<Object> module);
	
	private:
		Reader (options_t* options, Persistent<Object> countersObject);
		~Reader ();
		
		static Handle<Value> New (const Arguments& args);
		static Handle<Value> Chunk (const Arguments& args);
		static Handle<Value> End (const Arguments& args);
				static unsigned char masks[5];
		options_t* options;
		counters_t* counters;
		meta_t* meta;
		Persistent<Object> countersObject;
		
		void word ();};#endif