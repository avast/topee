topee
=====
Google Chrome Extension API for Safari 

[Status: initiating](http://htmlpreview.github.io/?https://github.com/avast/topee/blob/master/api.html)

Integration
====

XCode Project
-------------

- Add `github https://github.com/avast/topee ~> 0.0.0` to your Cartfile
- Link the `Topee` to your Appex target
- Add a resource to your Appex pointing to `Carthage/Build/Mac/Topee.framework/Resources/topee-content.js`
- Make sure the `topee-content.js` script is referenced in the plist of your appex under: `NSExtension > SFSafariContentScript` and appears as the first script in the array
- Add a subclass of `TopeeSafariExtensionHandler` and override the `backgroundScripts` attribute like shown in the snippet below
- Make sure the the plist entry: `NSExtension > NSExtensionPrincipalClass` of your appex plist points to `$(PRODUCT_MODULE_NAME).MySafariExtensionHandler` where `MySafariExtensionHandler` is the name of your `TopeeSafariExtensionHandler` subclass

```swift
import Foundation
import SafariServices
import Topee

class MySafariExtensionHandler: TopeeSafariExtensionHandler {

    override var backgroundScripts: [URL] {
        return [Bundle.main.url(forResource: "demo-background", withExtension: "js")!]
    }
}
```

Extension parts
---------------

Content scripts are listed in Info.plist as [specified](https://developer.apple.com/documentation/safariservices/safari_app_extensions/injecting_a_script_into_a_webpage) for the app extensions.
Make sure to list Topee API (topee-content.js) as the first one.
Content scripts are injected when document starts loading by default. `src/Framework/Scripts/run-at-document-end.sh` preprocesses them at build time to run when document body already exists.

Background scripts are also listed in Info.plist in the same manner as content scripts, under SFSafariBackgroundScript key.
topee-background.js should not be listed, but place it into the Appex resources.

Injected iframes from web accessible resources need to reference topee-iframe-resources.js.

Place browserAction icons into the Appex resources.

How it works
====

To run Chrome-API-based extension, Topee creates an invisible WebView to run background scripts
and `chrome` namespace implementations for background and content scripts, that provides [messaging](messaging.md)
and other functionality.

Tests
====

Once you have the demo extension installed in Safari, you can run unit tests by visiting https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html
