//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import WebKit

// MARK: -
public struct TopeeExtensionManifest: Equatable {
    public let id: String
    public let version: String
    public let name: String
    
    public init(id: String = "my.extension", version: String = "0.0.1", name: String = "My Extension") {
        self.id = id
        self.version = version
        self.name = name
    }
}

// MARK: -

public protocol SafariExtensionBridgeType {
    func setup(
        backgroundScripts: [URL],
        webViewURL: URL,
        icons: [String: NSImage],
        manifest: TopeeExtensionManifest)
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
    func toolbarItemClicked(in window: SFSafariWindow)
    func toolbarItemNeedsUpdate(in window: SFSafariWindow)
}

// Can't define default values in protocol so we need extension
public extension SafariExtensionBridgeType {
    func setup(
        backgroundScripts: [URL],
        webViewURL: URL = URL(string: "http://topee.local")!,
        icons: [String: NSImage] = [:],
        manifest: TopeeExtensionManifest? = nil)
    {
        setup(
            backgroundScripts: backgroundScripts,
            webViewURL: webViewURL,
            icons: icons,
            manifest: manifest ?? TopeeExtensionManifest()
        )
    }
}

enum MessageHandler: String {
    case content
    case appex
    case log
}

// MARK: -

public class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {

    // MARK: - Public Members

    public static let shared = SafariExtensionBridge()
    
    // MARK: - Private Members

    private var manifest: TopeeExtensionManifest?
    private var backgroundScripts: [URL]?
    private var webViewURL: URL = URL(string: "http://topee.local")!
    private var icons: [String: NSImage] = [:]

    private var pageRegistry = SFSafariPageRegistry()
    private var webView: WKWebView?
    private var isBackgroundReady: Bool = false
    // Accumulates messages until the background scripts
    // informs us that is ready
    private var messageQueue: [String] = []
    private var safariHelper: SFSafariApplicationHelper = SFSafariApplicationHelper()

    // MARK: - Initializers
    
    override init() {
        super.init()
    }
    
