

## Translate All Hardcoded "Share" Labels to "Teilen" (German)

The word "Share" appears hardcoded in several components. When German is selected, these should display "Teilen" instead. The translation key `common.share` already exists in `de.json` as `"Teilen"`.

### Files to Change

**1. `src/components/profile/mobile/MobileIdentityCard.tsx`** (lines 81, 141)
- Replace hardcoded `Share` with `translate('common.share', 'Share')` in both the owner and non-owner share buttons.
- Add `useTranslation` import and hook call.

**2. `src/components/profile/shared/ProfileIdCardFront.tsx`** (line 365)
- Replace `<span>Share</span>` with `<span>{translate('common.share', 'Share')}</span>`.
- Add `useTranslation` if not already imported.

**3. `src/components/sharing/UniversalShareButton.tsx`** (line 52)
- Replace `<span className="ml-2">Share</span>` with `<span className="ml-2">{translate('common.share', 'Share')}</span>`.

**4. `src/components/sharing/SocialShareButton.tsx`** (line 179)
- Replace `<span className="ml-2">Share</span>` with `<span className="ml-2">{translate('common.share', 'Share')}</span>`.

**5. `src/components/messages/MessageContextMenu.tsx`** (line 116)
- Replace `<span>Share</span>` with `<span>{translate('common.share', 'Share')}</span>`.

**6. `src/components/community/MobileShortSlide.tsx`** (line 258)
- Replace `<span ...>Share</span>` with translated version.

**7. `src/components/sharing/CampaignCard.tsx`** (line 702)
- Replace `<p className="text-xs">Share</p>` tooltip with translated version.

Each component will import and use `useTranslation` to call `translate('common.share', 'Share')`, which resolves to `"Teilen"` in German and falls back to `"Share"` in English.

Seven files changed. No new dependencies or translation keys needed — `common.share` already exists as `"Teilen"` in `de.json`.

