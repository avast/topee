var getSubstitutionsMessage = require('../Common/i18n-getmessage.js');

var EN = {
    "multi_placeholders": {
        "description": "A message with two placeholders",
        "message": "Visit <a href='$serverUrl$' target='_blank'>$serverHost$</a>.",
        "placeholders": {
            "serverUrl": {
                "content": "$1",
                "example": "https://example.com"
            },
            "serverHost": {
                "content": "$2",
                "example": "example.com"
            }
        }
    },
    "single_placeholder": {
        "description": "A message with a placeholder",
        "message": "You clicked $URL$.",
        "placeholders": {
            "url" : {
                "content" : "$1",
                "example" : "https://example.com"
            }
        }
    },
    "no_placeholder": {
        "description": "A plain message",
        "message": "Hello world"
    },
    "dollars": {
        "description": "A plain message with dollar signs",
        "message": "Hello $world$"
    }
};

describe("i18n", function () {
    it("finds a simple message", function () {
        expect(getSubstitutionsMessage(EN, "no_placeholder")).toBe("Hello world");
    });

    it("returns the key if message is not found", function () {
        expect(getSubstitutionsMessage(EN, "no_message")).toBe("no_message");
    });

    it("replaces a placeholder with a substitution", function () {
        expect(getSubstitutionsMessage(EN, "single_placeholder", "https://github.com")).toBe("You clicked https://github.com.");
    });

    it("replaces a placeholder with an empty string if a substitution is missing", function () {
        expect(getSubstitutionsMessage(EN, "single_placeholder")).toBe("You clicked .");
    });

    it("keeps dollared substrings that are not placeholders", function () {
        expect(getSubstitutionsMessage(EN, "dollars")).toBe("Hello $world$");
    });

    it("replaces multiple placeholders with substitutions", function () {
        expect(getSubstitutionsMessage(EN, "multi_placeholders", ["https://github.com", "github"])).toBe("Visit <a href='https://github.com' target='_blank'>github</a>.");
    });
});
