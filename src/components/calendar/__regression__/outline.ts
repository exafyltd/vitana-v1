/**
 * VTID-04459 — reduce a rendered screen to what a member and a screen reader get.
 */
/** Visible text + accessible labels, in document order: what a member and a screen reader get. */
export function outline(root: Element): string[] {
  const lines: string[] = [];
  const walk = (el: Element, depth: number) => {
    const id = el.getAttribute("data-testid");
    const role = el.getAttribute("role") ?? (["BUTTON", "H1", "H2", "INPUT", "LABEL"].includes(el.tagName) ? el.tagName.toLowerCase() : null);
    const label = el.getAttribute("aria-label");
    const hidden = el.getAttribute("aria-hidden") === "true" || el.getAttribute("aria-hidden") === "";
    const own = Array.from(el.childNodes)
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    const marks = [id && `#${id}`, role && `<${role}>`, label && `[${label}]`, el.getAttribute("aria-selected") === "true" && "(selected)", (el as HTMLButtonElement).disabled && "(disabled)", hidden && "(hidden)"].filter(Boolean);
    const value = el.tagName === "INPUT" ? `=${(el as HTMLInputElement).value}` : "";
    if (marks.length || own) lines.push(`${"  ".repeat(depth)}${marks.join(" ")}${own ? ` ${own}` : ""}${value}`.trimEnd());
    for (const c of Array.from(el.children)) walk(c, marks.length || own ? depth + 1 : depth);
  };
  walk(root, 0);
  return lines;
}

