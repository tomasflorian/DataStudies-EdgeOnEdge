#!/usr/bin/env bash
# The layers point one way. Nothing but display/ itself, check/ and the eoe.ts CLI may import
# display/, and core/ may import neither middle/ nor display/.
cd "$(dirname "$0")/.."
fail=0
while IFS= read -r hit; do echo "display/ imported outside display: $hit"; fail=1; done < <(
  grep -rnE "from ['\"][./]*display/" --include='*.ts' . \
    | grep -v node_modules | grep -vE '^\./(display/|check/|eoe\.ts:)')
while IFS= read -r hit; do echo "core/ reaches upward: $hit"; fail=1; done < <(
  grep -nE "from ['\"][./]*(middle|display)/" core/*.ts)
[ $fail = 0 ] && echo "layers ok"
exit $fail
