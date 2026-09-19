#!/usr/bin/env sh
# Thin wrapper: the real script is setup.mjs, so Windows and Unix run the same code.
exec node "$(dirname "$0")/setup.mjs" "$@"
