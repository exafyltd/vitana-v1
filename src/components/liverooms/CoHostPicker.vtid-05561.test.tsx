/**
 * VTID-05561 — CoHostPicker: search, select, remove, max, keyboard, states.
 * Member search is mocked; no network.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CoHostPicker, MAX_CO_HOSTS, type CoHost } from "./CoHostPicker";

const search = vi.fn();
vi.mock("@/hooks/useMentionCandidates", () => ({
  useMentionCandidates: (q: string, enabled = true) => search(q, enabled),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, d: string, o?: Record<string, unknown>) => (o ? d.replace(/\{\{(\w+)\}\}/g, (_m, k) => String(o[k])) : d) }),
}));

const ANNA = { user_id: "u-anna", display_name: "Anna", avatar_url: null };
const BEN = { user_id: "u-ben", display_name: "Ben", avatar_url: null };

function setup(value: CoHost[] = [], onChange = vi.fn()) {
  render(<CoHostPicker value={value} onChange={onChange} />);
  return onChange;
}

describe("CoHostPicker", () => {
  beforeEach(() => {
    search.mockReset();
    search.mockReturnValue({ data: [ANNA, BEN], isLoading: false, isError: false });
  });

  it("asks for nothing and shows no list until something is typed", () => {
    setup();
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(search).toHaveBeenLastCalledWith("", expect.anything());
  });

  it("lists matching members and adds one on click", () => {
    const onChange = setup();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "an" } });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.mouseDown(screen.getByText("Anna"));
    expect(onChange).toHaveBeenCalledWith([ANNA]);
  });

  it("adds with Enter after arrow keys", () => {
    const onChange = setup();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith([BEN]);
  });

  it("does not offer a member who is already chosen", () => {
    setup([ANNA]);
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "an" } });
    expect(screen.queryByRole("option", { name: "Anna" })).toBeNull();
  });

  it("removes a chip with its remove button", () => {
    const onChange = setup([ANNA, BEN]);
    fireEvent.click(screen.getByRole("button", { name: "Remove Anna" }));
    expect(onChange).toHaveBeenCalledWith([BEN]);
  });

  it("stops at the maximum and disables the field", () => {
    const five = Array.from({ length: MAX_CO_HOSTS }, (_, i) => ({ user_id: `u${i}`, display_name: `M${i}`, avatar_url: null }));
    setup(five);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toContain("5");
  });

  it("shows the no-match state", () => {
    search.mockReturnValue({ data: [], isLoading: false, isError: false });
    setup();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zz" } });
    expect(screen.getByText("No members found")).toBeTruthy();
  });

  it("shows the same message when the search fails (no fabricated list)", () => {
    search.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    setup();
    const input = screen.getByRole("combobox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "zz" } });
    expect(screen.getByText("No members found")).toBeTruthy();
    expect(screen.queryByRole("option")).toBeNull();
  });
});
