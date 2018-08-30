const WebCrypto = require('node-webcrypto-ossl');
global.crypto = new WebCrypto();

describe('binary conversion', function () {
    const bc = require('../Common/binary-conversion.js');
    const bytes = [ 2, 245 ];
    const strbytes = '\x02\xF5';
    const unibytes = '\uFF02\uFFF5';
    const peopleEmoticons = '\u{1F600}\u{1F498}';
    const b64 = 'AvU=';

    it('converts string to Uint8Array', function () {
        const ua = bc.str2uint8array(strbytes);
        expect(ua.length).toBe(2);
        expect(ua[0]).toBe(bytes[0]);
        expect(ua[1]).toBe(bytes[1]);
    });

    it('throws on non-ASCII characters', function () {
        expect(function () { bc.str2uint8array(unibytes); }).toThrow();
    });

    it('throws on UCS-2 characters', function () {
        expect(function () { bc.str2uint8array(peopleEmoticons); }).toThrow();
    });

    it('converts string to ArrayBuffer', function () {
        const ab = bc.str2arrayBuffer(strbytes);
        const ua = new Uint8Array(ab);
        expect(ua.length).toBe(2);
        expect(ua[0]).toBe(bytes[0]);
        expect(ua[1]).toBe(bytes[1]);
    });

    it('converts Uint8Array to string', function () {
        const ua = new Uint8Array(bytes);
        expect(bc.uint8array2str(ua)).toBe(strbytes);
    });

    it('converts ArrayBuffer to string', function () {
        const ua = new Uint8Array(bytes);
        expect(bc.arrayBuffer2str(ua.buffer)).toBe(strbytes);
    });

    it('converts Uint8Array to base64', function () {
        const ua = new Uint8Array(bytes);
        expect(bc.uint8array2base64(ua)).toBe(b64);
    });

    it('converts ArrayBuffer to base64', function () {
        const ua = new Uint8Array(bytes);
        expect(bc.arrayBuffer2base64(ua.buffer)).toBe(b64);
    });

    it('converts base64 to Uint8Array', function () {
        const ua = bc.base642uint8array(b64);
        expect(ua.length).toBe(2);
        expect(ua[0]).toBe(bytes[0]);
        expect(ua[1]).toBe(bytes[1]);
    });

    it('converts base64 to ArrayBuffer', function () {
        const ab = bc.base642arrayBuffer(b64);
        const ua = new Uint8Array(ab);
        expect(ua.length).toBe(2);
        expect(ua[0]).toBe(bytes[0]);
        expect(ua[1]).toBe(bytes[1]);
    });
});

describe('aes crypto', function () {
    const aesCrypto = require('../Common/aes-crypto.js');

    it('generates 16 byte salt', function () {
        expect(aesCrypto.createSalt().length).toBe(16);
    });

    it('exports and imports keys', async function () {
        const data = new Uint8Array([1, 2, 3]);
        const salt = aesCrypto.createSalt();
        const key1 = await aesCrypto.createKey();
        const jwkKey = await aesCrypto.exportKey(key1);
        const key2 = await aesCrypto.importKey(jwkKey);

        const enc1 = await aesCrypto.encrypt(data.buffer, salt, key1);
        const enc2 = await aesCrypto.encrypt(data.buffer, salt, key2);

        expect(enc1).toEqual(enc2);
    });

    it('encrypts and decrypts', async function () {
        const data = new Uint8Array([1, 2, 3]);
        const salt = aesCrypto.createSalt();
        const key = await aesCrypto.createKey();

        const enc = await aesCrypto.encrypt(data.buffer, salt, key);
        const dec = new Uint8Array(await aesCrypto.decrypt(enc, salt, key));

        expect(dec.length).toBe(3);
        expect(dec[0]).toBe(1);
        expect(dec[1]).toBe(2);
        expect(dec[2]).toBe(3);
    });
});

describe('TextCrypto', function () {
    const TextCrypto = require('../Common/text-crypto.js');
    it("decodes back from encoded", async function () {
        let encoder = new TextCrypto();
        await encoder.readyPromise;

        const textKey = await encoder.getKey();
        expect(typeof textKey).toBe('string');

        let decoder = new TextCrypto(textKey);
        await decoder.readyPromise;

        const input = 'hello world';

        const encrypted = await encoder.encrypt(input);
        expect(typeof encrypted.data).toBe('string');
        expect(typeof encrypted.salt).toBe('string');

        const output = await decoder.decrypt(encrypted);

        expect(output).toBe(input);
    });
});
