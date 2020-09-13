//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices
import WebKit

public protocol SafariExtensionBridgeType: WKScriptMessageHandler {
    func setup(webViewURL: URL, manifest: TopeeExtensionManifest, logger: TopeeLogger?, backgroudScriptDebugDelaySec: Int)
    func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any]?)
    func toolbarItemClicked(in window: SFSafariWindow)
    func toolbarItemNeedsUpdate(in window: SFSafariWindow)
    func registerPopup(popup: WKWebView)
    func unregisterPopup()
    func readLocales() -> String
}

public extension SafariExtensionBridgeType {
    /// Setup method with default parameters
    func setup(webViewURL: URL = URL(string: "http://topee.local")!,
               manifest: TopeeExtensionManifest = TopeeExtensionManifest(),
               logger: TopeeLogger? = nil,
               backgroudScriptDebugDelaySec: Int = 0) {
        setup(webViewURL: webViewURL, manifest: manifest, logger: logger, backgroudScriptDebugDelaySec: backgroudScriptDebugDelaySec)
    }
}

extension NSRegularExpression {
    func matches(_ string: String) -> Bool {
        let range = NSRange(location: 0, length: string.count)
        return firstMatch(in: string, options: [], range: range) != nil
    }
}

public class SafariExtensionBridge: NSObject, SafariExtensionBridgeType, WKScriptMessageHandler {
    public static let shared = SafariExtensionBridge()

    private var manifest: TopeeExtensionManifest = TopeeExtensionManifest()
    private var webViewURL: URL = URL(string: "http://topee.local")!
    private var logger: TopeeLogger = DefaultLogger()
    private let topeeVersion = Bundle.current.shortVersionString!
    private var backgroudScriptDebugDelaySec = 0

    private var safariHelper: SFSafariApplicationHelper = SFSafariApplicationHelper()
    private var pageRegistry: SFSafariPageRegistry = SFSafariPageRegistry(thread: Thread.main)
    private var webView: WKWebView?
    private var isBackgroundReady: Bool = false
    // Accumulates messages until the background scripts informs us that is ready
    private var messageQueue: [String] = []
    
    private var popup: WKWebView? = nil
    
    private var localeCache: String = ""

    override init() {
        super.init()
    }

    public func setup(webViewURL: URL, manifest: TopeeExtensionManifest, logger injectedLogger: TopeeLogger?, backgroudScriptDebugDelaySec: Int = 0) {
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
        self.backgroudScriptDebugDelaySec = backgroudScriptDebugDelaySec
        if backgroudScriptDebugDelaySec > 0 {
            startBackgroundScriptIfNotRunning(userAgent: "Topee")
        }
    }

