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

enum MessageHandler: String {
    case content
    case appex
}

// MARK: -

class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {
    
    // MARK: - Public Class Members
    
    static let shared: SafariExtensionBridge = SafariExtensionBridge()
    
    // MARK: - Private Members
    
    private var pages: [UInt64: SFSafariPage] = [:]
    private let backgroundScriptName: String = "background"
    private let webViewURL: URL = URL(string: "https://topee.local")!
    private var webView: WKWebView!
    private var isBackgroundReady: Bool = false
    // Accumulates messages until the background scripts
    // informs us that is ready
    private var messageQueue: [String] = []
    
    // MARK: - Initializers
    
    override init() {
        super.init()
        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            let script = WKUserScript(fileName: backgroundScriptName,
                                      bundle: Bundle(for: SafariExtensionBridge.self),
                                      injectionTime: .atDocumentEnd)
            let contentController: WKUserContentController = WKUserContentController()
            contentController.addUserScript(script)
            contentController.add(self, name: MessageHandler.content.rawValue)
            contentController.add(self, name: MessageHandler.appex.rawValue)
            webConfiguration.userContentController = contentController
            let webView = WKWebView(frame: .zero, configuration: webConfiguration)
            webView.loadHTMLString("<html><body></body></html>", baseURL: webViewURL)
            return webView
        }()
    }
    
    // MARK: - SafariExtensionBridgeType
    
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        assert(Thread.isMainThread)
        NSLog("#appex(content): message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
        if let message = Message.Content.Request(rawValue: messageName) {
            switch message {
            case .hello:
                if let tabId = userInfo?["tabId"] as? UInt64 {
                    self.pages[tabId] = page
                }
            case .bye:
                if let tabId = userInfo?["tabId"] as? UInt64 {
                    self.pages[tabId] = nil
                }
            case .request:
                // messages may come out of order, so that e.g. request is faster than hello here
                if let tabId = userInfo?["tabId"] as? UInt64 {
                    self.pages[tabId] = page
                }
                if let payload = userInfo?["payload"] as? String {
                    // TODO: It would be nice if we didn't have to
                    // replicate the message structure inside the
                    // payload. Instead we could try to encode
                    // the userInfo into a JSON object at the swift level.
                    // e.g: https://stackoverflow.com/questions/48297263/how-to-use-any-in-codable-type
                    if isBackgroundReady {
                        self.invokeMethod(payload: payload)
                    } else {
                        messageQueue.append(payload)
                    }
                }
            }
        }
        NSLog("#appex(content): pages: { count: \(self.pages.count), tabIds: \(self.pages.keys)}")
    }
    
    // MARK: - Private API
    
    private func invokeMethod(payload: String) {
        assert(Thread.isMainThread)
        webView.evaluateJavaScript("topee.manageRequest('\(payload)')"){ result, error in
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
        assert(Thread.isMainThread)
        NSLog("#appex(background): { 'name': \(message.name), 'body': \(message.body) }")
        guard let handler = MessageHandler(rawValue: message.name) else { return }
        guard let userInfo = message.body as? [String: Any] else { return }
        switch handler {
        case .content:
            guard let tabId = userInfo["tabId"] as? UInt64 else { return }
            guard let page = self.pages[tabId] else { return }
            page.dispatchMessageToScript(withName: Message.Content.Response.response.rawValue, userInfo: userInfo)
        case .appex:
            guard let type = userInfo["type"] as? String else { return }
            if type == "ready" {
                isBackgroundReady = true
                messageQueue.forEach { invokeMethod(payload: $0) }
                messageQueue = []
            }
        }
    }
}