# Vitanaland Commerce connector — Claude Connectors Directory submission sheet (VTID-04945)

Everything the owner pastes into the developer portal (claude.ai/directory/manage → Submit new → MCP connector).
Limits are the portal's: name ≤ 100, one-liner ≤ 200, description ≤ 2,000 characters.
Nothing here is submitted by a session. Facts marked **OWNER** need the owner before submitting.

## Connection
- Server URL: `https://gateway.vitanaland.com/mcp` (Streamable HTTP, stateless)
- Users connect to one URL.
- Tools sync automatically: 9 tools, each with a `title` and `readOnlyHint`/`destructiveHint` (pinned by `services/gateway/test/vtid-04940-commerce-mcp-supplier-data.test.ts`).

## Listing
- **Name:** Vitanaland (owner decision 2026-10-07)
- **One-liner (≤200):** Register your business and list your products and services on Vitanaland, the health and longevity marketplace, by just telling Claude.
- **Categories (1-5):** Commerce / e-commerce, Business operations, Health & wellness
- **Description (≤2,000), English:**
  Vitanaland is a health and longevity community and marketplace. This connector lets a business owner set up their presence on Vitanaland by talking to Claude.
  Claude can create your business, fill in the company details, add and change your products and services as drafts, run the automatic business checks, connect your online shop, and submit your business for review once you agree. At every step Claude tells you what is still missing and what only you can do.
  Everything Claude creates starts as a hidden draft and appears on Vitanaland only after review. You accept the Partner Terms yourself on Vitanaland, and no payments are made through Claude. Claude only sees and changes the data of your own businesses, never member data.
  Setup takes minutes: add the connector, sign in with your Vitanaland account, and tell Claude about your business, for example by sharing your website.
- **Beschreibung (Deutsch, optional):** Vitanaland ist eine Gesundheits- und Longevity-Community mit Marktplatz. Mit diesem Connector richtest du dein Business auf Vitanaland ein, indem du mit Claude sprichst: Business anlegen, Firmendaten eintragen, Produkte und Leistungen als Entwurf erfassen, automatische Prüfungen starten, Online-Shop verbinden und das Business zur Prüfung einreichen. Alles beginnt als verborgener Entwurf; die Partnerbedingungen akzeptierst du selbst auf Vitanaland, Zahlungen laufen nie über Claude.
- **Documentation URL:** `https://vitanaland.com/commerce/connect`
- **Privacy policy URL:** `https://vitanaland.com/commerce/connect/privacy` (connector notice; the full policy is `https://vitanaland.com/privacy`)
- **Support contact:** support@exafy.io
- **Icon:** `public/brand/vitanaland-connector-icon.png` (512×512, the MAXINA mark supplied by the owner; the portal re-validates on upload)
- **URL slug:** `vitanaland` (permanent once published)

## Use cases
- A shop, clinic, lab or service provider registers on Vitanaland and adds its offers without filling in forms.
- A business with an existing online shop (e.g. Shopify) connects it and lists its products.
- Needs before connecting: a Vitanaland account (free sign-up), a business website helps. Reads and writes data (the user's own business data).

## Company
Exafy LTD, Al Khatem Tower, 15th Floor, ADGM, Abu Dhabi, UAE. Website: https://vitanaland.com. Review contact: **OWNER** (name and email for review updates).

## Authentication
OAuth 2.1 with dynamic client registration, served by Supabase Auth (the MCP's protected-resource metadata at `/.well-known/oauth-protected-resource/mcp` names it). Scopes requested: `email profile` (no `openid`, VTID-04882). Callbacks to expect: `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`, and Claude Code loopback. **OWNER: connect once from claude.ai before submitting (see docs/validation/VTID-04938/readiness.md §1).**

## Data handling
- The API is our own (Vitanaland gateway).
- Personal health data: **No.** The connector handles business and listing data only; it exposes no member data and no member health data.
- Sponsored content: No.

## Test and launch (reviewer instructions)
**OWNER:** the reviewer account does not exist yet. It is created after the reviewer-safety test (VTID-04939) is deployed, registered in both exclusion lists first, and its credentials are entered here by the owner, never committed. Steps for the reviewer, to paste:
1. Add the connector (server URL above) and sign in with the provided Vitanaland test account; approve access.
2. Ask Claude: "Show my Vitanaland businesses." (`get_onboarding_status`), then "Create a business called Test Shop, type supplier_shop." (`create_business`), "Set the country to DE and website to https://example.com." (`update_business`), "Add a product Herbal Tea for 4.90 EUR." (`add_product`, `list_products`), "Check the verification." (`check_verification`).
3. Everything created is a hidden draft and the test account's data is excluded from the marketplace and member surfaces.
`submit_for_verification` needs `confirmed=true` after Claude asks; the terms are accepted on vitanaland.com/commerce, not through Claude.

## Compliance acknowledgements (seven, all required)
1. Directory guidelines: comply.
2. First-party API usage: our own API.
3. Financial transactions: none. Commerce is affiliate/redirect; no payment is made or authorised through the connector.
4. AI media generation: none.
5. Prompt injection: supplier-written text is returned only inside a labelled `supplier_data` object with a note that it is data, cleaned of control/bidi characters and length-capped; the server instructions repeat it (VTID-04940, pinned by tests).
6. Conversation data collection: the connector does not collect conversations; it logs which tool ran, when and which fields changed, never the values.
7. Public documentation: `https://vitanaland.com/commerce/connect`.

## Honest limitation to state in the listing if asked
Until the billing, agreement and licence steps have automated paths, shops, clinics and labs finish those steps on Vitanaland; Claude says which and gives the link (see the automation plan, phase C).
