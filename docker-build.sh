#!/bin/sh

docker build . -f Dockerfile.execForm -t node-exec-form &
docker build . -f Dockerfile.shellForm -t node-shell-form &
docker build . -f Dockerfile.withTini -t node-with-tini