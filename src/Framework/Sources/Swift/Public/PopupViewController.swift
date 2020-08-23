import SafariServices
import WebKit

let POPUP_PROTOCOL = "topee"

func dirUp(_ path: String) -> String? {
    let upperDir = path.split(separator: "/", maxSplits: 1)
    if (upperDir.count <= 1) {
        return nil
    }
    return String(upperDir[1])
}

class PopupViewController: SFSafariExtensionViewController, WKURLSchemeHandler {
    
    public var bridge: SafariExtensionBridgeType { return SafariExtensionBridge.shared }
    
    // https://github.com/DiligentRobot/WKWebViewExample/blob/master/WKWebKitExample/ViewController%2BWKURLSchemeHandler.swift
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(URLError.badURL))
            return
        }
        // URL.path etc. don't work on topee:
        let urlString = url.absoluteString
        let tld = urlSchemeTask.request.mainDocumentURL?.absoluteString
        let index = tld != nil && tld != urlString && urlString.starts(with: tld!) ?
            urlString.index(urlString.startIndex, offsetBy: tld!.count + 1)  // count slash in
            : urlString.index(urlString.startIndex, offsetBy: POPUP_PROTOCOL.count + "://".count)
        let file = String(urlString[index..<urlString.endIndex])
        let path = (file as NSString).deletingPathExtension
        let ext = (file as NSString).pathExtension
        
        var d: Data
        
        do {
            var bundleUrl = Bundle.main.url(forResource: file, withExtension: "")
            var bundlePath: String? = file
            // the path mapping is rather broken with e.g. '..'
            // if not found, rather look a dir up as well
            while (bundleUrl == nil) {
                bundlePath = dirUp(bundlePath!)
                if (bundlePath == nil) {
                    urlSchemeTask.didFailWithError(URLError(URLError.fileDoesNotExist))
                    return
                }
                bundleUrl = Bundle.main.url(forResource: bundlePath, withExtension: "")
            }
            d = try String(contentsOf: bundleUrl!, encoding: .utf8).data(using: .utf8)!
        } catch {
            urlSchemeTask.didFailWithError(URLError(URLError.fileDoesNotExist))
            return
        }

        NSLog(urlString + " ---> " + file)
        //let d = "<html><body>Hello popup!</body></html>".data(using: .utf8)
        let headers = URLResponse(url: URL(string: POPUP_PROTOCOL + "://" + file)!, mimeType: mimeType(ext), expectedContentLength: d.count, textEncodingName: "utf8")
        urlSchemeTask.didReceive(headers)
        urlSchemeTask.didReceive(d)
        urlSchemeTask.didFinish()
    }
    
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // ignore
    }
    
    func mimeType(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm":
            return "text/html"
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpg"
        case "gif":
            return "image/gif"
        case "js":
            return "text/javascript"
        case "css":
            return "text/css"
        case "woff2":
            return "font/woff2"
        default:
            return "application/octet-stream"
        }
    }
    

    var webView : WKWebView!
    
    public static let shared = PopupViewController()
    
    
    // how to avoid WKWebView not being unloaded: https://stackoverflow.com/questions/26383031/wkwebview-causes-my-view-controller-to-leak/26383032#26383032
    
    init() {
        super.init(nibName: nil, bundle: nil)
        NSLog("Expected PopupViewController instantiation")
        
        let popupURL = Bundle(for: SafariExtensionBridge.self)
            .url(forResource: "topee-popup", withExtension: "js")!
        let script = WKUserScript(scripts: [readFile(popupURL)])

        let contentController: WKUserContentController = WKUserContentController()
        contentController.addUserScript(script)
        contentController.add(bridge, name: MessageHandler.background.rawValue)

        self.preferredContentSize = NSMakeSize(360, 442)
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(self, forURLScheme: POPUP_PROTOCOL)
        config.userContentController = contentController
        webView = WKWebView(frame: .zero, configuration: config)
        self.view = webView
        webView.translatesAutoresizingMaskIntoConstraints = false;

        let height = NSLayoutConstraint(item: webView!, attribute: .height, relatedBy: .equal, toItem: self.view, attribute: .height, multiplier: 1, constant: 0)
        let width = NSLayoutConstraint(item: webView!, attribute: .width, relatedBy: .equal, toItem: self.view, attribute: .width, multiplier: 1, constant: 0)
        self.view.addConstraints([height,width])

/*        let haveId = NSCondition()
        var u = ""
        let ct = Thread.current

        func getId() {
            NSLog("dispaught")
            SFSafariExtension.getBaseURI { baseUrl in
                guard let burl = baseUrl else {
                    NSLog("yipiyee about:blank")
                    u = "oh well"
                    haveId.lock()
                    haveId.signal()
                    haveId.unlock()
                    return
                }
                NSLog("yipiyee " + burl.absoluteString)
                u = "very well"
                haveId.lock()
                haveId.signal()
                haveId.unlock()
            }
        }

        if Thread.isMainThread {
            NSLog("on main thread")
            SFSafariExtension.getBaseURI { baseUrl in
                if Thread.current == ct {
                    NSLog("current thread")
                }
                else {
                    NSLog("some other thread")
                    NSLog(Thread.isMainThread ? "main" : "non main")
                }
                NSLog(baseUrl != nil ? baseUrl!.absoluteString : "about:blank")
                if baseUrl != nil && !Thread.isMainThread {
                    DispatchQueue.main.async {
                        //self.webView.loadHTMLString("<html><body>Hello popup!</body></html>", baseURL: baseUrl!)
                        let d = "<html><body>Hello popup!</body></html>".data(using: .utf8)
                        //var u = baseUrl!
                        //u.appendPathComponent("dialog.html")
                        let u = URL(string: "topee://dialog.html")
                        self.webView.load(d!, mimeType: "text/html", characterEncodingName: "utf8", baseURL: u!)
                    }
                }
            }
        }
        else {
            NSLog("on some other thread")
            NSLog("dispatch")
            DispatchQueue.main.async {
                getId()
            }
            NSLog("lock")
            haveId.lock()
            while u == "" {
                NSLog("wait")
                haveId.wait()
            }
            NSLog("unlock")
            haveId.unlock()
            NSLog("got the id: " + u)
            if Thread.current == ct {
                NSLog("current thread")
            }
            else {
                NSLog("some other thread")
            }
        }*/

        
        
        /*SFSafariExtension.getBaseURI { baseUrl in
            guard let burl = baseUrl else {
                self.webView.loadHTMLString("<html><body>Hello popup!</body></html>", baseURL: URL(string: "about:blank"))
                return
            }
                self.webView.loadHTMLString("<html><body>Hello popup!</body></html>", baseURL: burl)
        }*/

    }

    required init?(coder: NSCoder) {
        super.init(nibName: nil, bundle: nil)
        NSLog("Unexpected PopupViewController instantiation")
    }
    
    public func load(_ path: String) {
        let u = URL(string: POPUP_PROTOCOL + "://" + path)
        //self.webView.load(d!, mimeType: "text/html", characterEncodingName: "utf8", baseURL: u!)
        webView.load(URLRequest(url: u!))
        
        bridge.registerPopup(popup: webView)
    }
    
    override func viewDidDisappear() {
        bridge.unregisterPopup()
        super.viewDidDisappear()
    }

    private func readFile(_ url: URL) -> String {
        do {
            return try String(contentsOf: url, encoding: .utf8)
        } catch {
            let message = "Could not load file at: \(url)"
            fatalError(message)
        }
    }
}
