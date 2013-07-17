#include <v8.h>
#include <node.h>

#include "reader.h"

using v8::Handle;
using v8::Object;

void init (Handle<Object> module){
	Reader::Init (module);
}

NODE_MODULE (reader, init)