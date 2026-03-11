

# Update Privacy Policy — AI Data Sharing Disclosure

## Why
Apple's rejection note specifically requires: *"Identify in the privacy policy what data the app collects, how it collects that data, all uses of that data, and confirm any third party the app shares data with provides the same or equal protection."*

The current privacy policy (Section 5) mentions generic "Service Providers and Partners" but does **not** name Google/Gemini or describe what personal data is sent to AI services.

## Change

**File:** `src/pages/legal/PrivacyPolicy.tsx`

Add a new bullet to the Section 5 sharing list (`<ul>` at lines 132-137) specifically for AI:

```
<li>
  <strong>AI Service Providers:</strong> To power the in-app AI assistant,
  certain personal data — including voice recordings and transcripts, text
  messages and diary entries, Memory Garden entries, wellness goals, and
  profile context (such as your name and preferences) — may be transmitted
  to Google (Gemini AI models) via the Lovable AI Gateway. This data is
  sent only after you provide explicit consent through an in-app disclosure
  dialog. It is transmitted via encrypted connections and is not permanently
  stored by the AI provider. You may revoke this consent at any time in
  Settings &gt; Privacy. Google is contractually required to provide
  protections equivalent to or exceeding those described in this Privacy
  Policy.
</li>
```

This is a single addition — no other sections need changes, since the data types are already listed in Section 3 and the consent mechanism is already built.

