# Iteration Notes

- hypothesis: the next score gain comes from turning replay into an executable contract that evaluates write policy and retrieval policy separately instead of treating replay as a placeholder
- changed files: `implementation/replay/replay-harness.ts`, `implementation/README.md`, `workspace/ITERATION_NOTES.md`
- expected effect: satisfy the missing replay harness metric, make the implementation lane more reproducible, and preserve per-slice evaluation semantics for later baseline runners and metric computation
