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
        enum Response: String {
            case response
        }
    }
    enum Background {
        case empty
    }
}
