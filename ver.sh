#!/usr/bin/env bash
$(npm version $1)
#npm publish
#PACKAGE_VERSION=$(cat package.json \
#  | grep version \
#  | head -1 \
#  | awk -F: '{ print $2 }' \
#  | sed 's/[",]//g')
#git commit -am "$PACKAGE_VERSION"
#git push
