# code_analyzer/

Reserved for the source-code and Git-history analysis engine, added in
a later phase:

- `parsers/` — language-aware source-code parsers.
- `metrics/` — complexity, size, and coupling metric calculators.
- `extractors/` — Git-history feature extractors (churn, authorship,
  commit frequency).

Because this component will eventually process **untrusted**
repositories, it is designed to be isolable/sandboxable. No repository
code is executed by this project in the current phase.
