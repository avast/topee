//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

/// Specifies who should manage a given message
enum MessageHandler: String {
    /// When the message is intended for the content script
    case content
    /// When the message is intended for the appex
    case appex
    /// When the message is intended for the logger
    case log
}
