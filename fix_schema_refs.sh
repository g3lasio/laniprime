#!/bin/bash
# Fix common PostgreSQL schema field name mismatches

# Fix content items fields
find app -name "*.tsx" -type f -exec sed -i 's/\.content\>/\.body/g' {} \;
find app -name "*.tsx" -type f -exec sed -i 's/\.caption\>/\.body/g' {} \;
find app -name "*.tsx" -type f -exec sed -i 's/\.type\>/\.contentType/g' {} \;
find app -name "*.tsx" -type f -exec sed -i 's/\.thumbnailUrl\>/\.imageUrl/g' {} \;
find app -name "*.tsx" -type f -exec sed -i 's/\.platforms\>/\.platform/g' {} \;

# Fix scheduled posts fields
find app -name "*.tsx" -type f -exec sed -i 's/\.scheduledAt\>/\.scheduledFor/g' {} \;

# Fix subscription fields
find app -name "*.tsx" -type f -exec sed -i 's/subscription\.tier/subscription.stripePriceId/g' {} \;

echo "Schema field references fixed"
