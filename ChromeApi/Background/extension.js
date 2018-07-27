(function () {
'use strict';

  if (!window.chrome) {
    window.chrome = {};
  };
 
  window.chrome.extension = {
    getURL: function(path) {
      return window.location.origin + path;
    }
  };
})();
