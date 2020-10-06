//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices

class PageRegistry<Page: Equatable> {
    private let thread: Thread
    private var pages: [UInt64: Page] = [:]
    private var recentlyByedPages = [ByeRecord]()
    // 1 or 2 byes should be enough to match the subsequent hello
    private let maxByes = 16
    var logger: TopeeLogger?

    private struct ByeRecord {
        let tabId: UInt64
        let url: String
        let historyLength: Int64
    }

    var count: Int {
        assert(Thread.current == thread)
        return pages.count
    }

    var tabIds: [ UInt64 ] {
        assert(Thread.current == thread)
        return Array(pages.keys)
    }

    init(thread: Thread) {
        self.thread = thread
    }

    public func touch(page: Page, tabId: UInt64) {
        pages[tabId] = page
    }

    @discardableResult
    public func hello(page: Page, tabId: UInt64?, referrer: String, historyLength: Int64) -> UInt64 {
        assert(Thread.current == thread)

        let closedPageIndex = recentlyClosedPage(tabId: tabId, referrer: referrer, historyLength: historyLength)

        if closedPageIndex != nil {
            let id = recentlyByedPages[closedPageIndex!].tabId
            pages[id] = page
            recentlyByedPages.remove(at: closedPageIndex!)
            return id
        }

        if tabId != nil {
            pages[tabId!] = page
            return tabId!
        }

        // Int.random(in: 1 .. 9007199254740991)  // 2^53 - 1, JS Number.MAX_SAFE_INTEGER
        let newTabId = (UInt64(arc4random_uniform(0xFFFFFFFE)) | (UInt64(arc4random_uniform(0x3FFFFF)) << 32)) + 1
        pages[newTabId] = page
        return newTabId
    }

    private func recentlyClosedPage(tabId: UInt64?, referrer: String, historyLength: Int64) -> Int? {
        if tabId != nil {
            if let i = recentlyByedPages.firstIndex(where: { $0.tabId == tabId }) {
                return i
            }
            return nil
        }

        // Match by referrer (+ history lenght check)
        if referrer != "" {
            if let i = recentlyByedPages.firstIndex(where: { $0.url.hasPrefix(referrer) }) {
                let match = recentlyByedPages[i]
                if match.historyLength <= historyLength {
                    return i
                }
            }
        }

        // Match by history length only (navigation forward)
        if let i = recentlyByedPages.firstIndex(where: { $0.historyLength == historyLength - 1 }) {
            return i
        }

        // User may have navigated few pages back and then visited new page thus shortening history
        if let i = recentlyByedPages.firstIndex(where: { $0.historyLength >= historyLength }) {
            return i
        }

        return nil
    }

    public func bye(page: Page, url: String, historyLength: Int64) {
        assert(Thread.current == thread)

        while recentlyByedPages.count >= maxByes {
            recentlyByedPages.removeLast()
        }

        guard let tabId = pageToTabId(page) else {
            logger?.debug("Warning: Can't find tabId for given page")
            return
        }

        recentlyByedPages.insert(ByeRecord(tabId: tabId,
                                           url: url,
                                           historyLength: historyLength), at: 0)
        pages[tabId] = nil
    }

    public func pageToTabId(_ page: Page) -> UInt64? {
        assert(Thread.current == thread)
        guard let item = pages.first(where: { $0.value == page }) else { return nil }
        return item.key
    }

    public func tabIdToPage(_ tabId: UInt64) -> Page? {
        assert(Thread.current == thread)
        return pages[tabId]
    }
    
    public func tabIdToTab(tabId: UInt64, completionHandler: @escaping (SFSafariTab) -> Void) {
        assert(Thread.current == thread)
        if pages[tabId] != nil && pages[tabId] is SFSafariPage {
            (pages[tabId]! as! SFSafariPage).getContainingTab(completionHandler: completionHandler)
        }
    }
}

typealias SFSafariPageRegistry = PageRegistry<SFSafariPage>
