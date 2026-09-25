#!/bin/bash

# Check if a commit message was provided
if [ -z "$1" ]; then
  echo "No commit message provided."
  echo "Usage: ./gitpush.sh \"Your commit message here\""
  COMMIT_MSG="Auto commit on $(date '+%Y-%m-%d %H:%M:%S')"
else
  COMMIT_MSG="$1"
fi

# Print current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Pushing to branch: $BRANCH"

# Add all changes
git add --all
echo "All changes staged."

# Commit changes
git commit -m "$COMMIT_MSG"
echo "Commit message: '$COMMIT_MSG'"

# Push to current branch
git push origin "$BRANCH"
echo "Changes pushed to remote repository!"

