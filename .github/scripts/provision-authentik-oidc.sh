#!/usr/bin/env bash
# provision-authentik-oidc.sh — Create wardlist OAuth2/OIDC app in Authentik
# Requires: AUTHENTIK_API_TOKEN env var (create at auth.agyemanenterprises.com/if/user/#/tokens)
# Usage: AUTHENTIK_API_TOKEN=<token> bash provision-authentik-oidc.sh
set -euo pipefail

AUTH_BASE="${AUTH_BASE:-https://auth.agyemanenterprises.com}"
CLIENT_ID="wardlist"
APP_NAME="WardList"
APP_SLUG="wardlist"
DRY_RUN="${DRY_RUN:-false}"

# Redirect URIs — both production deployments
REDIRECT_URI_1="https://wardlist.app/"
REDIRECT_URI_2="https://wardlist.agyemanenterprises.com/"

if [ -z "${AUTHENTIK_API_TOKEN:-}" ]; then
  echo "ERROR: AUTHENTIK_API_TOKEN not set."
  echo ""
  echo "To get a token:"
  echo "  1. Log in to ${AUTH_BASE}/if/user/"
  echo "  2. Go to Settings → Tokens → Create Token"
  echo "     Name: wardlist-cli, Intent: API, Expiry: never"
  echo "  3. Copy the key value"
  echo "  4. Set as GitHub secret: AUTHENTIK_API_TOKEN"
  echo "  5. Run this workflow again"
  echo ""
  echo "OR — if akadmin password is available:"
  echo "  Run: docker exec -it authentik-server ak shell"
  echo "  Then: from authentik.core.models import Token, TokenIntents, User"
  echo "        user = User.objects.get(username='akadmin')"
  echo "        t = Token.objects.create(user=user, identifier='wardlist-cli', intent=TokenIntents.Intent.API)"
  echo "        print(t.key)"
  exit 1
fi

API="${AUTH_BASE}/api/v3"
HEADERS=(-H "Authorization: Bearer ${AUTHENTIK_API_TOKEN}" -H "Content-Type: application/json" -H "Accept: application/json")

echo "=== Authentik OIDC Provisioner — WardList ==="
echo "Auth: ${AUTH_BASE}"
echo "Dry run: ${DRY_RUN}"
echo ""

# Step 1: Verify token works
echo "Step 1: Verifying API token..."
USER_INFO=$(curl -s "${API}/core/users/me/" "${HEADERS[@]}")
if echo "$USER_INFO" | grep -q '"detail"'; then
  echo "ERROR: API token invalid or expired."
  echo "Response: $(echo "$USER_INFO" | head -1)"
  exit 1
fi
USERNAME=$(echo "$USER_INFO" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.username)}catch(e){console.log('unknown')}")
echo "Authenticated as: ${USERNAME}"
echo ""

# Step 2: Check if provider already exists
echo "Step 2: Checking for existing wardlist OAuth2 provider..."
PROVIDERS=$(curl -s "${API}/providers/oauth2/?name=wardlist" "${HEADERS[@]}")
PROVIDER_ID=$(echo "$PROVIDERS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.results?.[0]?.pk||'')}catch(e){console.log('')}")

if [ -n "$PROVIDER_ID" ]; then
  echo "Provider already exists: ID ${PROVIDER_ID}. Skipping creation."
