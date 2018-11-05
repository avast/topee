//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import WebKit

public protocol SafariExtensionBridgeType {
    func setup(webViewURL: URL, manifest: TopeeExtensionManifest, logger: TopeeLogger?)
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any]?)
    func toolbarItemClicked(in window: SFSafariWindow)
    func toolbarItemNeedsUpdate(in window: SFSafariWindow)
}

public extension SafariExtensionBridgeType {
    /// Setup method with default parameters
    func setup(webViewURL: URL = URL(string: "http://topee.local")!,
               manifest: TopeeExtensionManifest = TopeeExtensionManifest(),
               logger: TopeeLogger? = nil) {
        setup(webViewURL: webViewURL, manifest: manifest, logger: logger)
    }
}

public class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {
    public static let shared = SafariExtensionBridge()

    private var manifest: TopeeExtensionManifest = TopeeExtensionManifest()
    private var webViewURL: URL = URL(string: "http://topee.local")!
    private var logger: TopeeLogger = DefaultLogger()

    private var safariHelper: SFSafariApplicationHelper = SFSafariApplicationHelper()
    private var pageRegistry: SFSafariPageRegistry = SFSafariPageRegistry(thread: Thread.main)
    private var webView: WKWebView?
    private var isBackgroundReady: Bool = false
    // Accumulates messages until the background scripts informs us that is ready
    private var messageQueue: [String] = []

    override init() {
        super.init()
    }

