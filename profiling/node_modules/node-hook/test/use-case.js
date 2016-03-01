var hook = require('../index');
function request(source, filename) {
  console.log('loading filename', filename);
  return source;
}
hook.hook('.js', request);
var add = require('./dummy');
console.assert(typeof add === 'function', 'got a function');
console.assert(add(2, 3) === 5, 'computed correct function');
console.log('all seems good');
