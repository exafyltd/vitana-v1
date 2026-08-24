# i18n audit — tr — deferred review

Suggestions below were SKIPPED by `apply-audit-suggestions.mjs --min-confidence=0.8`
because they are either LOW_CONFIDENCE or have auditor confidence < 0.8.
Hand-review and apply individually.

Total skipped: 11

| Shard | Key | Verdict | Conf | Issue | Suggested |
|---|---|---|---|---|---|
| billing | billing.features.aiDigest | EDIT_SUGGESTED | 0.7 | 'YZ' is an abbreviation for 'yapay zeka' but may not be widely recognized; consider using 'yapay zeka' or 'AI'. | Yapay zeka özetleri |
| screens | screens.admin.recentIngestionRuns | EDIT_SUGGESTED | 0.7 | Translation 'Son alım çalıştırmaları' is literal but 'ingestion runs' might be better as 'alım çalıştırmaları' is understandable. However, 'ingestion' in data context is often 'veri alımı' or 'içe aktarma'. Suggest 'Son içe aktarma çalıştırmaları' for clarity. | Son içe aktarma çalıştırmaları |
| screens | screens.admin.analyticsWillAppearHere | EDIT_SUGGESTED | 0.7 | 'Analitik' is singular; 'Analitikler' or 'Analizler' might be more natural. | Analitikler burada görünecek |
| screens | screens.admin.joined | EDIT_SUGGESTED | 0.7 | 'Katılım' means 'participation', not 'joined' (date). | Katılma tarihi |
| screens | screens.admin.executableImplementedcount | EDIT_SUGGESTED | 0.7 | 'Executable' is ambiguous; 'Çalıştırılabilir' may not be the intended meaning in this context. | Uygulanabilir: {implementedCount} |
| screens | screens.admin.value0AutomationsExecuteSuccessfullyValue1 | LOW_CONFIDENCE |  | Line break and spacing might be off; also the percentage expression is correct but the translation of 'execute successfully' as 'başarıyla çalışıyor' is fine. |  |
| screens | screens.admin.thisSpeechCurrentlyPlayedFromPrerecorded | EDIT_SUGGESTED | 0.7 | The translation is long and might have awkward phrasing. 'pre-recorded audio file' is 'önceden kaydedilmiş bir ses dosyası' which is fine. 'wired up' is translated as 'bağlanana kadar' which is a bit literal. The phrase 'until audio regeneration is wired up' is 'ses yeniden oluşturma bağlanana kadar' which is understandable but might be better as 'ses yeniden oluşturma özelliği eklenene kadar'. Also, the register is informal, so 'sen' is used? Actually the translation uses 'sen' implicitly? It says 'Buradaki metni düzenlemek' which is fine. I think it's acceptable. But I'll flag as EDIT_SUGGESTED because 'wired up' is not perfectly translated. | Bu konuşma şu anda önceden kaydedilmiş bir ses dosyasından oynatılıyor. Buradaki metni düzenlemek depolamayı günceller, ancak son kullanıcılar ses yeniden oluşturma özelliği eklenene kadar mevcut kaydı duymaya devam eder. |
| screens | screens.community.eventstodayEventsToday | EDIT_SUGGESTED | 0.7 | Singular 'etkinlik' may be ambiguous; plural is more natural. | {eventsToday} bugün etkinlikler |
| screens | screens.settings.comingUpNext | EDIT_SUGGESTED | 0.7 | Missing ellipsis and slightly awkward; 'Sırada ne var...' is fine but could be more natural. | Sırada ne var... |
| screens | screens.legal.type | EDIT_SUGGESTED | 0.7 | The English 'Type' is ambiguous; in context it likely means 'type' as in 'enter' (e.g., type your name), but the Turkish 'Yaz' means 'write' or 'type' as a verb. However, it could also be a noun 'type' (tür). Without context, it's ambiguous. | Yaz |
| screens | screens.partnerportal.activationHint | EDIT_SUGGESTED | 0.7 | The phrase 'by it' is ambiguous; the translation is awkward and could be clearer. | Bir onay, sonra bağlantı canlı. Güvenlik, onay ve sertifika kontrolleri asla atlanmaz. |
