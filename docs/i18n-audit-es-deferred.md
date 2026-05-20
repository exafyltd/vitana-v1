# i18n audit — es — deferred review

Suggestions below were SKIPPED by `apply-audit-suggestions.mjs --min-confidence=0.8`
because they are either LOW_CONFIDENCE or have auditor confidence < 0.8.
Hand-review and apply individually.

Total skipped: 15

| Shard | Key | Verdict | Conf | Issue | Suggested |
|---|---|---|---|---|---|
| autopilot | autopilot.priorities.high | LOW_CONFIDENCE |  | The translation "Alta" is feminine. Without context, it's impossible to determine the correct gender (Alto/Alta) for the adjective "High" as it depends on the noun it modifies. |  |
| intro | intro.experience | LOW_CONFIDENCE |  | Ambiguous English source. 'Experience' can be a noun or an imperative verb. Spanish 'Experiencia' is only a noun. If the English was intended as an imperative verb (e.g., 'Experience our app'), the translation is inaccurate and should be 'Experimenta'. |  |
| screens | screens.common.tenantOnly | LOW_CONFIDENCE |  | 'Inquilino' refers to a property renter, which is likely incorrect for 'tenant' in a software/system context. More context is needed. |  |
| screens | screens.admin.loadingSpeeches | LOW_CONFIDENCE |  | 'Discursos' implies formal addresses, which might not be the intended meaning for 'speeches' in an app (e.g., voice prompts, messages). More context is needed. |  |
| screens | screens.admin.noSpeechesConfigured | LOW_CONFIDENCE |  | 'Discursos' implies formal addresses, which might not be the intended meaning for 'speeches' in an app (e.g., voice prompts, messages). More context is needed. |  |
| screens | screens.admin.assistantSpeeches | LOW_CONFIDENCE |  | 'Discursos' implies formal addresses, which might not be the intended meaning for 'speeches' in an app (e.g., voice prompts, messages). More context is needed. |  |
| screens | screens.admin.saveForwardTriggers | EDIT_SUGGESTED | 0.7 | Literal translation of 'forward' makes it sound clunky; 'de avance' is more idiomatic for progress in this context. | Guardar disparadores de avance |
| screens | screens.calendar.todaySIndexPulseCompletingYour | LOW_CONFIDENCE |  | Ambiguity in English source regarding '{totalCount}' and 'event' singular/plural. If '{totalCount}' is a quantity, Spanish needs pluralization of 'evento' and 'tu'. |  |
| screens | screens.contacts.invitedValue0 | LOW_CONFIDENCE |  | Ambiguity of '{value0}' (name vs. count) and gender agreement for 'Invitado'. |  |
| screens | screens.health.lengthTestValue1Available | LOW_CONFIDENCE |  | Ambiguity regarding number agreement for 'prueba' and 'disponible' depending on what {length} represents (quantity vs. adjective). If {length} is a quantity, 'pruebas disponibles' would be needed. |  |
| screens | screens.intents.lengthValidValue1 | LOW_CONFIDENCE |  | Ambiguity regarding gender and number agreement for 'válido' due to placeholders {length} and {value1}. It should agree with the implied noun/quantity. |  |
| screens | screens.profile.tenantValue0 | LOW_CONFIDENCE |  | Ambiguous meaning of 'Tenant' without context (tech/multi-tenant system vs. housing renter). 'Inquilino' implies a renter. |  |
| screens | screens.patient.upcoming | LOW_CONFIDENCE |  | Gender and number ambiguity without context. 'Próximas' is feminine plural, but 'Upcoming' could refer to masculine or singular items. |  |
| screens | screens.patient.completed | LOW_CONFIDENCE |  | Gender and number ambiguity without context. 'Completada' is singular feminine, but 'Completed' could refer to masculine or plural items. |  |
| toasts | toasts.wallet.tokensStakedSuccessfully | LOW_CONFIDENCE |  | The term 'Stakados' is an Anglicism. While understood in specific tech/crypto communities, its appropriateness for a general 'wellness/longevity mobile app' is questionable without more context on the app's features. |  |