else
  echo "No existing provider found. Creating..."

  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] Would create OAuth2 provider:"
    echo "  name: wardlist"
    echo "  client_id: ${CLIENT_ID}"
    echo "  redirect_uris: ${REDIRECT_URI_1} ${REDIRECT_URI_2}"
    echo "  client_type: public (PKCE)"
    echo "  authorization_flow: default-provider-authorization-implicit-consent"
    PROVIDER_ID="DRY_RUN_ID"
  else
    # Get the implicit consent flow UUID
    FLOWS=$(curl -s "${API}/flows/instances/?designation=authorization" "${HEADERS[@]}")
    FLOW_UUID=$(echo "$FLOWS" | node -e "
const d=require('fs').readFileSync('/dev/stdin','utf8');
try{
  const j=JSON.parse(d);
  const f = j.results?.find(f=>f.slug==='default-provider-authorization-implicit-consent') || j.results?.[0];
  console.log(f?.pk||'');
}catch(e){console.log('')}")

    if [ -z "$FLOW_UUID" ]; then
      echo "ERROR: Could not find authorization flow."
      echo "Available flows: $(echo "$FLOWS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.results?.map(f=>f.slug).join(', '))}catch(e){console.log('none')}")"
      exit 1
    fi
    echo "Using flow: ${FLOW_UUID}"

    # Create the OAuth2 provider
    PROVIDER_RESP=$(curl -s -X POST "${API}/providers/oauth2/" "${HEADERS[@]}" -d "{
      \"name\": \"wardlist\",
      \"client_id\": \"${CLIENT_ID}\",
      \"client_type\": \"public\",
      \"authorization_flow\": \"${FLOW_UUID}\",
      \"redirect_uris\": \"${REDIRECT_URI_1}\\n${REDIRECT_URI_2}\",
      \"include_claims_in_id_token\": true,
      \"access_token_validity\": \"hours=1\",
      \"refresh_token_validity\": \"days=30\",
      \"signing_key\": null,
      \"sub_mode\": \"hashed_user_id\",
      \"issuer_mode\": \"global\"
    }")

    PROVIDER_ID=$(echo "$PROVIDER_RESP" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.pk||j.detail||'')}catch(e){console.log('')}")
    if ! echo "$PROVIDER_ID" | grep -qE '^[0-9]+$'; then
      echo "ERROR creating provider. Response:"
      echo "$PROVIDER_RESP"
      exit 1
    fi
    echo "Provider created: ID ${PROVIDER_ID}"
  fi
fi

echo ""

# Step 3: Check if application already exists
echo "Step 3: Checking for existing wardlist application..."
APPS=$(curl -s "${API}/core/applications/?slug=${APP_SLUG}" "${HEADERS[@]}")
APP_EXISTS=$(echo "$APPS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.count>0?'yes':'no')}catch(e){console.log('no')}")

if [ "$APP_EXISTS" = "yes" ]; then
  echo "Application '${APP_SLUG}' already exists. Skipping creation."
else
  echo "Creating application..."

  if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY RUN] Would create application:"
    echo "  name: ${APP_NAME}"
    echo "  slug: ${APP_SLUG}"
    echo "  provider: ${PROVIDER_ID}"
  else
    APP_RESP=$(curl -s -X POST "${API}/core/applications/" "${HEADERS[@]}" -d "{
      \"name\": \"${APP_NAME}\",
      \"slug\": \"${APP_SLUG}\",
      \"provider\": ${PROVIDER_ID},
      \"open_in_new_tab\": false,
      \"meta_description\": \"GMH Hospitalist Daily Rounds List PWA\"
    }")

    APP_SLUG_RESULT=$(echo "$APP_RESP" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');try{const j=JSON.parse(d);console.log(j.slug||j.detail||'')}catch(e){console.log('')}")
    if [ "$APP_SLUG_RESULT" = "$APP_SLUG" ]; then
      echo "Application created: ${APP_SLUG}"
    else
      echo "ERROR creating application. Response:"
      echo "$APP_RESP"
      exit 1
    fi
  fi
fi

echo ""

# Step 4: Verify the OIDC discovery endpoint
echo "Step 4: Verifying OIDC discovery endpoint..."
if [ "$DRY_RUN" = "true" ]; then
  echo "[DRY RUN] Would verify: ${AUTH_BASE}/application/o/${APP_SLUG}/.well-known/openid-configuration"
else
  sleep 2
  OIDC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${AUTH_BASE}/application/o/${APP_SLUG}/.well-known/openid-configuration")
  if [ "$OIDC_STATUS" = "200" ]; then
    echo "OIDC discovery endpoint LIVE: ${AUTH_BASE}/application/o/${APP_SLUG}/.well-known/openid-configuration"
  else
    echo "WARNING: OIDC discovery returned ${OIDC_STATUS}. May need a moment to propagate."
  fi
fi

echo ""
echo "=== COMPLETE ==="
echo ""
echo "Next steps:"
echo "  1. Set VITE_AUTHENTIK_CLIENT_ID=wardlist in Vercel env vars"
echo "     (the workflow does this automatically if dry_run=false)"
echo "  2. Trigger a Vercel redeploy (push to main or use Vercel dashboard)"
echo "  3. Verify login at https://wardlist.app/ — should redirect to Authentik"
echo ""
echo "OIDC config used by wardlist:"
echo "  authority: ${AUTH_BASE}/application/o/${CLIENT_ID}"
echo "  client_id: ${CLIENT_ID}"
echo "  redirect_uris: ${REDIRECT_URI_1} ${REDIRECT_URI_2}"
echo "  grant_type: authorization_code (PKCE)"
