#!/bin/bash

# Rollback script for Calendar mobile UI changes
echo "Rolling back Calendar mobile UI changes..."

# Restore Calendar.tsx from backup
cp /Users/andreichiper/Documents/DeGarda/src/components/Calendar.tsx.backup /Users/andreichiper/Documents/DeGarda/src/components/Calendar.tsx

# Restore globals.css
cd /Users/andreichiper/Documents/DeGarda
git checkout src/app/globals.css

echo "Rollback complete! Calendar has been restored to the previous version."
echo "You may need to restart your development server."