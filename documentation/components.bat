//./c:/progra~2/Graphviz/bin/dot.exe -Tsvg "%~f0" > "%~dpn0.svg" & exit /b

digraph Topee_Components {
    node [shape = rectangle ];

    subgraph cluster_Appex {
        SFSafariExtensionHandler [ style="filled" fillcolor="#33DC76" ];
        SafariExtensionBridge [ style="filled" fillcolor="#33DC76" ];
        SFSafariExtensionHandler -> SafariExtensionBridge;
        
        bgcolor="#CCF6DD";
        label = "App Extension";
    }
    
    subgraph cluster_WebView {
        topee_background [ label = "topee_background.js" style="filled" fillcolor="#DC7633" ];
        extension_background [ label = "chrome extension background.js" style="filled" fillcolor="#DC7633" ];
        topee_background -> extension_background;
        bgcolor="#F6DDCC";
        label = "WebView";
    }
    
    SafariExtensionBridge -> topee_background;

    subgraph cluster_Safari {
        subgraph cluster_Tab1 {
          topee_content1 [ label = "topee_content.js" style="filled" fillcolor="#76DC33" ];
          extension_content1 [ label = "chrome extension content.js" style="filled" fillcolor="#76DC33" ];
          extension_content1 -> topee_content1;
          bgcolor="#DDF6CC";
          label = "facebook.com"
        }
        
        subgraph cluster_Tab2 {
          topee_content2 [ label = "topee_content.js" style="filled" fillcolor="#76DC33" ];
          extension_content2 [ label = "chrome extension content.js" style="filled" fillcolor="#76DC33" ];
          extension_content2 -> topee_content2;
          bgcolor="#DDF6CC";
          label = "gmail.com"
        }
        
        subgraph cluster_Tab3 {
          topee_content3 [ label = "topee_content.js" shape="plaintext" fontcolor="#DDF6CC" ];
          extension_content3 [ label = "chrome extension content.js" shape="plaintext" fontcolor="#DDF6CC" ];
          extension_content3 -> topee_content3 [ color="transparent" ];
          bgcolor="#DDF6CC";
          label = "..."
        }
        
        topee_content1 -> SFSafariExtensionHandler [ label = SFSafariPage ]; 
        topee_content2 -> SFSafariExtensionHandler [ label = SFSafariPage ]; 
        topee_content3 -> SFSafariExtensionHandler [ label = SFSafariPage ];
         
        bgcolor="#EEFBE6";
        label = "Safari tabs";
    }
}
