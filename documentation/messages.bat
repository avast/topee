//./c:/progra~2/Graphviz/bin/dot.exe -Tsvg "%~f0" > "%~dpn0.svg" & exit /b

digraph Avast_Password_Manager {
    node [shape = rectangle ];

    subgraph cluster_webview {
        wv_manageRequest [ label="manageRequest" ]
        wv_webkit_messageHandlers_content_postMessage [ label="webkit.messageHandlers.content.postMessage" ]
        
        subgraph cluster_background {
            label = "extension background script";
            
            "chrome.runtime.onMessage.addListener" -> "function iframeRequestHandler(message,sender,sendResponse){...}" [ style="dashed" ]
            
            style = filled;
            color = rosybrown;
            fillcolor = cornsilk; 
        }

        wv_manageRequest -> "function iframeRequestHandler(message,sender,sendResponse){...}"

        "function iframeRequestHandler(message,sender,sendResponse){...}" -> wv_webkit_messageHandlers_content_postMessage [ label="sendResponse" color=darkred ]
  
        label = "webview";
        style = filled;
        color = cornsilk;
    }
    
    subgraph cluster_swift {
        swift_safariextensionhandler [ label="SFSafariExtensionHandler" ]
        swift_safariextensionbridge [ label="SafariExtensionBridge" ]
        swift_evaluatejs [ label="webview.evaluateJavaScript" ]
        swift_userContentController [ label="userContentController" ]
        swift_sendMessageToContentScript [ label="sendMessageToContentScript" ]
        swift_dispatchMessageToScript [ label="SFSafariPage.dispatchMessageToScript" ]
        
        swift_safariextensionhandler -> swift_safariextensionbridge -> swift_evaluatejs
        swift_evaluatejs -> wv_manageRequest 

        wv_webkit_messageHandlers_content_postMessage -> swift_userContentController -> swift_sendMessageToContentScript -> swift_dispatchMessageToScript [ color=darkred ]
          

        label = "Topee (swift)";
        style = filled;
        color = cornsilk;
    }

    subgraph cluster_content_script {
        cs_topee_iframe_request [ label="'topee_iframe_request'" ]
        cs_window_addEventListener [ label="window.addEventListener" ]
        cs_safari_extension_dispatchMessage [ label="safari.extension.dispatchMessage" ]
        cs_safari_self_addEventListener [ label="safari.self.addEventListener"; shape=polygon; sides=4; skew=.2; ]
        cs_event_source_postMessage [ label="event.source.postMessage"]

        cs_window_addEventListener -> cs_topee_iframe_request [ style="dashed" ]
        cs_topee_iframe_request -> cs_safari_extension_dispatchMessage
        cs_topee_iframe_request -> cs_safari_self_addEventListener [ style="dashed"; label="listener message id?" ]
        
        cs_safari_extension_dispatchMessage -> swift_safariextensionhandler
        
        swift_dispatchMessageToScript -> cs_safari_self_addEventListener [ color=darkred ]
        cs_safari_self_addEventListener -> cs_event_source_postMessage [ color=darkred ]  
        
        label = "content script";
        style = filled;
        color = cornsilk;
    }

    subgraph cluster_iframe {
        "safari.self.addEventListener" [ shape=polygon; sides=4; skew=.2; ]
        "chrome.runtime.sendMessage" -> "background-bridge.dispatchRequest"
        "background-bridge.dispatchRequest" -> "safari.self.addEventListener" [ label="callback?" ]
        "background-bridge.dispatchRequest" -> "safari.extension.dispatchMessage"
        "safari.self.addEventListener" -> "window.addEventListener"
        "window.addEventListener" -> "decryptingCallback" [ style="dashed" ]
        "got encryption key?" [ shape=none ]
        "safari.extension.dispatchMessage" -> "got encryption key?"
        "got encryption key?" -> bufferMessage [ label="-" ]        
        "got encryption key?" -> dispatchMessage [ label="+" ]
        bufferMessage -> dispatchMessage [ style="dashed" ]
        dispatchMessage -> "window.parent.postMessage"
        freshListeners [ shape=ellipse ]
        "safari.self.addEventListener" -> freshListeners -> dispatchMessage [ label="listener message id" style=dashed ]
        "window.parent.postMessage" -> cs_topee_iframe_request [ label=AES ]
        
        cs_event_source_postMessage -> "decryptingCallback" [ color=darkred; label=AES ]           
        "decryptingCallback" -> response  [ color=darkred; label=callback ]
        
//        "safari.self.addEventListener" -> cs_safari_self_addEventListener [ style=dotted;]          
        
        label = "safari-extension:// iframe";
        style = filled;
        color = cornsilk;
    }
    
    subgraph cluster_extension {
        response
        request -> "chrome.runtime.sendMessage"

        label = "extension";
        style = filled;
        color = cornsilk;
    }

}