    public func setup(
        backgroundScripts: [URL],
        webViewURL: URL,
        icons: [String: NSImage],
        manifest: TopeeExtensionManifest)
    {
        if webView != nil {
            // Setup has been already called, so let's just check if configuration matches.
            if backgroundScripts != self.backgroundScripts {
                fatalError("You can only inject one set of background scripts")
            }
            
            if webViewURL != self.webViewURL {
                fatalError("You can only specify one webViewURL")
            }
            
            if manifest != self.manifest {
                fatalError("You can only specify one manifest")
            }
            
            return
        }

        self.backgroundScripts = backgroundScripts
        self.webViewURL = webViewURL
        self.icons = icons
        self.manifest = manifest

        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            let backgroundEndURL = Bundle(for: SafariExtensionBridge.self).url(forResource: "topee-background-end", withExtension: "js")!
            let backgroundURL = Bundle(for: SafariExtensionBridge.self).url(forResource: "topee-background", withExtension: "js")!
            let scripts = [readFile(backgroundURL), buildManifestScript()]
                + readFiles(backgroundScripts)
                + [readFile(backgroundEndURL)]
            let script = WKUserScript(scripts: scripts)
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

    public func toolbarItemClicked(in window: SFSafariWindow) {
        safariHelper.toolbarItemClicked(in: window)
        self.invokeMethod(payload: [ "eventName": "toolbarItemClicked" ])
    }

    public func toolbarItemNeedsUpdate(in window: SFSafariWindow) {
        safariHelper.toolbarItemNeedsUpdate(in: window)
    }

    public func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        assert(Thread.isMainThread)
        NSLog("#appex(content): message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
        var payload = userInfo?["payload"] as? [String: Any]

        if let message = Message.Content.Request(rawValue: messageName) {
            // Manages the registry of pages based on the type of message received
            switch message {
            case .hello:
                // Messages may come out of order, e.g. request is faster than hello here
                // so let's handle them in same way.
                let tabId = pageRegistry.hello(
                    page: page,
                    tabId: userInfo?["tabId"] as? UInt64,
                    referrer: userInfo?["referrer"] as? String ?? "",
                    historyLength: userInfo?["historyLength"] as! Int64)
                if userInfo?["tabId"] != nil && !(userInfo?["tabId"] is NSNull) {
                    assert(userInfo?["tabId"] as? UInt64 != nil)
                    assert(userInfo?["tabId"] as? UInt64 == tabId)
                }
                payload!["tabId"] = tabId
                dispatchMessageToScript(page: page, withName: "forceTabId", userInfo: ["tabId" : tabId])
            case .bye:
                pageRegistry.bye(
                    page: page,
                    url: userInfo?["url"] as? String ?? "",
                    historyLength: userInfo?["historyLength"] as! Int64
                )
            case .request:
                break
            }

            // Relays the messages to the background script
            if payload != nil {
                invokeMethod(payload: payload)
            }
        }
        NSLog("#appex(content): pages: { count: \(self.pageRegistry.count), tabIds: \(self.pageRegistry.tabIds)}")
    }

    // MARK: - Private API

    private func invokeMethod(payload: String) {
        if !isBackgroundReady {
            messageQueue.append(payload)
            return
        }
        
        func handler() {
            self.webView!.evaluateJavaScript("topee.manageRequest(\(payload))"){ result, error in
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

    private func invokeMethod(payload: [String: Any]?) {
        do {
            invokeMethod(
                payload: try String(data: JSONSerialization.data(withJSONObject: payload!), encoding: .utf8)!)
        }
        catch {
            fatalError("Failed to serialize payload for invokeMethod")
        }
    }
    
    private func dispatchMessageToScript(page: SFSafariPage, withName: String, userInfo: [String : Any]? = nil) {
        NSLog("#appex(tocontent): page \(page.hashValue) message { name: \(withName), userInfo: \(userInfo ?? [:]) }")
        page.dispatchMessageToScript(withName: withName, userInfo: userInfo)
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
            guard let page = pageRegistry.tabIdToPage(tabId) else { return }
            dispatchMessageToScript(page: page, withName: eventName, userInfo: userInfo)
        case .appex:
            guard let typeName = userInfo["type"] as? String else { return }
            guard let type = Message.Background(rawValue: typeName) else { return }
            switch type {
            case .ready:
                isBackgroundReady = true
                messageQueue.forEach { invokeMethod(payload: $0) }
                messageQueue = []
            case .getActiveTabId:
                safariHelper.getActivePage { page in
                    guard page != nil,
                        let tabId = self.pageRegistry.pageToTabId(page!) else {
                            self.invokeMethod(
                                payload: [ "eventName": "activeTabId", "tabId": NSNull() ])
                        return
                    }

                    self.invokeMethod(
                        payload: [ "eventName": "activeTabId", "tabId": tabId ])
                }
            case .setIconTitle:
                guard let title = userInfo["title"] as? String else { return }
                safariHelper.setToolbarIconTitle(title)
            case .setIcon:
                if let path32 = ((userInfo["path"]
                    as? [String: Any])?["32"])
                    as? String,
                    let icon = icons[path32]
                {
                    safariHelper.setToolbarIcon(icon)
                }
            }
        }
    }
    
    private func buildManifestScript() -> String {
        return """
        chrome.runtime._manifest = {
            "version": "\(manifest!.version)",
            "name": "\(manifest!.name)",
            "id": "\(manifest!.id)"
        }
        """
    }

    private func readFile(_ url: URL) -> String {
        return try! String(contentsOf: url, encoding: .utf8)
    }

    private func readFiles(_ urls: [URL]) -> [String] {
        return urls.map { try! String(contentsOf: $0, encoding: .utf8) }
    }
}
