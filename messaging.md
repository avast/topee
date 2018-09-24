Since Safari App Extensions don't run JavaScript as a background script (they can run Swift),
the background script runs in a hidden WebView and a Swift layer in Topee passes the messages
between content scrips in pages and a background script in the WebView.

You may also want to display contents from the extension resources.
If those resources are HTML documents in iframes, Safari does not provide
any messaging except a standard `window.postMessage`. Topee creates a secure AES-encrypted channel
between the iframe and its parent document, that serves as a bridge to the background script.

The full message flow from a request originating in an iframe to the background script
and the iframe receiving a response back is depicted at the figure below.

![documentation/messages.svg](https://raw.github.com/avast/topee/master/documentation/messages.svg?sanitize=true)
