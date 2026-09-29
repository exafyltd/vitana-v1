#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# One-time AWS setup for the What's New drafter (VTID-04739).
#
# Creates the IAM role WHATS-NEW-DRAFT.yml assumes through GitHub OIDC (no
# long-lived keys): it may do exactly one thing — invoke ONE Bedrock Claude
# model — and only from a workflow running on exafyltd/vitana-v1's main branch.
#
# Then set the printed role ARN as the repo secret WHATS_NEW_BEDROCK_ROLE_ARN.
# Until that secret exists the workflow is inert (it logs a notice and exits).
#
# Usage (AWS CloudShell, account 472838866351):
#   ./scripts/whats-new/setup-bedrock-role.sh [--dry-run] [--delete]
#
# Order matters (platform CLAUDE.md, Bedrock IF-THEN 31): this script FIRST
# proves the model really invokes with a real call — an ACTIVE inference
# profile is not the same as an invokable one — and only then creates the role.
# ──────────────────────────────────────────────────────────────
set -euo pipefail
export AWS_PAGER=""   # CloudShell pipes CLI v2 output through `less`, which looks like a hang.

REGION="${VITANA_AWS_REGION:-eu-central-1}"      # not AWS_REGION: CloudShell sets that to the open tab's region
ACCOUNT_ID="${AWS_ACCOUNT_ID:-472838866351}"
MODEL_PROFILE="${WHATS_NEW_MODEL_ID:-eu.anthropic.claude-sonnet-4-6}"
FOUNDATION_MODEL="${MODEL_PROFILE#*.}"           # eu.anthropic.claude-sonnet-4-6 -> anthropic.claude-sonnet-4-6
REPO="exafyltd/vitana-v1"
ROLE_NAME="vitana-whats-new-drafter"
OIDC_HOST="token.actions.githubusercontent.com"

DELETE=false; DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --delete) DELETE=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

CALLER="$(aws sts get-caller-identity --query Account --output text)"
[[ "$CALLER" == "$ACCOUNT_ID" ]] || { echo "Wrong AWS account: $CALLER (expected $ACCOUNT_ID). Stopping."; exit 1; }

echo "Region: $REGION | Account: $ACCOUNT_ID | Model: $MODEL_PROFILE | Role: $ROLE_NAME | Repo: $REPO"

if $DELETE; then
  aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name invoke-one-model 2>/dev/null || true
  aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
  echo "Deleted (if it existed)."; exit 0
fi

OIDC_ARN="$(aws iam list-open-id-connect-providers --query "OpenIDConnectProviderList[?contains(Arn, '$OIDC_HOST')].Arn | [0]" --output text)"
if [[ -z "$OIDC_ARN" || "$OIDC_ARN" == "None" ]]; then
  echo "No GitHub OIDC provider ($OIDC_HOST) in this account. The production deploy roles use one — check IAM > Identity providers. Stopping."; exit 1
fi
echo "GitHub OIDC provider: $OIDC_ARN"

if $DRY_RUN; then echo "Dry run — would verify the model, then create $ROLE_NAME. Exiting."; exit 0; fi

echo "── Verifying the model really invokes (a few tokens, a fraction of a cent)"
aws bedrock-runtime converse --region "$REGION" --model-id "$MODEL_PROFILE" \
  --messages '[{"role":"user","content":[{"text":"Reply with the single word ok."}]}]' \
  --inference-config '{"maxTokens":16}' --query 'output.message.content[0].text' --output text \
  || { echo "The model did not invoke (not subscribed / no access in $REGION). Fix Bedrock model access first, then re-run."; exit 1; }

TRUST=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "$OIDC_ARN" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "$OIDC_HOST:aud": "sts.amazonaws.com" },
      "StringLike":   { "$OIDC_HOST:sub": "repo:$REPO:ref:refs/heads/main" }
    }
  }]
}
JSON
)
aws iam create-role --role-name "$ROLE_NAME" --assume-role-policy-document "$TRUST" \
  --description "GitHub OIDC role for the What's New drafter (VTID-04739): invoke one Bedrock model" \
  --max-session-duration 3600 >/dev/null 2>&1 \
  || aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST"

POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["bedrock:InvokeModel"],
    "Resource": [
      "arn:aws:bedrock:*:$ACCOUNT_ID:inference-profile/$MODEL_PROFILE",
      "arn:aws:bedrock:*::foundation-model/$FOUNDATION_MODEL"
    ]
  }]
}
JSON
)
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name invoke-one-model --policy-document "$POLICY"

ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query Role.Arn --output text)"
echo ""
echo "Done. Role ARN:"
echo "  $ROLE_ARN"
echo ""
echo "Now set it as a repo secret (or add it in GitHub > Settings > Secrets > Actions):"
echo "  gh secret set WHATS_NEW_BEDROCK_ROLE_ARN --repo $REPO --body '$ROLE_ARN'"
echo ""
echo "Then dry-run against a real merged PR (prints the draft, opens nothing):"
echo "  gh workflow run WHATS-NEW-DRAFT.yml --repo $REPO -f pr_number=1139 -f dry_run=true"
