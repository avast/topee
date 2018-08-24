//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

class TestPage: NSObject {
    public var url: String
    init(url: String = "http://whatever") {
        self.url = url
    }
}

typealias TabId = UInt64

/**
 Simulates browser tab with all gory details
 
 Handles referrer, sessionStorage, history behaviour
 */
class TestTab {
    public var id: TabId? = nil
    private let trace: Bool!
    private var isClosed = false
    private let registry: PageRegistry<TestPage>
    private var history: [TestPage] = []
    private var currentIndex: Int? = nil
    private var currentPage: TestPage? {
        get {
            return currentIndex != nil ? history[currentIndex!] : nil
        }
    }
    private var storedTabId: [String: TabId] = [:] // sessionStorage
    
    init(registry: PageRegistry<TestPage>, trace: Bool = false) {
        self.registry = registry
        self.trace = trace
    }
    
    @discardableResult
    public func navigate(url: String) -> TestTab {
        assert(!isClosed)
        
        //// Say bye from current page
        let currentPage = self.currentPage
        bye(currentPage)
        
        //// Say hello
        let nextPage = TestPage(url: url)
        let nextIndex = currentIndex != nil ? currentIndex! + 1 : 0
        
        // Trim history if we are not going to insert at the end
        history = Array(history.dropLast(history.count - nextIndex + 1))
        history.append(nextPage)
        
        currentIndex = nextIndex
        
        let tabId = storedTabId[baseURL(nextPage.url)]
        let referrer = currentPage?.url ?? ""
        
        self.id = registry.hello(
            page: nextPage,
            tabId: tabId,
            referrer: referrer,
            historyLength: Int64(history.count)
        )
        if trace {
            let sTabId = tabId != nil ? String(tabId!) : "nil"
            NSLog("hello(page: <\(nextPage.hashValue)>, tabId: \(sTabId), referrer: \(referrer), historyLength: \(history.count) -> \(self.id!)")
        }
        
        storedTabId[baseURL(nextPage.url)] = self.id
        
        return self
    }
    
    @discardableResult
    func close() -> TestTab {
        isClosed = true
        bye(currentPage)
        
        return self
    }
    
    func bye(_ page: TestPage?) {
        if page != nil {
            if trace {
                NSLog("bye(page: <\(page!.hashValue)>, url: \(page!.url), historyLength: \(history.count)")
            }
            
            registry.bye(
                page: page!,
                url: page!.url,
                historyLength: Int64(history.count)
            )
        }
    }
    
    private func baseURL(_ surl: String) -> String {
        let url = URL(string: surl)!
        return "\(url.scheme!)://\(url.host!)/"
    }
}
