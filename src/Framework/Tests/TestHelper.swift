//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

class TestPage: NSObject {
    public var url: String
    public let referrer: String
    public let referrerPolicy: ReferrerPolicy

    init(url: String = "http://whatever", referrer: String, referrerPolicy: ReferrerPolicy = .notSpecified) {
        self.url = url
        self.referrer = referrer
        self.referrerPolicy = referrerPolicy
    }

    func makeReferrer() -> String {
        return referrerPolicy.makeReferrer(from: url)
    }
}

typealias TabId = UInt64
typealias Fn0 = () -> Void

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
enum ReferrerPolicy {
    case notSpecified
    case noReferrer
    case origin
    // For testing purposes we don't need to specify these:
    //    case noReferrerWhenDowngrade
    //    case originWhenCrossOrigin
    //    case sameOrigin
    //    case strictOrigin
    //    case strictOriginWhenCrossOrigin
    //    case unsafeUrl

    func makeReferrer(from: String?) -> String {
        if from == nil {
            return ""
        }

        switch self {
        case .notSpecified:
            return from!
        case .noReferrer:
            return ""
        case .origin:
            let fromUrl = URL(string: from!)!
            return "\(fromUrl.scheme!)://\(fromUrl.host!)/"
        }
    }
}

/**
 Simulates browser tab with all gory details

 Handles referrer, sessionStorage, history behaviour
 */
class TestTab: NSObject {
    private static var testTabIdCounter: Int = 0
    private var testTabId: Int
    public var id: TabId?
    private let trace: Bool!
    private let assertTabId: Bool!
    private var isClosed = false
    private let registry: PageRegistry<TestPage>
    private var history: [TestPage] = []
    private var currentIndex: Int?
    private var currentPage: TestPage? {
        return currentIndex != nil ? history[currentIndex!] : nil
    }

    private var storedTabId: [String: TabId] = [:] // sessionStorage

    init(registry: PageRegistry<TestPage>, trace: Bool = false, assertTabId: Bool = true) {
        self.registry = registry
        self.trace = trace
        self.assertTabId = assertTabId
        TestTab.testTabIdCounter = TestTab.testTabIdCounter + 1
        testTabId = TestTab.testTabIdCounter
        super.init()
    }

    @discardableResult
    public func reload() -> TestTab {
        self.bye()
        let nextPage = TestPage(url: self.currentPage!.url,
                                referrer: self.currentPage!.referrer,
                                referrerPolicy: self.currentPage!.referrerPolicy)
        self.hello(page: nextPage)
        return self
    }

    @discardableResult
    public func back() -> TestTab {
        assert((currentIndex ?? -1) > 0)

        self.bye()
        currentIndex = currentIndex! - 1

        let nextPage = TestPage(url: self.currentPage!.url,
                                referrer: self.currentPage!.referrer,
                                referrerPolicy: self.currentPage!.referrerPolicy)
        history.remove(at: currentIndex!)
        history.insert(nextPage, at: currentIndex!)

        self.hello(page: nextPage)
        return self
    }

    @discardableResult
    public func navigate(url: String,
                         referrerPolicy: ReferrerPolicy = .notSpecified,
                         completion: (_ bye: Fn0, _ hello: Fn0) -> Void) -> TestTab {
        assert(!isClosed)

        func byeFn() {
            self.bye()
        }

        func helloFn() {
            let nextPage = TestPage(url: url,
                                    referrer: self.currentPage?.makeReferrer() ?? "",
                                    referrerPolicy: referrerPolicy)

            let nextIndex = currentIndex != nil ? currentIndex! + 1 : 0
            // Trim history if we are not going to insert at the end
            history = Array(history[..<nextIndex])
            history.append(nextPage)
            currentIndex = nextIndex

            hello(page: nextPage)
        }

        completion(byeFn, helloFn)

        return self
    }

    @discardableResult
    public func navigate(url: String, referrerPolicy: ReferrerPolicy = .notSpecified) -> TestTab {
        navigate(url: url, referrerPolicy: referrerPolicy) { bye, hello in
            bye()
            hello()
        }

        return self
    }

    @discardableResult
    func close() -> TestTab {
        isClosed = true
        bye()

        return self
    }

    func hello(page: TestPage) {
        let tabId = storedTabId[baseURL(page.url)]

        let id = registry.hello(page: page,
                                tabId: tabId,
                                referrer: page.referrer,
                                historyLength: Int64(history.count))

        if trace {
            let sTabId = tabId != nil ? String(tabId!) : "null"
            NSLog("#\(testTabId)/\(page.hashValue) hello(tabId: \(sTabId), referrer: \"\(page.referrer)\", historyLength: \(history.count)) @ \(page.url) -> \(id)")
        }

        // Tab should never change it's ID
        if assertTabId && self.id != nil && self.id != id {
            let message = "#\(testTabId) Tab ID changed from \(self.id!) to \(id)."
            NSLog(message)
            fatalError(message)
        }
        self.id = id

        storedTabId[baseURL(page.url)] = self.id
    }

    func bye() {
        let page = self.currentPage
        if page != nil {
            if trace {
                NSLog("#\(testTabId)/\(page!.hashValue) bye(tabId: \(self.id!), url: \(page!.url))")
            }

            registry.bye(page: page!,
                         url: page!.url,
                         historyLength: Int64(history.count))
        }
    }

    private func baseURL(_ surl: String) -> String {
        let url = URL(string: surl)!
        return "\(url.scheme!)://\(url.host!)/"
    }
}
