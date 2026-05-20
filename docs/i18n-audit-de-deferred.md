# i18n audit — de — deferred review

Suggestions below were SKIPPED by `apply-audit-suggestions.mjs --min-confidence=0.8`
because they are either LOW_CONFIDENCE or have auditor confidence < 0.8.
Hand-review and apply individually.

Total skipped: 21

| Shard | Key | Verdict | Conf | Issue | Suggested |
|---|---|---|---|---|---|
| business | business.reseller.next | LOW_CONFIDENCE |  | Ambiguous without context. 'Nächste' implies a feminine noun. 'Weiter' is more common for a general 'Next' button. |  |
| navigation | navigation.navigatingTo | EDIT_SUGGESTED | 0.7 | Imperative form 'Navigiere zu' doesn't match the gerund 'Navigating to' if it's a general label or status. It implies a command rather than a concept or process. | Navigation zu |
| packages | packages.item | LOW_CONFIDENCE |  | 'Element' is acceptable but might not be the most natural choice depending on the specific context of 'item' (e.g., 'Artikel' or 'Posten' could be better for products/content). |  |
| packages | packages.items | LOW_CONFIDENCE |  | 'Elemente' is acceptable but might not be the most natural choice depending on the specific context of 'items' (e.g., 'Artikel' or 'Posten' could be better for products/content). |  |
| screens | screens.common.key | LOW_CONFIDENCE |  | Ambiguous meaning of 'Key' without context (e.g., physical key, legend, cryptographic key, crucial element). |  |
| screens | screens.common.lastLength | LOW_CONFIDENCE |  | The gender of 'Last' ('Letzte') depends on the noun represented by the placeholder {length}. 'Letzte' assumes a feminine noun, which is a common default, but could be 'Letzter' (masculine) or 'Letztes' (neuter) depending on context. |  |
| screens | screens.admin.activeRate | LOW_CONFIDENCE |  | 'Aktive Rate' is a direct translation, but might be slightly awkward depending on the exact context. 'Aktivitätsrate' or 'Rate der Aktiven' could be alternatives. |  |
| screens | screens.admin.kind | LOW_CONFIDENCE |  | Ambiguous English term 'Kind'. 'Art' is plausible for 'type/sort' in a technical context, but without more context, it's hard to be certain. |  |
| screens | screens.admin.utterance | LOW_CONFIDENCE |  | 'Äußerung' is a correct translation but can sound quite formal or technical. Depending on the specific context in a 'friendly' wellness app, a softer or more descriptive term might be preferred, but without more context, it's hard to be certain. |  |
| screens | screens.business.autopilotHasLengthReferralDraftValue1 | EDIT_SUGGESTED | 0.5 | The singular noun 'Empfehlungsentwurf' is used, which is incorrect for plural counts. Also, the phrasing for singular (e.g., '1 Empfehlungsentwurf') is grammatically awkward without an article ('einen'). Assuming {value1} is empty. | Autopilot hat {length} Empfehlungsentwürfe für dich |
| screens | screens.community.kind | LOW_CONFIDENCE |  | Ambiguous English source. 'Kind' could mean 'type/category' (Art) or 'friendly' (Freundlich, adjective). Assuming it's an adjective or a characteristic label, 'Freundlich' is correct. If it's a noun for 'type', it's incorrect. |  |
| screens | screens.contacts.lengthContactValue1 | EDIT_SUGGESTED | 0.7 | Pluralization is not handled correctly for German. The placeholder {value1} implies an English-style plural suffix, which doesn't apply to German. 'Kontakt' is singular, 'Kontakte' is plural. | {length} Kontakte |
| screens | screens.reseller.ticketquantityTicketValue1Value2 | LOW_CONFIDENCE |  | Ambiguous placeholder {value1}. If it's for pluralization (e.g., 's'), the German 'Ticket{value1}' is grammatically incorrect. If it's other data, the English source string is awkward. |  |
| screens | screens.settings.productsAboveYourPerproductCeilingHidden | LOW_CONFIDENCE |  | The English term 'Band' is ambiguous without further context (e.g., price band, category band, UI element). The German translation is literal but inherits the ambiguity. |  |
| screens | screens.settings.eGLiquidformLargelabel | EDIT_SUGGESTED | 0.7 | 'large-label' is ambiguous in English. 'große Verpackung' means 'large packaging', which is an interpretation. If it refers to the label itself, 'großes Etikett' would be more direct. If it refers to readability, 'gut lesbares Etikett' would be better. | großes Etikett |
| screens | screens.wallet.text | LOW_CONFIDENCE |  | Ambiguous without context. 'Zu' is a direct translation of 'to' as a preposition, but 'to' can have many meanings in English UI (e.g., 'to' as part of an infinitive, 'to' indicating destination). Without knowing the exact usage, it's hard to confirm. |  |
| screens | screens.wallet.lengthTransactionValue1 | LOW_CONFIDENCE |  | Pluralization of 'Transaktion' is not handled. The current translation is only correct for singular. The English source string's structure is ambiguous regarding pluralization, making a single corrected German string difficult without conditional logic. |  |
| screens | screens.publiceventlanding.attending | LOW_CONFIDENCE |  | Ambiguous context for 'Attending'. If it's a button, 'Teilnehmen' is fine. If it's a label for attendees, it should be 'Teilnehmer'. |  |
| sidebar | sidebar.memory | LOW_CONFIDENCE |  | Ambiguous English term 'Memory'. 'Speicher' usually refers to data storage. If it means cognitive memory, 'Gedächtnis' is better. If it means recollections/journal entries, 'Erinnerungen' is better. |  |
| toasts | toasts.admin.acceptLinkCopiedClipboard | LOW_CONFIDENCE |  | The English 'Accept link' is somewhat ambiguous without context. 'Einladungslink' (invitation link) is a plausible interpretation, but other 'accept' contexts might exist. |  |
| vitanaIndex | vitanaIndex.tiers.early | LOW_CONFIDENCE |  | 'Früh' (early) is a bit abrupt as a standalone level/status. While understandable, it could be more specific (e.g., 'Frühphase'). |  |
