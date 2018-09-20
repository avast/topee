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
    
    public init(_ infoDictionary: [String:Any]? = Bundle.main.infoDictionary) {
        id = infoDictionary?["CFBundleIdentifier"] as? String ?? ""
        version = infoDictionary?["CFBundleShortVersionString"] as? String ?? ""
        name = infoDictionary?["CFBundleDisplayName"] as? String ?? ""
    }
    
    // use path like
    //   Bundle(for: MyClass.self).path(forResource: "Info", ofType: "plist")
    // for Resources directory or
    //   Bundle.main.bundlePath + "/Contents/Info.plist" for main appex directory
    public init(infoPath: String) {
        self.init(NSDictionary(contentsOfFile: infoPath) as? [String:Any])
    }
    
    public init(name: String, version: String = "1.0.0", id: String = "com.avast.topee") {
        self.id = id
        self.version = version
        self.name = name
    }
}

// MARK: -

public protocol SafariExtensionBridgeType {
    func setup(
        webViewURL: URL,
        icons: [String: NSImage],
        manifest: TopeeExtensionManifest,
        messageLogFilter: [String:NSRegularExpression]?)
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?)
    func toolbarItemClicked(in window: SFSafariWindow)
    func toolbarItemNeedsUpdate(in window: SFSafariWindow)
}

// Can't define default values in protocol so we need extension
public extension SafariExtensionBridgeType {
    func setup(
        webViewURL: URL = URL(string: "http://topee.local")!,
        icons: [String: NSImage] = [:],
        manifest: TopeeExtensionManifest? = nil,
        messageLogFilter: [String:NSRegularExpression]? = nil)
    {
        setup(
            webViewURL: webViewURL,
            icons: icons,
            manifest: manifest ?? TopeeExtensionManifest(),
            messageLogFilter: messageLogFilter
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
    private var webViewURL: URL = URL(string: "http://topee.local")!
    private var icons: [String: NSImage] = [:]
    private var log: FilterLogger.LogFunc = FilterLogger.create(nil)

    private var pageRegistry: SFSafariPageRegistry
    private var webView: WKWebView?
    private var isBackgroundReady: Bool = false
    // Accumulates messages until the background scripts
    // informs us that is ready
    private var messageQueue: [String] = []
    private var safariHelper: SFSafariApplicationHelper = SFSafariApplicationHelper()

    // MARK: - Initializers
    
    override init() {
        pageRegistry = SFSafariPageRegistry(thread: Thread.main)
        super.init()
    }
    
    public func setup(
        webViewURL: URL,
        icons: [String: NSImage],
        manifest: TopeeExtensionManifest,
        messageLogFilter: [String: NSRegularExpression]?)
    {
        if webView != nil {
            // Setup has been already called, so let's just check if configuration matches.
            if webViewURL != self.webViewURL {
                fatalError("You can only specify one webViewURL")
            }
            
            if manifest != self.manifest {
                fatalError("You can only specify one manifest")
            }
            
            return
        }
        
        let backgroundScriptFileNames = (
                (Bundle.main.infoDictionary?["NSExtension"]
                    as? [String:Any])?["SFSafariBackgroundScript"]
                    as? [[String:String]]
                    ?? []
            )
            .compactMap {$0["Script"]}
        let backgroundScriptUrls = backgroundScriptFileNames
            .compactMap { Bundle.main.url(forResource: $0, withExtension: "") }

        self.webViewURL = webViewURL
        self.icons = icons
        self.manifest = manifest
        self.log = FilterLogger.create(messageLogFilter)

        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            let backgroundEndURL = Bundle(for: SafariExtensionBridge.self)
                .url(forResource: "topee-background-end", withExtension: "js")!
            let backgroundURL = Bundle(for: SafariExtensionBridge.self)
                .url(forResource: "topee-background", withExtension: "js")!
            let scripts = [readFile(backgroundURL), buildManifestScript()]
                + readLocales()
                + readFiles(backgroundScriptUrls)
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
        window.getActiveTab { tab in
            tab?.getActivePage { page in
                DispatchQueue.main.sync {
                    let tabId = self.pageRegistry.pageToTabId(page!)
                    self.sendMessageToBackgroundScript(payload: [
                        "eventName": "toolbarItemClicked",
                        "tab": [ "id": tabId ] ])
                }
            }
        }
    }

    public func toolbarItemNeedsUpdate(in window: SFSafariWindow) {
        safariHelper.toolbarItemNeedsUpdate(in: window)
    }
    
    public func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String : Any]?) {
        assert(Thread.isMainThread)

        guard let message = Message.Content.Request(rawValue: messageName) else {
            NSLog("#appex(<-content) [ERROR]: unknown message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
            return
        }

        log(userInfo, "#appex(<-content): message { name: \(messageName), userInfo: \(userInfo ?? [:]) }")
        var payload = userInfo?["payload"] as? [String: Any]

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
            sendMessageToContentScript(
                page: page,
                withName: "forceTabId",
                userInfo: ["tabId" : tabId])
        case .alive, .request:
            if let tabId = userInfo?["tabId"] as? UInt64 {
                pageRegistry.touch(page: page, tabId: tabId)
            }
        case .bye:
            pageRegistry.bye(
                page: page,
                url: userInfo?["url"] as? String ?? "",
                historyLength: userInfo?["historyLength"] as! Int64
            )
            if let tabId = userInfo?["tabId"] as? UInt64 {
                pageRegistry.touch(page: page, tabId: tabId)
            }
        }

        // Relays the messages to the background script
        if payload != nil {
            sendMessageToBackgroundScript(payload: payload)
        }

        if message == .hello || message == .bye {
            log(userInfo, "#appex(pageRegistry): pages: { count: \(self.pageRegistry.count), tabIds: \(self.pageRegistry.tabIds)}")
        }
    }

