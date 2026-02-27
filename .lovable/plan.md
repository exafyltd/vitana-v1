

## Plan: Add Test Feedback Section to Diary Page

### Step 1: Create `src/components/feedback/FeedbackRecorder.tsx`
New file with the exact content provided — voice recorder using ClientSTT, transcript editor, severity/screen selectors, screenshot attachments, and gateway API submission.

### Step 2: Create `src/components/feedback/FeedbackReportList.tsx`
New file with the exact content provided — fetches user's reports from `user_feedback_reports`, realtime subscription for status updates, displays report cards with severity/status badges.

### Step 3: Modify `src/pages/memory/Diary.tsx`
- Add imports: `Bug`, `FeedbackRecorder`, `FeedbackReportList`
- Add state: `feedbackRefreshKey`
- Insert the Test Feedback section after the closing `</SplitBar>` tag (line 187) and before the `DiaryMasterActionPopup` (line 189), with a `border-t` divider, red/orange gradient card containing the recorder, and the report list below it.

**Note**: The provided JSX in the user's message has some rendering artifacts (missing tags in the confirmation view and report list). I will reconstruct those sections with proper JSX based on the clear intent described.

