wc
==

_Node.js project_

#### wc command ported to Node.js with additional features ####

Version: 0.0.2

The Unix wc command counts the number of bytes, characters, words and lines in a file but it lacks some useful features like walking a directory recursively and ignore paths. Also it has some issues with UTF8 encoded files.

#### Installation ####

```
npm install flavored-wc
```

```
npm install flavored-wc-native
```

A native version is also available. I made it just for fun but, if you can, install it. The speed improvement depends on some factors: file size, files quantity, file content and the information to retrieve. You must also know that the JavaScript ⇄ C++ brige is pretty slow.

In general it's ok to say that the native implementation is faster than the javascript one. I've tested both implementations with a 10MB file and the native is twice as fast. The directory of this repository has been also tested with the following code and the native is four times faster.

```javascript
//wc.js
var wc = require ("flavored-wc-native");
wc (".", function (){});
```

```
$ time node wc.js
```

#### Functions ####

- [wc(path[, options], callback) : undefined](#wc)

---

<a name="wc"></a>
__wc(path[, options], callback) : undefined__

The `path` can be an String or an Array of Strings. These Strings can contain a valid path or text data.

If the `options` object is not provided all the information (bytes, chars, words and lines) will be counted.

Options:

- bytes - _Boolean_  
	Set to true to count the number of bytes. Default is false.
- chars - _Boolean_  
	Set to true to count the number of characters. Default is false. UTF8 multibyte characters are also allowed.
- words - _Boolean_  
	Set to true to count the number of words. Default is false. A word is any consecutive sequence of characters separated by \r, \n, \v, \f, \t or space.
- lines - _Boolean_  
	Set to true to count the number of lines. Default is false.
- data - _Boolean_  
	If `path` contains text data, set this option to true. Default is false.
- ignore - _String_ | _Array_ | _Function_  
	Paths to ignore. It can also be a function. The function is executed for each file and directory. It receives the absolute path, the directory name, the name of the entry and a callback. The callback expects two parameters, a possible error and a boolean. If the boolean is true the path will be read, otherwise it will be ignored. The function acts like a filter, if you return false the path won't pass the filter.

	```javascript
	var wc = require ("flavored-wc");
	
	var options = {
		ignore: function (p, dirname, basename, cb){
			cb (null, basename !== "ignored_path");
		},
		bytes: ...,
		...
	};
	
	wc (".", options, function (error, counters){
		...
	});
	```