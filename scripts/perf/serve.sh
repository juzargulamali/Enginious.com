#!/usr/bin/env bash
# serve.sh [port]  : stop any previous production server started by this script, then start a new one on the port.
cd "$(dirname "$0")/../.."
PORT=${1:-3300}; PID=/tmp/claude-0/serve-$PORT.pid
[ -f $PID ] && kill $(cat $PID) 2>/dev/null; sleep 1
nohup node node_modules/next/dist/bin/next start -p $PORT > /tmp/claude-0/serve-$PORT.log 2>&1 &
echo $! > $PID; sleep 4; curl -s -o /dev/null -w "serving on $PORT: %{http_code}\n" localhost:$PORT/
