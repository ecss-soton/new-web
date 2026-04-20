#!/bin/bash

# Check if a backup file was provided
if [[ $# -eq 0 ]] ; then
    echo 'Error: Please provide a backup file to restore from as the first argument.'
    exit 1
fi

BACKUP_FILE="$1"
TMP_DIR="./tmp_restore_db"

echo "Starting local restore process..."

# 1. Create a temporary directory for extraction
mkdir -p "$TMP_DIR"

# 2. Extract the backup tarball
echo "Extracting $BACKUP_FILE..."
tar -xzf "$BACKUP_FILE" -C "$TMP_DIR"

# 3. Remove MacOS specific meta-files from extract safely
find "$TMP_DIR" -name "._*" -type f -delete

# 4. Restore the database
# Pointing specifically to the mongo_dump folder inside the extracted tarball
echo "Restoring to local MongoDB instance..."
mongorestore --drop --nsInclude="ecss-website-cms.*" "$TMP_DIR/mongo_dump"

# 5. Clean up the temporary folder
echo "Cleaning up temporary files..."
rm -rf "$TMP_DIR"

echo "Database restore complete!"