    // MARK: - Private API

    private func sendMessageToBackgroundScript(payload: String) {
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

    private func sendMessageToBackgroundScript(payload: [String: Any]?) {
        log(payload, "#appex(->background): message { payload: \(payload ?? [:]) }")

        do {
            sendMessageToBackgroundScript(
                payload: try String(data: JSONSerialization.data(withJSONObject: payload!), encoding: .utf8)!)
        }
        catch {
            fatalError("Failed to serialize payload for sendMessageToBackgroundScript")
        }
    }
    
    private func sendMessageToContentScript(page: SFSafariPage, withName: String, userInfo: [String : Any]? = nil) {
        log(userInfo, "#appex(->content): page \(page.hashValue) message { name: \(withName), userInfo: \(userInfo ?? [:]) }")
        page.dispatchMessageToScript(withName: withName, userInfo: userInfo)
    }

    // MARK: - WKScriptMessageHandler

    /**
     Handles messages from background script(s).
     */
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        assert(Thread.isMainThread)
        if message.name != MessageHandler.log.rawValue {
            // Ignore log messages (they are logged few lines below).
            log(["name":message.name, "body":message.body], "#appex(<-background): { 'name': \(message.name), 'body': \(message.body) }")
        }

        guard let handler = MessageHandler(rawValue: message.name) else { return }
        guard let userInfo = message.body as? [String: Any] else { return }

        switch handler {
        case .log:
            guard let logLevel = userInfo["level"] as? String else { return }
            guard let message = userInfo["message"] as? String else { return }
            NSLog("#appex(background) [\(logLevel)]: \(message)")
        case .content:
            guard let tabId = userInfo["tabId"] as? UInt64 else { return }
            guard let eventName = userInfo["eventName"] as? String else { return }
            guard let page = pageRegistry.tabIdToPage(tabId) else { return }
            sendMessageToContentScript(page: page, withName: eventName, userInfo: userInfo)
        case .appex:
            guard let typeName = userInfo["type"] as? String else { return }
            guard let type = Message.Background(rawValue: typeName) else { return }
            switch type {
            case .ready:
                isBackgroundReady = true
                messageQueue.forEach { sendMessageToBackgroundScript(payload: $0) }
                messageQueue = []
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
        };
        """
    }

    private func readFile(_ url: URL) -> String {
        return try! String(contentsOf: url, encoding: .utf8)
    }

    private func readFiles(_ urls: [URL]) -> [String] {
        return urls.map { try! String(contentsOf: $0, encoding: .utf8) }
    }
    
    private func readLocales() -> [String] {
        let localePaths = Bundle.main.paths(forResourcesOfType: "", inDirectory: "_locales")
        return localePaths
            .map { $0 + "/messages.json" }
            .map {
                let lang = (($0 as NSString).deletingLastPathComponent as NSString).lastPathComponent
                let json = (try? String(contentsOfFile: $0, encoding: .utf8)) ?? ""
                return json.isEmpty ? json :
                    "(function () { chrome.i18n._locales['"+lang+"']=" + json + "; })();"
            }
    }
}
