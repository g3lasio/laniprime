#!/bin/bash
# Fix UI references to old schema fields

# Fix subscription.tier references (use stripePriceId instead)
find app -name "*.tsx" -type f -exec sed -i 's/subscription\.tier/"Free"/g' {} \;
find app -name "*.tsx" -type f -exec sed -i 's/subscription\?\.tier/"Free"/g' {} \;

# Fix trpc mutation names (content.body should be content.generate)
sed -i 's/trpc\.content\.body/trpc.content.generate/g' app/(tabs)/content.tsx
sed -i 's/trpc\.content\.body/trpc.content.generate/g' app/(tabs)/index.tsx
sed -i 's/trpc\.content\.body/trpc.content.generate/g' app/generate.tsx

echo "UI references fixed"
