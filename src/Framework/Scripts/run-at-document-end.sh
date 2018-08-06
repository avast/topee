#! /usr/bin/env bash

# set -o xtrace
set -o nounset
set -o errexit
set -o pipefail

function help() {

    cat<<-EOF
	Wraps the given javascript to ensure that it will run after the DOM content 
    has been loaded.
	./$(basename "$0") [FILE_JS]
	
	Parameters
	- FILE_JS   Path to the javascript file to be wrapped
	EOF
}
function main() {

    local -r ORIGINAL_JS="${1:-}"

    if [[ -z "${ORIGINAL_JS}" ]]; then
        help
        exit 2
    fi

    if [[ ! -f "${ORIGINAL_JS}" ]]; then
        echo "${ORIGINAL_JS} is not a valid file path." >&2
        exit 2
    fi

    cat<<-EOF
	(function () {
	var contentInjected = false;

	if (!document.body) {
	    document.removeEventListener("pageshow", injectContentOnce);
	    document.addEventListener("pageshow", injectContentOnce);
	    document.removeEventListener("DOMContentLoaded", injectContentOnce);
	    document.addEventListener("DOMContentLoaded", injectContentOnce);
	}
	else {
	    document.removeEventListener("pageshow", injectContentOnce);
	    document.addEventListener("pageshow", injectContentOnce);
	    injectContentOnce();
	}
	
	function injectContentOnce() {
	    if (contentInjected) {
	        return;
	    }
	    contentInjected = true;
	    injectContent();
	}

	function injectContent() {
	$(cat "$ORIGINAL_JS") 
	}
	})();
	EOF
}

main "$@"

