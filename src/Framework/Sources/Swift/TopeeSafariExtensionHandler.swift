//
//  Copyright © 2018 Avast. All rights reserved.
//

import SafariServices

open class TopeeSafariExtensionHandler: SFSafariExtensionHandler {

    static var pages: [UInt64: SFSafariPage] = [:]

    override open func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        NSLog("#appex: message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
        switch messageName {
        case "hello":
            if let tabId = userInfo?["tabId"] as? UInt64 {
                TopeeSafariExtensionHandler.pages[tabId] = page
            }
        case "bye":
            if let tabId = userInfo?["tabId"] as? UInt64 {
                TopeeSafariExtensionHandler.pages[tabId] = nil
            }
        default:
            break
        }
        NSLog("pages: { count: \(TopeeSafariExtensionHandler.pages.count), tabIds: \(TopeeSafariExtensionHandler.pages.keys)}")
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
