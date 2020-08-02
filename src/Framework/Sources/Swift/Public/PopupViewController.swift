import SafariServices
import WebKit

let POPUP_PROTOCOL = "topee"

class PopupViewController: SFSafariExtensionViewController, WKURLSchemeHandler {
    
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
            
            d = try String(contentsOf: Bundle.main.url(forResource: file, withExtension: "")!, encoding: .utf8).data(using: .utf8)!
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
        default:
            return "application/octet-stream"
        }
    }
    

    public static let shared = PopupViewController()

    var webView : WKWebView!
    
    init() {
        super.init(nibName: nil, bundle: nil)
        NSLog("Expected PopupViewController instantiation")
        self.preferredContentSize = NSMakeSize(300, 450)
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(self, forURLScheme: POPUP_PROTOCOL)
        webView = WKWebView(frame: .zero, configuration: config)
        self.view = webView
        webView.translatesAutoresizingMaskIntoConstraints = false;

        let height = NSLayoutConstraint(item: webView!, attribute: .height, relatedBy: .equal, toItem: self.view, attribute: .height, multiplier: 1, constant: 0)
        let width = NSLayoutConstraint(item: webView!, attribute: .width, relatedBy: .equal, toItem: self.view, attribute: .width, multiplier: 1, constant: 0)
        self.view.addConstraints([height,width])

        let u = URL(string: POPUP_PROTOCOL + "://dialog.html")
        //self.webView.load(d!, mimeType: "text/html", characterEncodingName: "utf8", baseURL: u!)
        webView.load(URLRequest(url: u!))

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
}
