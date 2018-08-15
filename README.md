topee
=====
Google Chrome Extension API for Safari 

[Status: initiating](http://htmlpreview.github.io/?https://github.com/avast/topee/blob/master/api.html)

Integration
====

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

Tests
====

Once you have the demo extension installed in Safari, you can run unit tests by visiting https://pamcdn.avast.com/pamcdn/extensions/install/mac/blank.html
