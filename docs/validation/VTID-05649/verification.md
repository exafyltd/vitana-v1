# VTID-05649 verification: ORB guided topic

- Start payload: `guided_topic_id` (orb-widget.js:2594), sent in one start message only (one-shot).
- Session directive handler branches on the directive string; only `end_guided_topic_teaching` calls
  `onGuidedTopicTeachingEnd(topic_id, reason)`, then drains and ends as before. `end_conversation` and
  `end_teaching_session` emit nothing (pinned by a test).
- Controller: `focusGuidedTopic(topicId)`; new native logic: per-topic record, 5 s check, 45 s idle-after-audio
  (`idle_after_lesson`), 5 min ceiling (`backstop_timeout`), close after audio (`overlay_closed_after_delivery`);
  `reportTeachingEnd` is the single emitter with the once-per-topic guard.
- `OrbProvider` emits `vitana:guided-topic-teaching-complete` `{ topicId, reason }` on the overlay bus.
- No spoken text added (NEVER 41), no UI, no locale text. Files: `apps/mobile/src/orb/**` only.
- Not verified on staging: no native staging deploy; live ORB sessions wait for G1.
