# node-hook

> Run source transform function on Node require

[![NPM][node-hook-icon]][node-hook-url]

[![Build status][node-hook-ci-image]][node-hook-ci-url]
[![dependencies][node-hook-dependencies-image]][node-hook-dependencies-url]
[![devdependencies][node-hook-devdependencies-image]][node-hook-devdependencies-url]

[![endorse][endorse-image]][endorse-url]

## Install and use

```sh
npm install --save node-hook
```

Before loading desired *.js* files, install hook

```js
var hook = require('node-hook');

function logLoadedFilename(source, filename) {
    return 'console.log("' + filename + '");\n' + source;
}
hook.hook('.js', logLoadedFilename);
require('./dummy');
// prints fulle dummy.js filename, runs dummy.js

hook.unhook('.js'); // removes your own transform
```

**remember:** Nodejs caches compiled modules, so if the transform is not
working, you might need to delete the cached entry in `require.cache`,
then call `require(filename)` again to force reload.

Related: Node require replacement [really-need](https://github.com/bahmutov/really-need).

You can hook several transformers thanks to the [code](https://github.com/bahmutov/node-hook/pull/2) 
submitted by [djulien](https://github.com/djulien)

## Small print

Author: Gleb Bahmutov &copy; 2013

* [Changelog](History.md)
* [@bahmutov](https://twitter.com/bahmutov)
* [glebbahmutov.com](http://glebbahmutov.com)
* [blog](http://glebbahmutov.com/blog/)

License: [MIT](MIT-license.md) - do anything with the code,
but don't blame me if it does not work.

Support: if you find any problems with this module, email / tweet / open issue on Github

[node-hook-icon]: https://nodei.co/npm/node-hook.png?downloads=true
[node-hook-url]: https://npmjs.org/package/node-hook
[node-hook-ci-image]: https://travis-ci.org/bahmutov/node-hook.png?branch=master
[node-hook-ci-url]: https://travis-ci.org/bahmutov/node-hook
[node-hook-dependencies-image]: https://david-dm.org/bahmutov/node-hook.png
[node-hook-dependencies-url]: https://david-dm.org/bahmutov/node-hook
[node-hook-devdependencies-image]: https://david-dm.org/bahmutov/node-hook/dev-status.png
[node-hook-devdependencies-url]: https://david-dm.org/bahmutov/node-hook#info=devDependencies
[endorse-image]: https://api.coderwall.com/bahmutov/endorsecount.png
[endorse-url]: https://coderwall.com/bahmutov
