build: node_modules
	npx webpack

test: node_modules
	npx jasmine

node_modules: package.json package-lock.json
	npm install
	touch node_modules

