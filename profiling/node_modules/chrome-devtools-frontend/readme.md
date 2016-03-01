# Chrome DevTools frontend

This package contains the client-side of the developer tools built into Blink, which is part of Chromium (which is, in turn, distributed as Chrome).

It's not (yet) a proper module, but rather a pure mirror of [what's in the Chromium repo](https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/devtools/front_end/). You're quite welcome to consume it, but unfortunately we're not yet ready to embrace CJS or ES6 modules, so it may require some effort. :)

The version number of this npm package (e.g. `1.0.373466`) refers to the Chromium commit position of latest frontend git commit. It's incremented with every Chromium commit, however this package is updated ~daily.

### More
* [@ChromeDevTools] on Twitter
* Chrome DevTools mailing list: [groups.google.com/forum/google-chrome-developer-tools](https://groups.google.com/forum/#!forum/google-chrome-developer-tools)
* DevTools documentation: [devtools.chrome.com](https://devtools.chrome.com)
* [Debugger protocol docs](https://developer.chrome.com/devtools/docs/debugger-protocol) and [Chrome Debugging Protocol Viewer](http://chromedevtools.github.io/debugger-protocol-viewer/)
  * [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface), recommended lib for interfacing with the debugging protocol
  * [crmux](https://github.com/sidorares/crmux) multiplexes protocol connections

### Development
* Contributing to DevTools: [bit.ly/devtools-contribution-guide](http://bit.ly/devtools-contribution-guide)
* All devtools commits: [View the log], [RSS feed] or [@DevToolsCommits] on Twitter
* [All open DevTools tickets] on crbug.com
* File a new DevTools ticket: [crbug.com/new](https://code.google.com/p/chromium/issues/entry?labels=OS-All,Cr-Platform-DevTools,Type-Bug,Pri-2&status=Assigned&summary=DevTools:%20&comment=)
* Code reviews mailing list: [devtools-reviews@chromium.org]

  [devtools-reviews@chromium.org]: https://groups.google.com/a/chromium.org/forum/#!forum/devtools-reviews
  [RSS feed]: https://feeds.peter.sh/chrome-devtools/
  [View the log]: https://chromium.googlesource.com/chromium/src/third_party/WebKit/Source/devtools/+log/master
  [@ChromeDevTools]: http://twitter.com/ChromeDevTools
  [@DevToolsCommits]: http://twitter.com/DevToolsCommits
  [all open DevTools tickets]: http://goo.gl/N6OH9