//./c:/progra~2/Graphviz/bin/dot.exe -Tsvg "%~f0" > "%~dpn0.svg" & exit /b

digraph Avast_Password_Manager {
    rankdir = LR;
    node [shape = rectangle ];

    subgraph cluster_Topee {
        requestHandlers [ label = "request handlers [swift]"; ];
        chromeApi [ label = "background script chrome API [js]"; ];
        contentMsg [ label = "content script chrome API [js]"; ];
        requestHandlers -> webView;
        webView -> chromeApi;
        chromeApi -> webView; 
        webView -> requestHandlers;
        contentMsg -> requestHandlers;
        
        label = "Topee";
        style = filled;
        color = blanchedalmond;
    }

    subgraph cluster_Extension {
        carthage [ shape=polygon; sides=4; skew=.2; label = "get & build Topee via Carthage"; ];
        resources [ shape=polygon; sides=4; skew=.2; label = "prepare scripts as appex resources"; ];

        backgroundScript [ label = "background script [js]"; ];
        contentScript [ label = "content script [js]"; ];
        platformCode [ label = "platform code (Topee setup) [swift]"; ];
    
        backgroundScript -> chromeApi;
        contentScript -> contentMsg;
        platformCode -> requestHandlers;
        platformCode -> webView;

        label = "Cross-browser extension project using Topee";
    }
}