    public func setup(webViewURL: URL, manifest: TopeeExtensionManifest, logger injectedLogger: TopeeLogger?) {
        if webView != nil {
            // Setup has been already called, so let's just check if configuration matches.
            if webViewURL != self.webViewURL {
                let message = "You can only specify one webViewURL"
                logger.error(message)
                fatalError(message)
            }
            if manifest != self.manifest {
                let message = "You can only specify one manifest"
                self.logger.error(message)
                fatalError(message)
            }

            return
        }

        self.webViewURL = webViewURL
        self.manifest = manifest
        self.logger = injectedLogger ?? logger
        self.pageRegistry.logger = logger


        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            webConfiguration.applicationNameForUserAgent = "Topee/\(manifest.version)"
            let backgroundEndURL = Bundle(for: SafariExtensionBridge.self)
                .url(forResource: "topee-background-end", withExtension: "js")!
            let backgroundURL = Bundle(for: SafariExtensionBridge.self)
                .url(forResource: "topee-background", withExtension: "js")!
            let scripts = [readFile(backgroundURL), buildManifestScript()]
                + readLocales()
                + readFiles(backgroundScriptURLs())
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
                self.logger.error("Backgrounds scripts are taking too long to load. Check files for possible errors")
                return
            }
        }
    }

    public func toolbarItemClicked(in window: SFSafariWindow) {
        safariHelper.toolbarItemClicked(in: window)
        window.getActiveTab { tab in
            tab?.getActivePage { page in
                DispatchQueue.main.sync {
                    let tabId = self.pageRegistry.pageToTabId(page!)
                    self.sendMessageToBackgroundScript(payload: [
                        "eventName": "toolbarItemClicked",
                        "tab": [ "id": tabId ]
                    ])
                }
            }
        }
    }

    public func toolbarItemNeedsUpdate(in window: SFSafariWindow) {
        safariHelper.toolbarItemNeedsUpdate(in: window)
    }

    /// Handles messages from the content script(s).
    public func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any]?) {
        assert(Thread.isMainThread)

        guard let message = Message.Content.Request(rawValue: messageName) else {
            logger.warning("#appex(<-content) unknown message { name: \(messageName) userInfo: \(prettyPrintJSObject(userInfo ?? [:])) }")
            return
        }

        logger.debug("#appex(<-content): message { name: \(messageName), userInfo: \(prettyPrintJSObject(userInfo ?? [:])) }")
        var payload = userInfo?["payload"] as? [String: Any]

        // Manages the registry of pages based on the type of message received
        switch message {
        case .hello:
            // Messages may come out of order, e.g. request is faster than hello here
            // so let's handle them in same way.
            let tabId = pageRegistry.hello(page: page,
                                           tabId: userInfo?["tabId"] as? UInt64,
                                           referrer: userInfo?["referrer"] as? String ?? "",
                                           historyLength: userInfo?["historyLength"] as! Int64)
            if userInfo?["tabId"] != nil && !(userInfo?["tabId"] is NSNull) {
                assert(userInfo?["tabId"] as? UInt64 != nil)
                assert(userInfo?["tabId"] as? UInt64 == tabId)
            }
            payload!["tabId"] = tabId
            var tabIdInfo: [String: Any] = ["tabId": tabId]
            #if DEBUG
            tabIdInfo["debug"] = ["log": true]
            #endif
            sendMessageToContentScript(page: page, withName: "forceTabId", userInfo: tabIdInfo)
        case .alive, .request:
            if let tabId = userInfo?["tabId"] as? UInt64 {
                pageRegistry.touch(page: page, tabId: tabId)
            }
        case .bye:
            pageRegistry.bye(page: page,
                             url: userInfo?["url"] as? String ?? "",
                             historyLength: userInfo?["historyLength"] as! Int64)
            if let tabId = userInfo?["tabId"] as? UInt64 {
                pageRegistry.touch(page: page, tabId: tabId)
            }
        }

        // Relays the messages to the background script
        if payload != nil {
            sendMessageToBackgroundScript(payload: payload!)
        }

        if message == .hello || message == .bye {
            logger.debug("#appex(pageRegistry): pages: { count: \(self.pageRegistry.count), tabIds: \(self.pageRegistry.tabIds)}")
        }
    }

    /// Handles messages from the brackground script(s).
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        assert(Thread.isMainThread)
        if message.name != MessageHandler.log.rawValue {
            logger.debug("#appex(<-background): { 'name': \(message.name), 'body': \(prettyPrintJSObject(message.body)) }")
        }

        guard let handler = MessageHandler(rawValue: message.name) else {
            logger.warning("#appex(<-background): unknown message { name: \(message.name) userInfo: \(prettyPrintJSObject(message.body)) }")
            return
        }
        guard let userInfo = message.body as? [String: Any] else {
            logger.warning("#appex(<-background): unknown message payload type { name: \(message.name) userInfo: \(prettyPrintJSObject(message.body)) }")
            return
        }

        switch handler {
        case .log:
            guard let logLevel = userInfo["level"] as? String else { return }
            guard let message = userInfo["message"] as? String else { return }
            logger.debug("#appex(background) [\(logLevel)]: \(message)")
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
                if let path = bestIconSizePath(userInfo),
                    let iconUrl = Bundle.main.url(forResource: path, withExtension: "") {
                    safariHelper.setToolbarIcon(loadAllResolutions(iconUrl))
                }
            }
        }
    }

    private func sendMessageToBackgroundScript(payload: String) {
        if !isBackgroundReady {
            messageQueue.append(payload)
            return
        }

        func handler() {
            self.webView!.evaluateJavaScript("topee.manageRequest(\(payload))") { result, error in
                guard error == nil else {
                    self.logger.error("Received JS error: \(error! as NSError)")
                    return
                }
                if let result = result {
                    self.logger.debug("Received JS result: \(result)")
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

    private func sendMessageToBackgroundScript(payload: [String: Any]) {
        logger.debug("#appex(->background): message { payload: \(prettyPrintJSObject(payload)) }")

        do {
            sendMessageToBackgroundScript(payload: try String(data: JSONSerialization.data(withJSONObject: payload), encoding: .utf8)!)
        } catch {
            let message = "Failed to serialize payload for sendMessageToBackgroundScript"
            logger.error(message)
            fatalError(message)
        }
    }

    private func sendMessageToContentScript(page: SFSafariPage, withName: String, userInfo: [String: Any]? = nil) {
        logger.debug("#appex(->content): page \(page.hashValue) message { name: \(withName), userInfo: \(prettyPrintJSObject(userInfo ?? [:])) }")
        page.dispatchMessageToScript(withName: withName, userInfo: userInfo)
    }

    private func loadAllResolutions(_ iconUrl: URL) -> NSImage {
        let icon = NSImage(byReferencing: iconUrl)

        if icon.representations.count == 0 {
            return icon
        }

        let fextension = iconUrl.pathExtension
        let fname = iconUrl.lastPathComponent.dropLast(fextension.count + 1)
        let nonameUrl = iconUrl.deletingLastPathComponent()

        for scale in 2...4 {
            let rep = NSImageRep(contentsOf: nonameUrl.appendingPathComponent(fname + "@" + String(scale) + "x." + fextension))
            if rep != nil {
                rep!.size = icon.representations[0].size
                icon.addRepresentation(rep!)
            }
        }

        return icon
    }

    private func bestIconSizePath(_ userInfo: [String: Any]) -> String? {
        guard let pathSpec = userInfo["path"] as? [String: Any] else { return nil }
        let sizes = Array(pathSpec.keys)
        if sizes.isEmpty { return nil }

        if let iconMap = (Bundle.main.infoDictionary?["NSExtension"] as? [String: Any])?["TopeeSafariToolbarIcons"] as? [String: String] {
            let pathValues = pathSpec.compactMap { $0.value as? String }
            if let (_, value) = iconMap.first(where: { pathValues.contains($0.key) }) {
                return value
            }
        }

        if sizes.contains("16") { return pathSpec["16"] as? String }
        if sizes.contains("19") { return pathSpec["19"] as? String }
        if sizes.contains("32") { return pathSpec["32"] as? String }

        return pathSpec[sizes.first!] as? String // if 16, 19 and 32 px are missing, take anything else
    }

    private func backgroundScriptURLs() -> [URL] {
        let dict = Bundle.main.infoDictionary!
        guard let extensionDictionary = dict["NSExtension"] as? [String: Any] else {
            logger.error("'NSExtension' entry not found in plist")
            return []
        }
        guard let backgroundScripts = extensionDictionary["TopeeSafariBackgroundScript"] as? [[String: String]] else {
            logger.error("'TopeeSafariBackgroundScript' entry not found in plist")
            return []
        }
        let scriptNames = backgroundScripts.compactMap { $0["Script"] }
        let scriptURLs = scriptNames.compactMap { (path: String) -> URL? in
            let url = Bundle.main.url(forResource: path, withExtension: "")
            if url == nil { logger.warning("Warning: \(path) not found") }
            return url
        }
        return scriptURLs
    }

    private func buildManifestScript() -> String {
        return """
        chrome.runtime._manifest = {
        "version": "\(manifest.version)",
        "name": "\(manifest.name)",
        "id": "\(manifest.id)"
        };
        """
    }

    private func readFiles(_ urls: [URL]) -> [String] {
        return urls.map(readFile)
    }

    private func readFile(_ url: URL) -> String {
        do {
            return try String(contentsOf: url, encoding: .utf8)
        } catch {
            let message = "Could not load file at: \(url)"
            logger.error(message)
            fatalError(message)
        }
    }

    private func readLocales() -> [String] {
        let localePaths = Bundle.main.paths(forResourcesOfType: "", inDirectory: "_locales")
        return localePaths
            .map { $0 + "/messages.json" }
            .map {
                let lang = (($0 as NSString).deletingLastPathComponent as NSString).lastPathComponent
                let json = (try? String(contentsOfFile: $0, encoding: .utf8)) ?? ""
                return json.isEmpty ? json :
                    "(function () { chrome.i18n._locales['" + lang + "']=" + json + "; })();"
            }
    }

    /// Pretty prints the given Javascript object
    private func prettyPrintJSObject(_ obj: Any) -> String {
        do {
            // Since we are receiving objects for/from JavaScript they should always be serializable
            let str = try JSONSerialization.data(withJSONObject: obj, options: .prettyPrinted)
            return String(data: str, encoding: .utf8)!
        } catch {
            let message = "Could not serialize the given JS object"
            logger.error(message)
            fatalError(message)
        }
    }
}
