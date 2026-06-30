#!/bin/bash
# Auto-fix script: runs after Vercel authentication completes
# Usage: bash auto-fix.sh [your-vercel-token]

set -e

VERCEL_TOKEN="${1:-$VERCEL_TOKEN}"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ ERROR: VERCEL_TOKEN not provided."
  echo "Usage: bash auto-fix.sh <vercel-token>"
  echo "   or: export VERCEL_TOKEN=<token> && bash auto-fix.sh"
  exit 1
fi

echo "🚀 Starting WardList Vercel Git Connection Fix..."

cd /workspace/wardlist

# Step 1: Link to existing project
echo "📡 Step 1/5: Linking to existing Vercel project 'wardlist'..."
npx vercel link --project wardlist --token "$VERCEL_TOKEN" --yes
echo "✅ Project linked"

# Step 2: Connect Git repository
echo "🔗 Step 2/5: Connecting GitHub repo..."
npx vercel git connect "https://github.com/Agyeman-Enterprises/wardlist.git" --token "$VERCEL_TOKEN"
echo "✅ Git repo connected"

# Step 3: Deploy with Git tracking
echo "🚀 Step 3/5: Deploying with Git tracking..."
npx vercel deploy --prod --token "$VERCEL_TOKEN"
echo "✅ Deployment created"

# Step 4: Extract project IDs
echo "📋 Step 4/5: Extracting project IDs..."
if [ -f .vercel/project.json ]; then
  VERCEL_ORG_ID=$(cat .vercel/project.json | jq -r '.orgId')
  VERCEL_PROJECT_ID=$(cat .vercel/project.json | jq -r '.projectId')
  echo "  VERCEL_ORG_ID: $VERCEL_ORG_ID"
  echo "  VERCEL_PROJECT_ID: $VERCEL_PROJECT_ID"
  echo "✅ Project IDs extracted"
else
  echo "⚠️  .vercel/project.json not found — project linking may have failed"
fi

# Step 5: Set GitHub Actions secrets
echo "🔐 Step 5/5: Setting GitHub Actions secrets..."
echo "  To set secrets, install gh CLI or use:"
echo "  gh secret set VERCEL_TOKEN --body \"\$VERCEL_TOKEN\" --repo Agyeman-Enterprises/wardlist"
echo "  gh secret set VERCEL_ORG_ID --body \"$VERCEL_ORG_ID\" --repo Agyeman-Enterprises/wardlist"
echo "  gh secret set VERCEL_PROJECT_ID --body \"$VERCEL_PROJECT_ID\" --repo Agyeman-Enterprises/wardlist"

echo ""
echo "✅ DONE! Verification steps:"
echo "  1. Visit https://vercel.com/dashboard — check wardlist project shows Git repo"
echo "  2. Visit https://github.com/Agyeman-Enterprises/wardlist/actions — run deploy workflow"
echo "  3. curl -sI https://wardlist.vercel.app"
echo "  4. curl -sI https://wardlist.agyemanenterprises.com"
