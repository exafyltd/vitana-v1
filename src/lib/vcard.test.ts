/** VTID-05058 — .vcf files as iPhone, Google and older Android phones export them. */
import { describe, it, expect } from "vitest";
import { parseVCards } from "./vcard";

describe("parseVCards", () => {
  it("reads an iPhone export (3.0, grouped items, CRLF, folded lines)", () => {
    const vcf = [
      "BEGIN:VCARD", "VERSION:3.0", "N:Müller;Anna;;;", "FN:Anna Müller",
      "item1.TEL;type=CELL;type=pref:+49 170 1234567", "item1.X-ABLabel:mobil",
      "EMAIL;type=INTERNET;type=HOME:anna@example.com",
      "NOTE:a very long note that the phone folded onto",
      " a second line",
      "END:VCARD",
      "BEGIN:VCARD", "VERSION:3.0", "N:;Bo;;;", "TEL;type=HOME:0221 123456", "END:VCARD",
    ].join("\r\n");
    expect(parseVCards(vcf)).toEqual([
      { name: "Anna Müller", emails: ["anna@example.com"], phones: ["+49 170 1234567"] },
      { name: "Bo", emails: [], phones: ["0221 123456"] },
    ]);
  });

  it("reads a 2.1 export with quoted-printable UTF-8 names", () => {
    const vcf = [
      "BEGIN:VCARD", "VERSION:2.1",
      "N;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:=C4=90or=C4=91evi=C4=87;Milo=C5=A1;;;",
      "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Milo=C5=A1 =C4=90or=C4=91evi=C4=87",
      "TEL;CELL:+381641234567", "END:VCARD",
    ].join("\n");
    expect(parseVCards(vcf)).toEqual([{ name: "Miloš Đorđević", emails: [], phones: ["+381641234567"] }]);
  });

  it("joins quoted-printable soft line breaks", () => {
    const vcf = ["BEGIN:VCARD", "VERSION:2.1", "FN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:J=C3=BC=", "rgen", "TEL:0170 1", "END:VCARD"].join("\n");
    expect(parseVCards(vcf)[0].name).toBe("Jürgen");
  });

  it("4.0 tel: / mailto: URIs and escaped commas", () => {
    const vcf = ["BEGIN:VCARD", "VERSION:4.0", "FN:Doe\\, Jane", "TEL;VALUE=uri:tel:+1-212-555-0123", "EMAIL:mailto:jane@example.com", "END:VCARD"].join("\n");
    expect(parseVCards(vcf)).toEqual([{ name: "Doe, Jane", emails: ["jane@example.com"], phones: ["+1-212-555-0123"] }]);
  });

  it("falls back to a number when there is no name; skips empty cards and junk", () => {
    const vcf = ["junk", "BEGIN:VCARD", "VERSION:3.0", "TEL:0170 9", "END:VCARD", "BEGIN:VCARD", "VERSION:3.0", "END:VCARD"].join("\n");
    expect(parseVCards(vcf)).toEqual([{ name: "0170 9", emails: [], phones: ["0170 9"] }]);
    expect(parseVCards("hello world")).toEqual([]);
  });

  it("drops duplicate numbers within one card", () => {
    const vcf = ["BEGIN:VCARD", "FN:A", "TEL:1", "TEL:1", "END:VCARD"].join("\n");
    expect(parseVCards(vcf)[0].phones).toEqual(["1"]);
  });
});
