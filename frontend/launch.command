#!/bin/bash

# Define the Flask endpoint URL
URL="http://localhost:5000/postdata"
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

# export PATH=/usr/local/bin:$PATH
# Get the $PATH environment variable
PATH_VARIABLE=$PATH
whoami=$(whoami)
KUBECTL_PATH=$(which -a kubectl | head -n 1)
SH_PATH=$(which -a sh | head -n 1)

KUBECTL_DIR=(dirname "$KUBECTL_PATH")

# Create a JSON payload
JSON_PAYLOAD="{\"path\": \"$PATH_VARIABLE\"}"
JSON_PAYLOAD_KUBE="{\"kube_path\": \"$KUBECTL_PATH\"}"
JSON_PAYLOAD_SH="{\"sh_path\": \"$SH_PATH\"}"
JSON_PAYLOAD_W="{\"whoami\": \"$whoami\"}"
JSON_PAYLOAD_KUBE="{\"kube env\": \"$ZETAFORGE_KUBE_ROOT\"}"

# Use curl to send the POST request with the JSON payload
curl -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD" "$URL"
curl -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD_KUBE" "$URL"
curl -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD_SH" "$URL"
curl -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD_W" "$URL"
curl -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD_KUBE" "$URL"


./ZetaForge
