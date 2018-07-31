//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices

// MARK: -

protocol SafariExtensionBridgeType {
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
}

// MARK: -

class SafariExtensionBridge: SafariExtensionBridgeType {

    // MARK: - Public Class Members
    
    static let shared: SafariExtensionBridge = SafariExtensionBridge()

    // MARK: - Private Members

    private var pages: [UInt64: SFSafariPage] = [:]

    // MARK: - SafariExtensionBridgeType

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
