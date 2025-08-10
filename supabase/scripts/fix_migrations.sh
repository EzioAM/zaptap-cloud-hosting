#!/bin/bash

cd /Users/marcminott/Documents/DevProject/ShortcutsLike/supabase/migrations

# Create a temporary directory for backup
mkdir -p ../migrations_backup
cp *.sql ../migrations_backup/ 2>/dev/null

# Remove all improperly named files
counter=1

for file in *.sql; do
    # Skip files that already have the correct format (8 digits underscore)
    if [[ $file =~ ^[0-9]{8}_.+\.sql$ ]] && [[ ! $file =~ ^20240100 ]]; then
        echo "Keeping: $file"
    else
        # Extract the meaningful part of the filename
        base_name=$(echo "$file" | sed 's/^[0-9]*_//')
        
        # Generate new timestamp (using 20240201 as base + counter)
        new_timestamp=$(printf "20240201%02d" $counter)
        new_name="${new_timestamp}_${base_name}"
        
        echo "Renaming: $file -> $new_name"
        mv "$file" "$new_name"
        counter=$((counter + 1))
    fi
done

echo "Migration files fixed!"
ls -la *.sql | head -20