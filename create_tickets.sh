#!/bin/bash

# Load PAT from .env file
if [ -f .env ]; then
  # Using set -a to export all variables defined in .env
  # and source to execute .env in the current shell context.
  set -o allexport
  source .env
  set +o allexport
fi

# Configuration for Azure DevOps
ORG="simonholmesabc"
PROJECT="GiftGPT"

# --- IMPORTANT: Verify Work Item Type Name ---
# Set the Work Item Type for User Stories.
# Double-check this name in your Azure DevOps project settings.
# For example, if your project uses the "Scrum" process template,
# this might be "Product Backlog Item" instead of "User Story".
WORK_ITEM_TYPE="User Story"

# Array of User Stories to be created
# Each element is a string with "Title|Description"
USER_STORIES=(
  "LLM System Prompt|As a developer, I want to revie and modify the LLM system prompt so that it can be tailored to the specific needs of the GiftGPT application."
  )

# Check if PAT is set
if [ -z "$PAT" ]; then
  echo "Error: PAT (Personal Access Token) is not set."
  echo "Please ensure it is defined in your .env file (e.g., PAT=\"yourtoken\") or as an environment variable."
  exit 1
fi

# Clean PAT: Remove potential carriage returns (e.g., from Windows line endings in .env)
PAT=$(echo "$PAT" | tr -d '\r')
echo "DEBUG: PAT loaded. Length: ${#PAT}" # For debugging, can be removed if PAT is sensitive

echo "Starting to create work items in Azure DevOps..."
echo "Organization: $ORG"
echo "Project: $PROJECT"
echo "Work Item Type: $WORK_ITEM_TYPE"
echo ""

# Loop through the USER_STORIES array and create each one
for STORY in "${USER_STORIES[@]}"; do
  # Extract Title and Description using parameter expansion
  # Title is everything before the first '|'
  TITLE="${STORY%%|*}"
  # Description is everything after the first '|'
  DESCRIPTION="${STORY#*|}"

  echo "Attempting to create ${WORK_ITEM_TYPE}:"
  echo "  Title: $TITLE"
  # echo "  Description: $DESCRIPTION" # Description can be long, optionally comment out for cleaner logs

  # URL encode the work item type name for the path.
  # This replaces spaces with %20.
  # The Azure DevOps API expects the '$' prefix for the work item type name in the URL.
  ENCODED_WORK_ITEM_TYPE_NAME="${WORK_ITEM_TYPE// /%20}"

  # Azure DevOps REST API endpoint for creating work items
  # The '\$' ensures a literal dollar sign is part of the URL, followed by the encoded type name.
  API_URL="https://dev.azure.com/$ORG/$PROJECT/_apis/wit/workitems/\$${ENCODED_WORK_ITEM_TYPE_NAME}?api-version=7.0"

  # For debugging the URL:
  # echo "  DEBUG: API URL: $API_URL"

  # Make the API call using curl
  # --data-binary @- reads the data for the POST request from stdin, supplied by the heredoc.
  TMP_STDERR_FILE=$(mktemp)

  RESPONSE_CODE=$(curl --show-error --silent \
    -u ":$PAT" \
    -X POST \
    -H "Content-Type: application/json-patch+json" \
    -H "Expect:" \
    "$API_URL" \
    --data-binary @- <<EOF 2>"$TMP_STDERR_FILE"
[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "$TITLE"
  },
  {
    "op": "add",
    "path": "/fields/System.Description",
    "value": "$DESCRIPTION"
  }
]
EOF
)
  # The 2>"$TMP_STDERR_FILE" redirects stderr of the curl command to the temp file.
  # The command substitution $(...) captures stdout of the curl command (which is the HTTP code).
  
  CURL_EXIT_CODE=$? # Capture curl's own exit code

  if [ "$CURL_EXIT_CODE" -ne 0 ]; then
    # This block executes if curl itself failed (e.g., couldn't connect, bad URL before HTTP)
    echo "  Error: curl command itself failed with exit code $CURL_EXIT_CODE."
    echo "  Curl stderr output:"
    cat "$TMP_STDERR_FILE"
    if [ "$RESPONSE_CODE" == "000" ] || [ -z "$RESPONSE_CODE" ]; then # Check if RESPONSE_CODE is 000 or empty
        echo "  HTTP response code was '$RESPONSE_CODE', indicating a curl internal error (e.g., connection, DNS, URL parsing)."
    fi
  elif [ "$RESPONSE_CODE" -eq 200 ]; then
    echo "  Successfully created ${WORK_ITEM_TYPE}: '$TITLE' (HTTP $RESPONSE_CODE)"
  else
    # This block executes if curl got an HTTP response, but it wasn't 200 OK.
    echo "  Error creating ${WORK_ITEM_TYPE}: '$TITLE' (HTTP $RESPONSE_CODE)"
    echo "  Server/Curl stderr output (may contain API error details):"
    cat "$TMP_STDERR_FILE"
  fi
  
  rm -f "$TMP_STDERR_FILE"
  echo "" # Newline for better readability between items

done

echo "Script finished."