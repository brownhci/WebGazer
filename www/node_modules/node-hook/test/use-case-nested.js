var hook = require('../index');
var path = require('path');

function outer_hook(source, filename) {
  console.log('wedge +10 into filename', path.relative(__dirname, filename));
  source = source.replace(/return a \+ b/, "return a + b + 10");
//  console.log(source);
  return source;
}

function inner_hook(source, filename) {
  console.log('wedge *3 into filename', path.relative(__dirname, filename));
  source = source.replace(/return a \+ b/, "return a + b * 3");
//  console.log(source);
  return source;
}

hook.hook('.js', outer_hook); //+ 10
hook.hook('.js', inner_hook); //* 3

var add = require('./dummy');

console.assert(typeof add === 'function', 'got a function');
//NOTE:
//if inner_hook runs after outer_hook, result will be 2 + 3 * 3 + 10 = 21
//if outer_hook runs after inner_hook, result will be 2 + 3 + 10 * 3 = 35
//if only outer_hook runs, result will be 2 + 3 + 10 = 15
//if only inner_hook runs, result will be 2 + 3 * 3 = 11
//since inner_hook is attached last, it should run after outer_hook
console.log("result: ", add(2, 3));
console.assert(add(2, 3) === 21, 'computed correct function');

console.log('nested test: all seems good');

//eof

