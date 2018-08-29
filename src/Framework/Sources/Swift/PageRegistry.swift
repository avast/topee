//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices

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

