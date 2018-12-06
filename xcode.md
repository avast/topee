Xcode project setup
====

The general project structure follows the regular [Apple guidlines](https://developer.apple.com/documentation/safariservices/safari_app_extensions).
The easiest way to consume Topee is via Carthage,
possibly as well as the cross-browser extension scripts.
The only thing that's needed is to override _TopeeSafariExtensionHandler.setupBridge(...)_,
optionally providing extra parameters.

```swift
import Foundation
import SafariServices
import Topee

class SafariExtensionHandler: TopeeSafariExtensionHandler {
    override open func setupBridge() {
        bridge.setup(webViewURL: "http://optional_url_that/servers/as/origin/on/XMLHttpRRequests")
    }
}
```

Add JavaScript files as App Extension resources
====

Here is an example how to bundle various types of scripts,
Topee Chrome API emulation for background, content and iframes
and project background scripts, content scripts injected
at _document_start_ or _document_end_ and web accessible resources.

This can be done by a script step at the App Extension Build Phases.
Start with creating symlinks in your extension resources directory
pointing to the locations of the extension scripts (we will name it `Ext` here)
and the Topee framework (`Topee`).
This would typicallly be where Carthage updates them.
Let's have variables pointing to the Resources directory and the resulting
build path:

```
TARGET_RESOURCES="${SRCROOT}/AppExtension/Resources"
BUNDLE_RESOURCES="${BUILT_PRODUCTS_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}"
```

Content scripts injected at _document_start_ would go simply as

```
rsync -rktv "${TARGET_RESOURCES}/Ext/document_start/" "${BUNDLE_RESOURCES}"
```

A content script injected at _document_end_ is proprocessed:

```
"${TARGET_RESOURCES}/Topee/run-at-document-end.sh" "${TARGET_RESOURCES}/Ext/document_end/content.js" > "${BUNDLE_RESOURCES}/content.js"
```

Topee Chrome API emulation for content scripts and resources would be coppied as

```
cp "${TARGET_RESOURCES}/Topee/topee-content.js" "${BUNDLE_RESOURCES}"
cp "${TARGET_RESOURCES}/Topee/topee-iframe-resources.js" "${BUNDLE_RESOURCES}/web_accessible_resources"
```

Background scripts are exctly the same as content scripts:

```
rsync -rktv "${TARGET_RESOURCES}/Ext/background/" "${BUNDLE_RESOURCES}"
```

The Topee background Chrome API emulation is directly in the Topee bundle and does not need to be coppied.

Reference your files in Info.plist
----

Content scripts, including topee-content.js, are referenced normally, in `NSExtension / SFSafariContentScript`.

Background script, excluding topee-background.js, are referenced in `NSExtension / TopeeSafariBackgroundScript`:
```
<key>TopeeSafariBackgroundScript</key>
<array>
  <dict>
    <key>Script</key>
    <string>background.js</string>
  </dict>
</array>
```

It is also possible to map your default toolbar icons, that would often be color 32x32 px,
to black and white 16x16 px Safari-specific ones:
```
<key>TopeeSafariToolbarIcons</key>
<dict>
	<key>img/icon32x32.png</key>
	<string>img/icon16x61bw.png</string>
</dict>
```
Then, a call of `chrome.browserAction.setIcon({ path: { "32": "img/icon32x32.png" } })` would display `"img/icon16x61bw.png"` instead.
