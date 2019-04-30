#!/bin/bash

if [ -z $1 ]; then
  echo "Enter a background script file to verify"
  exit 1;
fi

if [ ! -e $1 ]; then
  echo "Cannot find" $1
  exit 1;
fi
mkdir -p tmp
cp $1 tmp
BG=`basename $1`

echo "require('./safari.js');" > index.js
echo "require('../../src/Framework/Build/topee-background.js');" >> index.js
echo "require('./init.js');" >> index.js
echo "require('./tmp/$BG')" >> index.js
echo "require('./reporter.js');" >> index.js
