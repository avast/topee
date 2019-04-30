Test whether a background script is syntactically correct in an old JavaScript engine
=====================================================================================

A new Safari can be installed to a pretty old MacOS. In that case,
the background script running in WKWebView is limited to the capabilities of the OS WebKit
instead of Safari (unlike content script).

Here are a few ways to check that the language features are recognized correctly.

Setup
-----

`cd` to the tools/test_compat directory

`npm install`

run `./build.sh` <path of your background script> - this creates ./index.js

When you have the old MacOS available
-------------------------------------

Do the Setup step on that machine. Then run

`npm run build` - this will prepare index.js for JavaScriptCore

`npm run test` - this will run index.js prepared in the above step in the JavaScriptCore engine

When the old MacOS is not available
-----------------------------------

You can run the verification in an old node.js,
that does not necessarily 100% match the desired old MacOS engine,
but it is an OK aproximation that should suffice for most cases.

Install Docker.

`npm run docker` makes Docker fetch a node.js image and run ./index.js in it.
