var hook = require('../index');
var transformCalled = false;

gt.module('hooking to js load', {
  setup: function () {
    transformCalled = false;
  }
});

function transform(source, filename) {
  if (typeof source !== 'string') {
    throw new Error('expected source string, got ' + source);
  }
  if (typeof filename !== 'string') {
    throw new Error('expected filename string, got ' + filename);
  }
  transformCalled = true;
  return source;
}

gt.test('basics', function () {
  gt.object(hook, 'returns a function');
  hook.hook('.js', transform, {
    verbose: true
  });
  require('./dummy');
  gt.ok(transformCalled, 'transform function was called');
});