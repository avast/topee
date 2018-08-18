//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

enum Message {
    enum Content {
        enum Request: String {
            case hello
            case bye
            case request
        }
    }
    enum Background: String {
        case ready
        case getActiveTabId
        case getManifest
        case setIcon
    }
}