    private func startBackgroundScriptIfNotRunning(userAgent: String) {
        assert(Thread.isMainThread)
        guard webView == nil else { return }

        webView = { () -> WKWebView in
            let webConfiguration = WKWebViewConfiguration()
            let backgroundEndURL = Bundle(for: SafariExtensionBridge.self)
                .url(forResource: "topee-background-end", withExtension: "js")!
            let backgroundURL = Bundle(for: SafariExtensionBridge.self)
                .url(forResource: "topee-background", withExtension: "js")!
            let bgLocale = "(function () { chrome.i18n._locale=" + readLocales() + "; })();"

            let scripts = [readFile(backgroundURL), buildManifestScript()]
                + [bgLocale]
                + readFiles(backgroundScriptURLs())
                + [readFile(backgroundEndURL)]
            let script = WKUserScript(scripts: scripts)
            let contentController: WKUserContentController = WKUserContentController()
            if backgroudScriptDebugDelaySec <= 0 {
                contentController.addUserScript(script)
            }
            contentController.add(self, name: MessageHandler.content.rawValue)
            contentController.add(self, name: MessageHandler.appex.rawValue)
            contentController.add(self, name: MessageHandler.log.rawValue)
            contentController.add(self, name: MessageHandler.popup.rawValue)
            webConfiguration.userContentController = contentController
            let webView = WKWebView(frame: .zero, configuration: webConfiguration)
            webView.customUserAgent = "\(userAgent) Topee/\(topeeVersion)"
            webView.loadHTMLString("<html><body></body></html>", baseURL: webViewURL)

            if backgroudScriptDebugDelaySec > 0 {
                DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(backgroudScriptDebugDelaySec)) { [webView, script] in
                    webView.loadHTMLString("<html><body><script>" + script.source + "</script></body></html>", baseURL: self.webViewURL)
                }
            }

            return webView
        }()
        DispatchQueue.global().asyncAfter(deadline: .now() + 10) { [unowned self] in
            guard self.isBackgroundReady else {
                self.logger.error("Backgrounds scripts are taking too long to load. Check files for possible errors")
                return
            }
        }
    }
    
    private func injectExtensionId() {
        // this is expected to run in the main thread
        SFSafariExtension.getBaseURI { baseUrl in
            if baseUrl != nil {
                DispatchQueue.main.async {
                    self.webView!.evaluateJavaScript("chrome.runtime.id='\(baseUrl!)'.substr('\(baseUrl!)'.indexOf('://')+3)") { result, error in
                        guard error == nil else {
                            self.logger.error("Received JS error: \(error! as NSError)")
                            return
                        }
                    }
                }
            }
        }

    }

    public func registerPopup(popup: WKWebView) {
        self.popup = popup
    }
    
    public func unregisterPopup() {
        self.popup = nil
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
            let userAgent = userInfo?["userAgent"] as! String
            if backgroudScriptDebugDelaySec <= 0 {
                startBackgroundScriptIfNotRunning(userAgent: userAgent)
            }

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
            tabIdInfo["locale"] = readLocales()
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
                injectExtensionId()
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
            case .createTab:
                guard let tabUrlStr = userInfo["url"] as? String else { return }
                guard let tabUrl = URL(string: tabUrlStr) else { return }
                guard let tabActive = userInfo["active"] as? Bool else { return }
                safariHelper.getActiveWindow(completionHandler: { window in
                    window?.openTab(with: tabUrl, makeActiveIfPossible: tabActive, completionHandler: { _ in })
                })
            }
        case .background:
            guard let message = userInfo["message"] as? [String: Any] else { return }
            sendMessageToBackgroundScript(payload: message)
        case .popup:
            //guard let message = userInfo["body"] as? [String: Any] else { return }
            sendMessageToPopupScript(payload: userInfo)
        }
    }

    public func readLocales() -> String {
        if localeCache.count > 0 {
            return localeCache
        }
        
        let langCode = NSLocale.current.languageCode ?? "en"
        let langRegion = NSLocale.current.regionCode?.uppercased()

        do {
            let fullRE = try NSRegularExpression(pattern: (langRegion == nil ? langCode : langCode + "_" + langRegion!) + "$")
            let langRE = try NSRegularExpression(pattern: langCode + "$")
            let langAnyRE = try NSRegularExpression(pattern: langCode + "[_a-zA-Z]+$")
            let enRE = try NSRegularExpression(pattern: "en$")
            
            
            let localePaths = Bundle.main.paths(forResourcesOfType: "", inDirectory: "_locales")
            var messagesPath: String? = nil
            
            if localePaths.count == 0 {
                // no messages found
                localeCache = "{}"
                return localeCache
            }
            
            repeat {
                messagesPath = localePaths.first(where: { l in return fullRE.matches(l) })
                if messagesPath != nil { break }
                
                messagesPath = localePaths.first(where: { l in return langRE.matches(l) })
                if messagesPath != nil { break }

                messagesPath = localePaths.first(where: { l in return langAnyRE.matches(l) })
                if messagesPath != nil { break }

                messagesPath = localePaths.first(where: { l in return enRE.matches(l) })
                if messagesPath != nil { break }

                messagesPath = localePaths[0]
            } while false
            
            localeCache = try String(contentsOfFile: messagesPath! + "/messages.json", encoding: .utf8)
        }
        catch {
            logger.error("Cannot load " + langCode + (langRegion != nil ? "_" + langRegion! : "") + " locales")
            localeCache = "{}"
        }
        
        return localeCache
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

    private func sendMessageToPopupScript(payload: [String: Any]) {
        func handler() {
            do {
                let str = try String(data: JSONSerialization.data(withJSONObject: payload), encoding: .utf8)!
                guard let activePopup = self.popup else { return }
                activePopup.evaluateJavaScript("topee.manageRequest(\(str))") { result, error in
                    guard error == nil else {
                        self.logger.error("Received JS error: \(error! as NSError)")
                        return
                    }
                    if let result = result {
                        self.logger.debug("Received JS result: \(result)")
                    }
                }
            } catch {
                let message = "Failed to serialize payload for sendMessageToPopupScript"
                logger.error(message)
                fatalError(message)
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
        "id": "\(manifest.bundleId)"
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
