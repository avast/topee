build: node_modules
	npx webpack

lint: node_modules
	npx eslint Background/ Content/

test: node_modules lint
	npx jasmine

node_modules: package.json package-lock.json
	npm install
	touch node_modules

