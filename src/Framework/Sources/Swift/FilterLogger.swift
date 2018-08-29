//
//  Copyright © 2018 Avast. All rights reserved.
//

import Foundation

/**
 log a message if a supplied context (in a form of [ "key": [ "subkey": "value" ] ]) matches a regular expression filter
 
 filter example: ["key.subkey": try! NSRegularExpression(pattern: ".al.*", options: [])]
 
 at least one of the filter matchers needs to match
 i.e. logs nothing with a filter [:]
 logs everything with a nil filter
 
 usage example:
var log: FilterLogger.LogFunc = FilterLogger.create(["gender": try! NSRegularExpression(pattern: "male", options: [])])
 ...
 log([ "gender": "male", "name": "David" ], "Warning: females only")
 */
public class FilterLogger {
    private var messageLogFilter: [String:NSRegularExpression]?
    
    public init(_ filterExpressions: [String:NSRegularExpression]? = nil) {
        messageLogFilter = filterExpressions
    }
    
    private func logAllowed(_ context: [String:Any]?) -> Bool {
        guard messageLogFilter != nil else {
            return true
        }
        guard context != nil else {
            return false
        }
        filterKey: for f in messageLogFilter!.keys {
            var dict = context
            var parts = f.split(separator: ".")
            let valueKey = String(parts.removeLast())
            
            for p in parts {
                dict = dict![String(p)] as? [String:Any]
                if dict == nil { continue filterKey }
            }
            
            if dict![valueKey] != nil {
                if let val = dict![valueKey] as? String {
                    return !(messageLogFilter![f]!.matches(in: val, range: NSRange(val.startIndex..., in: val)).isEmpty)
                }
                else {
                    return false
                }
            }
        }
        return false
    }
    
    public func log(_ context: [String:Any]?, _ message: String, _ args: CVarArg...) {
        if logAllowed(context) {
            withVaList(args) {
                NSLogv(message, $0)
            }
        }
    }
    
    public func log(_ context: [String:Any]?, _ message: String, _ args: CVaListPointer) {
        if logAllowed(context) {
            NSLogv(message, args)
        }
    }
    
    public typealias LogFunc = ([String:Any]?, String, CVarArg...) -> Void
    public static func create(_ filterExpressions: [String:NSRegularExpression]? = nil) -> LogFunc {
        let logger = FilterLogger(filterExpressions)
        return {
            (p0: [String:Any]?, p1: String, p2: CVarArg...) in withVaList(p2) { (val) in logger.log(p0, p1, val) }
        }
    }
}

