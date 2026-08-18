#!/usr/bin/env bash
# VTID-03658 — one-time provisioning for per-PR frontend previews on AWS.
#
# WHY THIS EXISTS AS A SCRIPT RATHER THAN SOMETHING THE PIPELINE DOES
# -------------------------------------------------------------------
# GCP billing was disabled deliberately, which killed the Cloud Run per-PR
# previews (`community-app-pr-<n>`). Their replacement is S3 + CloudFront:
# the app is a static SPA, so a preview needs object storage and a CDN, not a
# container per pull request.
#
# The per-PR ECS alternative was rejected on purpose. It would create a task
# definition, a service, a target group and an ALB listener rule per PR —
# and ALB listener rules are a bounded resource whose PRIORITY ordering has
# already caused one silent misroute in this estate (CLAUDE.md §1b: the
# path-based rules at priority 10 match before higher-numbered host rules
# regardless of Host). Churning those per pull request invites that failure
# on a schedule. S3 prefixes have no such coupling.
#
# Everything below is idempotent and safe to re-run.
#
# WHO RUNS IT: an operator with s3:CreateBucket, cloudfront:*, and iam:
# PutUserPolicy. The Claude agent user has s3:ListAllMyBuckets and nothing
# else here — cloudfront:ListDistributions and s3:PutObject are both denied —
# so this could not be executed from the session that wrote it.
set -euo pipefail

REGION="${AWS_REGION:-eu-central-1}"
BUCKET="${PREVIEW_BUCKET:-vitana-pr-previews}"
# The CI principal that the preview workflows authenticate as. Same IAM user
# the existing AWS frontend workflows use (AWS_STAGING_ACCESS_KEY_ID).
CI_USER="${PREVIEW_CI_USER:-claude-staging-validation}"
# Set to a hostname you control to serve previews under a stable domain.
# Leave empty to use the CloudFront-assigned *.cloudfront.net name, which
# needs no DNS and no ACM certificate — the recommended start.
PREVIEW_DOMAIN="${PREVIEW_DOMAIN:-}"

say() { printf '\n==> %s\n' "$*"; }

# --- 1. bucket -------------------------------------------------------------
# PRIVATE. Public-read buckets are the classic way this pattern leaks: the
# preview build is a real bundle carrying real (public) keys and internal
# route names, and a listable bucket hands over every open PR at once.
# CloudFront reaches it through an Origin Access Control instead.
say "bucket s3://$BUCKET"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "    exists"
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION"
  echo "    created"
fi
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Safety net for previews whose teardown never ran — a closed PR whose
# workflow failed, or a branch deleted without closing the PR. Without this,
# the bucket only ever grows.
say "lifecycle rule: expire preview objects after 30 days"
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" \
  --lifecycle-configuration '{
    "Rules":[{"ID":"expire-stale-previews","Status":"Enabled",
              "Filter":{"Prefix":"pr-"},
              "Expiration":{"Days":30}}]}'

# --- 2. CloudFront function: SPA fallback, per prefix -----------------------
# A React Router SPA must serve index.html for any non-asset path. CloudFront's
# built-in custom-error-response mapping (404 -> /index.html) cannot do this
# per-prefix: it would serve the ROOT index.html, so /pr-42/settings would load
# whichever PR happened to be at the bucket root. This function rewrites within
# the PR's own prefix, which is what keeps previews isolated from each other.
say "CloudFront function: vitana-pr-preview-spa"
FN_CODE=$(cat <<'JS'
function handler(event) {
  var req = event.request;
  var uri = req.uri;
  var m = uri.match(/^\/(pr-\d+)(\/.*)?$/);
  if (!m) { return req; }
  var prefix = m[1];
  var rest = m[2] || '/';
  // A path whose last segment contains a dot is an asset request (foo.js,
  // foo.png). Anything else is a client-side route and gets index.html.
  var last = rest.substring(rest.lastIndexOf('/') + 1);
  if (last.indexOf('.') === -1) {
    req.uri = '/' + prefix + '/index.html';
  }
  return req;
}
JS
)
if aws cloudfront describe-function --name vitana-pr-preview-spa >/dev/null 2>&1; then
  ETAG=$(aws cloudfront describe-function --name vitana-pr-preview-spa --query ETag --output text)
  aws cloudfront update-function --name vitana-pr-preview-spa --if-match "$ETAG" \
    --function-config Comment="SPA fallback per PR prefix (VTID-03658)",Runtime=cloudfront-js-2.0 \
    --function-code "$FN_CODE" >/dev/null
  echo "    updated"
else
  aws cloudfront create-function --name vitana-pr-preview-spa \
    --function-config Comment="SPA fallback per PR prefix (VTID-03658)",Runtime=cloudfront-js-2.0 \
    --function-code "$FN_CODE" >/dev/null
  echo "    created"
fi
FN_ETAG=$(aws cloudfront describe-function --name vitana-pr-preview-spa --query ETag --output text)
aws cloudfront publish-function --name vitana-pr-preview-spa --if-match "$FN_ETAG" >/dev/null
FN_ARN=$(aws cloudfront describe-function --name vitana-pr-preview-spa \
  --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)
echo "    published: $FN_ARN"

cat <<EOF

==> REMAINING MANUAL STEP — the CloudFront distribution

Deliberately not scripted. Creating a distribution is a long-lived, billed,
externally-reachable resource, and the create call takes a ~60-line JSON
document whose defaults matter (TLS policy, cache policy, OAC). Generating
that blind from a script is how a preview CDN ends up publicly cacheing
something it should not, so this asks for a human.

Create it in the console (or with a reviewed JSON doc):

  Origin              : $BUCKET.s3.$REGION.amazonaws.com
  Origin access       : Origin access control (create one; let the console
                        update the bucket policy for you)
  Viewer protocol     : Redirect HTTP to HTTPS
  Allowed methods     : GET, HEAD
  Cache policy        : CachingOptimized
  Function assoc.     : Viewer request -> $FN_ARN
  Default root object : (leave EMPTY — previews live under /pr-<n>/, and a
                        root object here would mask that)
$( [ -n "$PREVIEW_DOMAIN" ] && echo "  Alternate domain    : $PREVIEW_DOMAIN  (needs an ACM cert in us-east-1)" )

Then set the distribution id as a repo secret so the workflows can invalidate:

  gh secret set PREVIEW_CF_DISTRIBUTION_ID --body "<distribution id>"
  gh secret set PREVIEW_CF_DOMAIN          --body "<dxxxx.cloudfront.net or $PREVIEW_DOMAIN>"

EOF

# --- 3. CI permissions -----------------------------------------------------
# Scoped to the preview prefix only. The CI user already deploys the frontend;
# this must not widen it into general S3 write access across the account.
say "IAM policy for $CI_USER (scoped to s3://$BUCKET/pr-*)"
POLICY=$(cat <<EOF
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":["s3:PutObject","s3:DeleteObject"],
  "Resource":"arn:aws:s3:::$BUCKET/pr-*"},
 {"Effect":"Allow","Action":["s3:ListBucket"],
  "Resource":"arn:aws:s3:::$BUCKET","Condition":{"StringLike":{"s3:prefix":["pr-*"]}}},
 {"Effect":"Allow","Action":["cloudfront:CreateInvalidation"],"Resource":"*"}
]}
EOF
)
if aws iam put-user-policy --user-name "$CI_USER" \
     --policy-name vitana-pr-previews --policy-document "$POLICY" 2>/dev/null; then
  echo "    attached"
else
  echo "    COULD NOT ATTACH (needs iam:PutUserPolicy). Apply this to $CI_USER:"
  echo "$POLICY"
fi

say "done"
