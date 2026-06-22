export interface DateSeparatorItem {
  type: "date";
  id: string;
  date: Date;
  dateKey: string;
  text: string;
}

export interface DateSeparatedMessageItem<T> {
  type: "message";
  id: string;
  message: T;
}

export type DateSeparatedItem<T> = DateSeparatorItem | DateSeparatedMessageItem<T>;

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

export function getMessageDateKey(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function getDateSeparatedMessageItems<T extends { id?: string }>(
  messages: readonly T[],
  getCreatedAt: (message: T) => string | number | Date,
  formatDateLabel: (date: Date) => string,
): DateSeparatedItem<T>[] {
  const items: DateSeparatedItem<T>[] = [];
  let previousDateKey = null;

  for (const message of messages) {
    const createdAt = getCreatedAt(message);
    const messageDate = new Date(createdAt);
    const dateKey = getMessageDateKey(messageDate);

    if (dateKey && dateKey !== previousDateKey) {
      items.push({
        type: "date",
        id: `date-${dateKey}`,
        date: messageDate,
        dateKey,
        text: formatDateLabel(messageDate),
      });
      previousDateKey = dateKey;
    }

    items.push({
      type: "message",
      id: `message-${message?.id || items.length}`,
      message,
    });
  }

  return items;
}
