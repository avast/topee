//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import WebKit

// MARK: -

public protocol SafariExtensionBridgeType {
    var backgroundScripts: [URL]  { get }
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
}

enum MessageHandler: String {
    case content
    case appex
    case log
}

// MARK: -

public class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {
    
    // MARK: - Public Members

    public let backgroundScripts: [URL]

    // MARK: - Private Members
    
    private var pages: [UInt64: SFSafariPage] = [:]
    private let webViewURL: URL = URL(string: "http://topee.local")!
    private var webView: WKWebView!
    private var isBackgroundReady: Bool = false
    // Accumulates messages until the background scripts
    // informs us that is ready
    private var messageQueue: [String] = []

    private static var shared: SafariExtensionBridgeType?

    // MARK: - Initializers

    static func shared(backgroundScripts: [URL]) -> SafariExtensionBridgeType {
        if shared == nil {
            shared = SafariExtensionBridge(backgroundScripts: backgroundScripts)
        } else if backgroundScripts != shared!.backgroundScripts {
            fatalError("You can only inject one set of background scripts")
        }
        return shared!
    }
    
    public init(backgroundScripts: [URL]) {
        self.backgroundScripts = backgroundScripts
        super.init()
        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            let backgroundEndURL = Bundle(for: SafariExtensionBridge.self).url(forResource: "topee-background-end", withExtension: "js")!
            let backgroundURL = Bundle(for: SafariExtensionBridge.self).url(forResource: "topee-background", withExtension: "js")!
            let urls = [backgroundURL] + backgroundScripts + [backgroundEndURL]
            let script = WKUserScript(urls: urls)
            let contentController: WKUserContentController = WKUserContentController()
            contentController.addUserScript(script)
            contentController.add(self, name: MessageHandler.content.rawValue)
            contentController.add(self, name: MessageHandler.appex.rawValue)
            contentController.add(self, name: MessageHandler.log.rawValue)
            webConfiguration.userContentController = contentController
            let webView = WKWebView(frame: .zero, configuration: webConfiguration)
            webView.loadHTMLString("<html><body></body></html>", baseURL: webViewURL)
            return webView
        }()
        DispatchQueue.global().asyncAfter(deadline: .now() + 10) { [unowned self] in
            guard self.isBackgroundReady else {
                NSLog("Backgrounds scripts are taking too long to load. Check files for possible errors")
                return
            }
        }
    }
    
    // MARK: - Public API

    public func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        assert(Thread.isMainThread)
        NSLog("#appex(content): message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
        if let message = Message.Content.Request(rawValue: messageName) {
            // Manages the registry of pages based on the type of message received
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
                // messages may come out of order, so that e.g. request is faster than hello here
                if let tabId = userInfo?["tabId"] as? UInt64 {
                    pages[tabId] = page
                }
            }
            // Relays the messages to the background script
            if let payload = userInfo?["payload"] as? String {
                // TODO: It would be nice if we didn't have to
                // replicate the message structure inside the
                // payload. Instead we could try to encode
                // the userInfo into a JSON object at the swift level.
                // e.g: https://stackoverflow.com/questions/48297263/how-to-use-any-in-codable-type
                if isBackgroundReady {
                    invokeMethod(payload: payload)
                } else {
                    messageQueue.append(payload)
                }
            }
        }
        NSLog("#appex(content): pages: { count: \(self.pages.count), tabIds: \(self.pages.keys)}")
    }
    
    // MARK: - Private API
    
    private func invokeMethod(payload: String) {
        let handler = {
            self.webView.evaluateJavaScript("topee.manageRequest('\(payload.replacingOccurrences(of: "'", with: "\\\'"))')"){ result, error in
                guard error == nil else {
                    NSLog("Received JS error: \(error! as NSError)")
                    return
                }
                if let result = result {
                    NSLog("Received JS result: \(result)")
                }
            }
        }
        
        // Only dispatch to main thread if we aren't already in main.
        if Thread.isMainThread {
            handler()
        } else {
            DispatchQueue.main.async {
                handler()
            }
        }
    }
    
    // MARK: - WKScriptMessageHandler
    
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        assert(Thread.isMainThread)
        if message.name != MessageHandler.log.rawValue {
            // Ignore log messages (they are logged few lines below).
            NSLog("#appex(background): { 'name': \(message.name), 'body': \(message.body) }")
        }

        guard let handler = MessageHandler(rawValue: message.name) else { return }
        guard let userInfo = message.body as? [String: Any] else { return }

        switch handler {
        case .log:
            guard let logLevel = userInfo["level"] as? String else { return }
            guard let message = userInfo["message"] as? String else { return }
            NSLog("background.js [\(logLevel)]: \(message)")
        case .content:
            guard let tabId = userInfo["tabId"] as? UInt64 else { return }
            guard let eventName = userInfo["eventName"] as? String else { return }
            guard let page = self.pages[tabId] else { return }
            page.dispatchMessageToScript(withName: eventName, userInfo: userInfo)
        case .appex:
            guard let typeName = userInfo["type"] as? String else { return }
            guard let type = Message.Background(rawValue: typeName) else { return }
            switch type {
            case .ready:
                isBackgroundReady = true
                messageQueue.forEach { invokeMethod(payload: $0) }
                messageQueue = []
            }
        }
    }
}
