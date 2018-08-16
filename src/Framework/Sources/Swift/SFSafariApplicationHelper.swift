//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation
import SafariServices

/**
 Workarounds for SFSafariApplication problems
 
 For some reason SFSafariApplication getActiveWindow doesn't always return active window.
 E.g. if you schedule getActiveWindow to run periodically you will stop receiving active
 window after few seconds. Which is kind of unfortunate if you need to get active window
 ad-hoc (e.g. when background script needs to know it).
 
 There is also similar problem with SFSafariWindow.getActiveTab.
*/

class SFSafariApplicationHelper {
    private var activeWindow: SFSafariWindow?

    /**
     Set cached active window from outside

     There are situations when active window is known (e.g. when toolbar icon is clicked)
     and we can use them to improve cache precision.
     */
    func onWindowActivated(window: SFSafariWindow) {
        activeWindow = window

        getActivePage { page in
            // NOOP: For some weird reason fetching page ASAP seems to make further
            // getActivePage calls more reliable. Otherwise getActiveTab, getActivePage
            // may not call it's callback (even if tab/page IS active).
        }
    }

    /**
     Get active Safari window

     This method is similar to SFSafariApplication.getActiveWindow but it also calls
     completionHandler if no active window is found.
     */
    func getActiveWindow(completionHandler: @escaping (SFSafariWindow?) -> Void) {
        // TODO: Try to get current window or fallback to cached activeWindow after some timeout
        completionHandler(activeWindow)
    }

    /**
     Get active page in currently active Safari window.

     Or pass nil to callback if no Safari window is active.
     */
    func getActivePage(completionHandler: @escaping (SFSafariPage?) -> Void) {
        var didCall = false

        // Fallback: Call completionHandler if getActiveWindow, getActiveTab or getActivePage fails.
        DispatchQueue.global().asyncAfter(deadline: .now() + 5) {
            if didCall { return }
            completionHandler(nil)
        }

        getActiveWindow { window in
            window?.getActiveTab { tab in
                tab?.getActivePage { page in
                    didCall = true
                    completionHandler(page)
                }
            }
        }
    }
}
