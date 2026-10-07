/**
 * VTID-04955 — group system notices ("X created the group", "X added Y", …).
 *
 * Notices used to store `${user.email} …` as their body and the chat rendered
 * that body raw, so every member saw the actor's email address. Now:
 * - writers store a display name (never an email) in the body and in
 *   content_data.actor_name;
 * - the chat renders known notice types from i18n keys with names from
 *   content_data / the sender's profile, and never shows `body` for them —
 *   which also hides the email in notices written before this change.
 */

export const GROUP_NOTICE_TYPES = [
  "group_created",
  "member_added",
  "member_removed",
  "member_left",
  "group_renamed",
] as const;
export type GroupNoticeType = (typeof GROUP_NOTICE_TYPES)[number];

export interface NoticeProfile {
  display_name?: string | null;
  full_name?: string | null;
}

/** A person's name for a notice — never an email. Empty when unknown. */
export function noticeName(profile?: NoticeProfile | null): string {
  const name = (profile?.display_name || profile?.full_name || "").trim();
  // Defensive: some legacy rows carry an email in a name field.
  return name.includes("@") ? "" : name;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

interface NoticeMessage {
  body?: string | null;
  content_data?: Record<string, unknown> | null;
  sender?: NoticeProfile | null;
}

const KEY: Record<GroupNoticeType, string> = {
  group_created: "screens.messages.groupNoticeCreated",
  member_added: "screens.messages.groupNoticeMemberAdded",
  member_removed: "screens.messages.groupNoticeMemberRemoved",
  member_left: "screens.messages.groupNoticeMemberLeft",
  group_renamed: "screens.messages.groupNoticeRenamed",
};

const str = (v: unknown) => (typeof v === "string" ? v : "");
const clean = (v: unknown) => (str(v).includes("@") ? "" : str(v).trim());

/**
 * The text to show for a system message, or null when it is not a known group
 * notice (the caller then shows `body` as before).
 */
export function describeGroupNotice(message: NoticeMessage, t: Translate): string | null {
  const cd = message.content_data ?? {};
  const type = str(cd.system_type) as GroupNoticeType;
  if (!GROUP_NOTICE_TYPES.includes(type)) return null;

  const someone = t("screens.messages.groupNoticeSomeone");
  const actor =
    (type === "member_left" ? clean(cd.left_user_name) : "") ||
    clean(cd.actor_name) ||
    noticeName(message.sender) ||
    someone;
  const member =
    clean(type === "member_added" ? cd.added_user_name : type === "member_removed" ? cd.removed_user_name : "") ||
    someone;
  const group = clean(cd.group_name);

  return t(KEY[type], { name: actor, member, group });
}
