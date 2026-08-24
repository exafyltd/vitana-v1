# i18n audit — zh — deferred review

Suggestions below were SKIPPED by `apply-audit-suggestions.mjs --min-confidence=0.8`
because they are either LOW_CONFIDENCE or have auditor confidence < 0.8.
Hand-review and apply individually.

Total skipped: 17

| Shard | Key | Verdict | Conf | Issue | Suggested |
|---|---|---|---|---|---|
| billing | billing.features.priorityPractitioner | EDIT_SUGGESTED | 0.7 | Ambiguous: 'priority access' could mean '优先访问' or '优先预约' depending on context. Suggest '优先预约从业者' if it means booking. | 优先预约从业者 |
| billing | paywall.match_reveals.title | EDIT_SUGGESTED | 0.7 | '揭示匹配' is literal and may not be clear; consider '查看匹配' or '解锁匹配'. | 查看匹配 |
| business | business.kpi.totalEarned | EDIT_SUGGESTED | 0.7 | '总赚取' is not idiomatic; '赚取' is a verb. Better to use '总收益' or '累计赚取'. | 总收益 |
| drawerNav | drawerNav.connectors | EDIT_SUGGESTED | 0.7 | 'Connectors' likely refers to connections or contacts; '联系' is too generic and may be ambiguous. | 连接 |
| profile | profile.account.fields.handle | EDIT_SUGGESTED | 0.7 | 'Handle' typically means username, not nickname. | 用户名 |
| screens | screens.common.autopilotSuggestion | EDIT_SUGGESTED | 0.7 | '自动驾驶建议' is literal and may not convey the intended meaning of an automated suggestion feature. | 自动建议 |
| screens | screens.common.masterActions | EDIT_SUGGESTED | 0.6 | '主要行动' may not capture the meaning of 'Master Actions' as a list of primary actions. | 主行动列表 |
| screens | screens.common.recurring | EDIT_SUGGESTED | 0.7 | '重复' is ambiguous; '周期性' is clearer for recurring events. | 周期性 |
| screens | screens.admin.dispatchedDevAutopilot | EDIT_SUGGESTED | 0.7 | '开发自动驾驶' is a literal translation of 'dev autopilot' and may be unclear; consider '开发自动处理'. | 已派发至开发自动处理 |
| screens | screens.admin.activatingDispatchingDevAutopilotAtomicTakes | EDIT_SUGGESTED | 0.7 | '原子操作' is technical but acceptable; however '开发自动驾驶' as above is unclear. | 正在激活并派发至开发自动处理 — 原子操作，需要几秒钟。 |
| screens | screens.discover.wsFeatured_therapySessions | EDIT_SUGGESTED | 0.7 | '治疗会话' is literal and awkward; '治疗课程' or '治疗时段' may be more natural. | 治疗课程 |
| screens | screens.discover.wsFeatured_destinationWellness | EDIT_SUGGESTED | 0.7 | '目的地康养' is awkward; consider '康养旅行' or '度假康养'. | 康养旅行 |
| screens | screens.payment.willReceiveYourRequest | EDIT_SUGGESTED | 0.7 | Translation '我们会收到你的请求' means 'We will receive your request', but the English 'Will receive your request' likely refers to the recipient receiving the request, not the app. Context needed. | 将收到你的请求 |
| screens | screens.profile.miniDashboardHealthIndexPillars | EDIT_SUGGESTED | 0.7 | The translation is a bit awkward. 'Mini dashboard' is often kept as '迷你仪表盘' but 'Health Index + pillars' could be clearer. Suggest '健康指数与各支柱的迷你仪表盘'. | 健康指数与各支柱的迷你仪表盘 |
| screens | screens.sharing.informedConsentOnly | EDIT_SUGGESTED | 0.7 | '只知情同意' is awkward and unclear. Better: '仅需知情同意' or '仅告知同意'. | 仅需知情同意 |
| screens | screens.sharing.myPackages | EDIT_SUGGESTED | 0.7 | '数据包' is a literal translation of 'packages' but in this context '套餐' might be more appropriate for wellness app. | 我的套餐 |
| screens | screens.sharing.campaignTemplates | EDIT_SUGGESTED | 0.7 | '营销模板' is too specific; 'Campaign' in this context may refer to health campaigns, not marketing. Suggest '活动模板'. | 活动模板 |
