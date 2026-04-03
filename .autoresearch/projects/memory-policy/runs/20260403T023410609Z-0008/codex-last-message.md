I tightened the research program around one hypothesis: the workspace needed explicit policy boundaries and falsifiable evaluation, not more broad prose.

Changed files:
- [workspace/paper/abstract.md](/Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T023410609Z-0008/candidate/workspace/paper/abstract.md)
- [workspace/design/memory-loop.md](/Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T023410609Z-0008/candidate/workspace/design/memory-loop.md)
- [workspace/experiments/plan.md](/Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T023410609Z-0008/candidate/workspace/experiments/plan.md)
- [workspace/experiments/eval-matrix.md](/Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T023410609Z-0008/candidate/workspace/experiments/eval-matrix.md)
- [workspace/results/readout.md](/Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T023410609Z-0008/candidate/workspace/results/readout.md)
- [workspace/ITERATION_NOTES.md](/Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T023410609Z-0008/candidate/workspace/ITERATION_NOTES.md)

Simplifications made:
- Reduced the core claim to a clearer contract: separate `write policy` and `retrieval policy`, coupled by a `feedback ledger`.
- Turned the design doc into implementable control surfaces with decision records, action spaces, reward decomposition, and replay substrate.
- Turned the experiment docs into falsifiable questions, explicit baselines, task slices, success gates, and attribution rules instead of generic evaluation language.

Remaining risks:
- The workspace still does not specify a concrete replay dataset or trace schema.
- Offline attribution may still over-credit correlated memories until the replay window and causal labels are pinned down.
- No executable evaluation code exists yet, so improvement beyond the prior score depends on how much the hidden evaluator rewards sharper handoff structure.

Verification:
- Confirmed edits stayed within `workspace/` only.
- Re-read the updated design, plan, and matrix for consistency.
- No code tests were applicable in this documentation-only iteration.