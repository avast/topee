function uint8array2str(ua) {
  var chars = [];
  ua.forEach(byte => chars.push(String.fromCharCode(byte)));
  return chars.join('');
}

function arrayBuffer2str(ab) {
  return uint8array2str(new Uint8Array(ab));
}

function str2uint8array(s) {
  return new Uint8Array([].map.call(s,function(x){var c = x.charCodeAt(0); if (c > 0xFF) throw s + ': cannot convert non-ASCII character'; return c; }));
}

function str2arrayBuffer(s) {
  return str2uint8array(s).buffer; 
}


function uint8array2base64(ua) {
  return btoa(uint8array2str(ua)); 
}

function arrayBuffer2base64(ab) {
  return btoa(arrayBuffer2str(ab)); 
}

function base642uint8array(b64) {
  return str2uint8array(atob(b64));
}

function base642arrayBuffer(b64) {
  return str2arrayBuffer(atob(b64));
}

module.exports = {
  uint8array2str: uint8array2str,
  arrayBuffer2str: arrayBuffer2str,
  
  str2uint8array: str2uint8array,
  str2arrayBuffer: str2arrayBuffer,
  
  uint8array2base64: uint8array2base64,
  arrayBuffer2base64: arrayBuffer2base64,
  
  base642uint8array: base642uint8array,
  base642arrayBuffer: base642arrayBuffer
};
