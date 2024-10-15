#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

source ~/.zshrc
source ~/.bash_profile

while read -r line; do
    if [[ ":$PATH:" != *":$line:"* ]]; then
        PATH="$line:$PATH"
    fi
done < /etc/paths

export PATH




./ZetaForge
