//
//  Copyright © 2018 Avast. All rights reserved.
//

import SafariServices




open class TopeeSafariExtensionHandler: SFSafariExtensionHandler {

    let bridge = SafariExtensionBridge.shared

    override open func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        bridge.messageReceived(withName: messageName, from: page, userInfo: userInfo)
    }
    
    override open func toolbarItemClicked(in window: SFSafariWindow) {
        // This method will be called when your toolbar item is clicked.
        NSLog("The extension's toolbar item was clicked")
    }
    
    override open func validateToolbarItem(in window: SFSafariWindow, validationHandler: @escaping ((Bool, String) -> Void)) {
        // This is called when Safari's state changed in some way that would require the extension's toolbar item to be validated again.
        validationHandler(true, "")
    }
    
//    override open func popoverViewController() -> SFSafariExtensionViewController {
//        return SafariExtensionViewController.shared
//    }

}
