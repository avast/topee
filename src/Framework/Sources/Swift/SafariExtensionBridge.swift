//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import WebKit

// MARK: -

public protocol SafariExtensionBridgeType {
    func setup(
        backgroundScripts: [URL],
        webViewURL: URL,
        icons: [String: NSImage])
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
    func toolbarItemClicked(in window: SFSafariWindow)
    func toolbarItemNeedsUpdate(in window: SFSafariWindow)
}

// Can't define default values in protocol so we need extension
public extension SafariExtensionBridgeType {
    func setup(
        backgroundScripts: [URL],
        webViewURL: URL = URL(string: "http://topee.local")!,
        icons: [String: NSImage] = [:])
    {
        setup(
            backgroundScripts: backgroundScripts,
            webViewURL: webViewURL,
            icons: icons
        )
    }
}


enum MessageHandler: String {
    case content
    case appex
    case log
}

class PageRegistry<PageT: Equatable> {
    private let _thread = Thread.current
    
    private let MAX_BYES = 16   // something like 1 or 2 should be enough for the purpose to match the subsequent hello
    
    private struct ByeRecord {
        let tabId: UInt64
        let url: String
        let historyLength: Int64
    }

    private var pages: [UInt64: PageT] = [:]
    private var recentlyByedPages = [ByeRecord]()

    var count: Int {
        get {
            assert(Thread.current == _thread)
            
            return pages.count
        }
    }
    
    var tabIds: [ UInt64 ] {
        get {
            assert(Thread.current == _thread)
            
            return Array(pages.keys)
        }
    }
    
    @discardableResult
    public func hello(page: PageT, tabId: UInt64?, referrer: String, historyLength: Int64) -> UInt64 {
        assert(Thread.current == _thread)
        
        let closedPageIndex = recentlyClosedPage(tabId: tabId, referrer: referrer, historyLength: historyLength)

        if (closedPageIndex != nil) {
            let id = recentlyByedPages[closedPageIndex!].tabId
            pages[id] = page
            recentlyByedPages.remove(at: closedPageIndex!)
            return id
        }

        if tabId != nil {
            pages[tabId!] = page
            return tabId!
        }
            
        //Int.random(in: 1 .. 9007199254740991)  // 2^53 - 1, JS Number.MAX_SAFE_INTEGER
        let newTabId = UInt64(arc4random_uniform(0x7FFFFFFE)) + 1 //((UInt64(arc4random_uniform(0xFFFFFFFE)) | (UInt64(arc4random_uniform(0x3FFFFF)) << 32))) + 1
        pages[newTabId] = page
        return newTabId
    }
    
    private func recentlyClosedPage(tabId: UInt64?, referrer: String, historyLength: Int64) -> Int? {
        if (tabId != nil) {
            if let i = recentlyByedPages.index(where : {$0.tabId == tabId}) {
                return i;
            }
            return nil
        }
        
        // Match by referrer (+ history lenght check)
        if referrer != "" {
            if let i = recentlyByedPages.index(where: {$0.url.hasPrefix(referrer)}) {
                let match = recentlyByedPages[i]
                if match.historyLength <= historyLength {
                    return i
                }
            }
        }

        // Match by history lenght only
        if let i = recentlyByedPages.index(where: {$0.historyLength == historyLength - 1}) {
            return i
        }
        
        return nil
    }

    public func bye(page: PageT, url: String, historyLength: Int64) {
        assert(Thread.current == _thread)
        
        while recentlyByedPages.count >= MAX_BYES {
            recentlyByedPages.removeLast()
        }
        if let tabId = pageToTabId(page) {
            recentlyByedPages.insert(ByeRecord(
                tabId: tabId,
                url: url,
                historyLength: historyLength
            ), at: 0)
            pages[tabId] = nil
        }
    }
    
    public func pageToTabId(_ page: PageT) -> UInt64? {
        assert(Thread.current == _thread)
        
        guard let item = pages.first(where: { $0.value == page }) else { return nil }
        return item.key
    }
    
    public func tabIdToPage(_ tabId: UInt64) -> PageT? {
        assert(Thread.current == _thread)
        
        return pages[tabId]
    }

}

typealias SFSafariPageRegistry = PageRegistry<SFSafariPage>

// MARK: -

public class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {

    // MARK: - Public Members

    public static let shared = SafariExtensionBridge()
    
    // MARK: - Private Members

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
    
    public func setup(backgroundScripts: [URL], webViewURL: URL, icons: [String: NSImage]) {
        if webView != nil {
            // Setup has been already called, so let's just check if configuration matches.
            if backgroundScripts != self.backgroundScripts {
                fatalError("You can only inject one set of background scripts")
            }
            
            if webViewURL != self.webViewURL {
                fatalError("You can only specify one webViewURL")
            }
            
            return
        }

        self.backgroundScripts = backgroundScripts
        self.webViewURL = webViewURL
        self.icons = icons

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
            case .getManifest:
                guard let infoPlist = Bundle(for: SafariExtensionBridge.self).path(forResource: "Info", ofType: "plist"),
                    let infoPlistDictionary = NSDictionary(contentsOfFile: infoPlist) else
                {
                    self.invokeMethod(
                        payload: [ "eventName": "extensionManifest", "manifest": [:] ])
                    return
                }
                let version = infoPlistDictionary["CFBundleShortVersionString"] as? String
                let name = infoPlistDictionary["CFBundleDisplayName"] as? String
                let extId = infoPlistDictionary["CFBundleIdentifier"] as? String
                self.invokeMethod(
                    payload: [
                        "eventName": "extensionManifest",
                        "manifest": [
                            "version": version ?? "",
                            "name": name ?? "",
                            "id": extId ?? ""
                        ]
                    ]
                )
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
}
