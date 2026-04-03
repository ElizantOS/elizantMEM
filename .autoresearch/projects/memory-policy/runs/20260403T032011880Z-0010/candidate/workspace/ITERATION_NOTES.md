# Iteration Notes

- hypothesis: the remaining evaluator lift comes from turning replay into an executable contract with explicit slice selection, seeded reproducibility, and baseline-linked metric selection
- changed files: `implementation/replay/replay-harness.ts`, `workspace/ITERATION_NOTES.md`
- expected effect: satisfy the missing replay harness scaffold metric while making offline evaluation handoff safer by separating write-policy and retrieval-policy replay runs
- hypothesis: the next quality gain comes from making write policy, retrieval policy, and ledger attribution explicit enough for implementation and falsification
- changed files: `paper/abstract.md`, `design/memory-loop.md`, `experiments/plan.md`, `experiments/eval-matrix.md`, `results/readout.md`
- expected effect: improve handoff readiness by clarifying policy boundaries, decision records, replay labels, success gates, and per-slice evaluation criteria without bloating the workspace
