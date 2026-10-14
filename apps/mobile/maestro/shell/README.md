# Shell journeys (VTID-05186, N3) — G1 only

Run **only** against the G1 test environment with a native build (STATUS row 8b), never in CI and never against
production or staging (CLAUDE.md "NEVER TEST AGAINST PRODUCTION"). Every journey takes iOS and Android screenshots for
the program §4 visual-parity review against web staging at 390×844 (read-only).

```bash
maestro test -e G1_EMAIL=… -e G1_PASSWORD=… apps/mobile/maestro/shell/
```

`G1_*` values come from the G1 fixtures (synthetic member, patient grant, org fixtures). Sign-up, role switch, language
and tenant switch WRITE to the G1 project — that is what G1 is for; none of it may ever point at another project.
