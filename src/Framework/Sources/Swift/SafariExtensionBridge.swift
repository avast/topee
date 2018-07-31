//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import WebKit

// MARK: -

protocol SafariExtensionBridgeType {
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
}

// MARK: -

class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {

    // MARK: - Public Class Members

    static let shared: SafariExtensionBridge = SafariExtensionBridge()

    // MARK: - Private Members

    private var pages: [UInt64: SFSafariPage] = [:]
    private let messageHandlerName: String = "sendResponse"
    private let backgroundScriptName: String = "background"
    private let webViewURL: String = "about:blank"
    private var webView: WKWebView!

    // MARK: - Initializers

    override init() {
        super.init()
        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            let script = WKUserScript(fileName: backgroundScriptName, injectionTime: .atDocumentEnd)
            let contentController: WKUserContentController = WKUserContentController()
            contentController.addUserScript(script)
            contentController.add(self, name: messageHandlerName)
            webConfiguration.userContentController = contentController
            let webView = WKWebView(frame: .zero, configuration: webConfiguration)
            webView.load(string: webViewURL)
            return webView
        }()
    }

    // MARK: - SafariExtensionBridgeType

    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        NSLog("#appex(content): message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
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
                if let payload = userInfo?["payload"] as? String {
                    // TODO: It would be nice if we didn't have to
                    // replicate the message structure inside the
                    // payload. Instead we could try to encode
                    // the userInfo into a JSON object at the swift level.
                    // e.g: https://stackoverflow.com/questions/48297263/how-to-use-any-in-codable-type
                    invokeMethod(payload: payload)
                }
            }
        }
        NSLog("#appex(content): pages: { count: \(pages.count), tabIds: \(pages.keys)}")
    }

    // MARK: - Private API

    private func invokeMethod(payload: String) {
        webView.evaluateJavaScript("manageRequest('\(payload)')"){ result, error in
            guard error == nil else {
                NSLog("Received JS error: \(error! as NSError)")
                return
            }
            if let result = result {
                NSLog("Received JS result: \(result)")
            }
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        NSLog("#appex(background): { 'name': \(message.name), 'body': \(message.body) }")

        guard message.name == messageHandlerName else { return }
        guard let userInfo = message.body as? [String: Any] else { return }
        guard let tabId = userInfo["tabId"] as? UInt64 else { return }
        guard let page = pages[tabId] else { return }
        
        page.dispatchMessageToScript(withName: Message.Content.Response.response.rawValue, userInfo: userInfo)
    }
}
