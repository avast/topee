//
//  Copyright © 2018 Avast. All rights reserved.
//

import SafariServices

enum Message {
    enum Content {
        enum Request: String {
            case hello
            case bye
            case request
        }
        enum Response: String {
            case response
        }
    }
    enum Background {
        case empty
    }
}

protocol SafariExtensionBridgeType {
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
}

class SafariExtensionBridge: SafariExtensionBridgeType {

    static let shared: SafariExtensionBridge = SafariExtensionBridge()

    private var pages: [UInt64: SFSafariPage] = [:]

    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        NSLog("#appex: message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
        if let message = Message.Content.Request(rawValue: messageName) {
            switch message {
            case .hello:
                if let tabId = userInfo?["tabId"] as? UInt64 {
                    pages[tabId] = page
                }
            case .bye:
                if let tabId = userInfo?["tabId"] as? UInt64 {
                    pages[tabId] = nil
                }
            case .request:
                if let messageId = userInfo?["messageId"] as? UInt64 {
                    page.dispatchMessageToScript(withName: Message.Content.Response.response.rawValue, userInfo: ["messageId": messageId, "response": "pong"])
                }
            }
        }
        NSLog("#appex: pages: { count: \(pages.count), tabIds: \(pages.keys)}")
    }
}

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
