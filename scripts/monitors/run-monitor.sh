#!/bin/sh
# Cron wrapper for the attestto-trust root-cert monitors.
#
# cron runs jobs with a minimal PATH, so `node`/`unzip`/`git` may not
# resolve the way they do in your interactive shell — set an explicit
# PATH covering common Homebrew + system locations before invoking node.
#
# Usage (crontab): 0 9 * * * /path/to/attestto-trust/scripts/monitors/run-monitor.sh cl
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR" || exit 1

ISO2="${1:?usage: run-monitor.sh <iso2>}"

node scripts/monitors/run.mjs "$ISO2" >> "countries/$ISO2/.monitor.log" 2>&1
