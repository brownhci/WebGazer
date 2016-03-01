
// based on https://github.com/gotwarlost/istanbul/blob/master/lib/hook.js
'use strict'; //catch errors more easily

/*
 Copyright (c) 2012, Yahoo! Inc.  All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

var fs = require('fs'),
  Module = require('module');

//dummy definition in case module is not available:
if (!Module) Module = {};
if (!Module._extensions) { console.log("dummy module def"); Module._extensions = []; }

var originalLoaders = {};
var nestedTransforms = {}; //allow nested transforms

var verify = {
  extension: function (str) {
    if (typeof str !== 'string') {
      throw new Error('expected string extension, have ' + str);
    }
    if (str[0] !== '.') {
      throw new Error('Extension should start with dot, for example .js, have ' + str);
    }
  },
  transform: function (fn) {
    if (typeof fn !== 'function') {
      throw new Error('Transform should be a function, have ' + fn);
    }
  }
};

function hook(extension, transform, options) {
  options = options || {};
  if (typeof extension === 'function' &&
    typeof transform === 'undefined') {
    transform = extension;
    extension = '.js';
  }
  if (options.verbose) {
    console.log('hooking transform', transform.name, 'for', extension);
  }

  verify.extension(extension);
  verify.transform(transform);

  if (!nestedTransforms[extension]) nestedTransforms[extension] = [];
  if (!nestedTransforms[extension].length) //only store the first one -DJ
    originalLoaders[extension] = Module._extensions[extension];
  nestedTransforms[extension].push(transform); //allow nested transforms -DJ


  Module._extensions[extension] = function (module, filename) {
    if (options.verbose) {
      console.log('transforming', filename);
    }
    var source = fs.readFileSync(filename, 'utf8');
    var ret = null; //transform(source, filename);
    nestedTransforms[extension].every(function(nested) //nesting order performs earlier first, later last
    {
//        console.log("IN: " + source);
        ret = nested(source, filename);
//        console.log("OUT: " + ret);
//        if (typeof ret !== 'string') return false; //break
//        if (!options.toString) return false; //stop here
        source = ret + ""; //convert to string and keep going
        return true; //continue
    });
    if (typeof ret === 'string') {
      module._compile(ret, filename);
    } else if (options.verbose) {
      console.error('transforming source from', filename, 'has not returned a string');
    }
  };
  if (options.verbose) {
    console.log('hooked function');
  }
}

function unhook(extension) {
  if (typeof extension === 'undefined') {
    extension = '.js';
  }
  verify.extension(extension);
  nestedTransforms[extension].pop(); //assumes no stack underflow
  if (!nestedTransforms[extension].length) //restore original only once
    Module._extensions[extension] = originalLoaders[extension];
}

module.exports = {
  hook: hook,
  unhook: unhook
};