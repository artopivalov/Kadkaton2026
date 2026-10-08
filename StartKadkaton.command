#!/bin/zsh
# Double-click in Finder: builds everything, starts the multiplayer server with a public tunnel,
# and opens the launcher page. Close this window (or press Ctrl+C) to stop the server.
cd -- "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
pause() { read -k 1 '?Press any key to close this window...'; }
if ! command -v node >/dev/null 2>&1; then
  print 'Node.js was not found. Install Node.js and open this file again.'
  pause
  exit 1
fi
# The multiplayer server needs its dependency (ws).
if [[ ! -d node_modules/ws ]]; then
  print 'Installing dependencies (first run only)...'
  npm install || { print '\nCould not install dependencies. See the messages above.'; pause; exit 1; }
fi
# Already running: just open the launcher again.
if curl --silent --fail --max-time 2 http://localhost:8700/launcher.html >/dev/null; then
  open http://localhost:8700/launcher.html
  exit 0
fi
if ! command -v cloudflared >/dev/null 2>&1; then
  print 'Note: cloudflared is not installed, so there will be no public link. Players on your network can still join.'
fi
npm run launch
result=$?
if (( result != 0 )); then
  print '\nKadkaton could not start. See the messages above.'
  pause
fi
exit "$result"
