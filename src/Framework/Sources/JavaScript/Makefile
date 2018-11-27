build: node_modules
	npx webpack

lint: node_modules
	npx eslint Background/ Content/ IframeResources/ Common/
	echo
	echo "Checking for arrow functions usage in background scripts"
	if grep -r --line-number " => " Background Common; then exit 1; else exit 0; fi

test: node_modules lint
	npx jasmine

node_modules: package.json package-lock.json
	npm install
	touch node_modules

