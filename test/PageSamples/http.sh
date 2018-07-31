#!/bin/bash
cd `dirname "$0"`
echo Starting HTTP server in `pwd` on http://localhost:8001
python -m SimpleHTTPServer 8001 &
echo Starting HTTP server in `pwd` on http://localhost:8000
python -m SimpleHTTPServer 8000
kill `jobs -p`
