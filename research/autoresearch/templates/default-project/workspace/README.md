# Workspace

This is the only edit surface that the main `autoresearch` loop is allowed to improve.

Recommended artifact lanes:

- `literature/`: prior work review, benchmark map, and metric sourcing
- `design/`: architecture, interfaces, assumptions, failure modes
- `experiments/`: hypotheses, baselines, metric matrix, rollout plan
- `results/`: running readout table, deltas, and failure-mode notes
- `paper/`: abstract, outline, and narrative drafts

Expected order:

1. Ground the project in literature and benchmarks.
2. Turn those findings into a design and experiment contract.
3. Refine paper and results artifacts as the system becomes implementable.
4. Update `ITERATION_NOTES.md` every accepted iteration.
