#!/bin/bash
# Run this after cloning the project to remove old route stubs
# that conflict with the (app) route group

cd "$(dirname "$0")/../src/app"

rm -rf dashboard/layout.tsx dashboard/page.tsx
rm -rf templates/page.tsx
rm -rf settings/page.tsx
rm -rf consultation/

echo "Old route stubs cleaned up. The (app)/ route group is now the sole source."
