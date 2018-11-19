BUILD_DIR = $(shell pwd)/build
CONFIGURATION = Release
PACKAGE = Topee.framework.zip
SCHEME = Topee
SRCROOT = src
WORKSPACE = src/Topee.xcworkspace
REVISION = $(shell git rev-list --count --no-merges HEAD)
VERSION = $(shell /usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" src/Framework/Support/Sources/Info.plist)

build:
	@xcodebuild\
		-workspace "$(WORKSPACE)"\
		-scheme "$(SCHEME)" clean build\
		CONFIGURATION="$(CONFIGURATION)"\
		BUILD_DIR="$(BUILD_DIR)"

format:
	swiftformat .

package: build
	(cd "$(BUILD_DIR)/$(CONFIGURATION)" && zip -yr "$(PACKAGE)" .)

# Usage: make bump-version VERSION=X.Y.Z
bump-version:
	@printf "Bumping version to $(VERSION).$(REVISION)..."	
	@find "$(SRCROOT)" -type f -name "Info.plist"\
		-exec /usr/libexec/PlistBuddy -c "set CFBundleShortVersionString $(VERSION)" {} \;\
		-exec /usr/libexec/PlistBuddy -c "set CFBundleVersion $(REVISION)" {} \;
	@printf "success!\n"

open:
	open "$(WORKSPACE)"

clean:
	rm -rf Carthage
	rm -rf "$(BUILD_DIR)"
	rm -rf src/Framework/Build

.PHONY: build bootstrap format package clean
.DEFAULT_GOAL := build
