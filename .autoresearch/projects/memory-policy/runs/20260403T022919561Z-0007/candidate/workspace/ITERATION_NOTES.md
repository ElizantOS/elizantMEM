# Iteration Notes

- hypothesis: separating write-policy and retrieval-policy interfaces will make the design implementable and the experiment plan more falsifiable than treating memory as one blended manager
- changed files: `workspace/design/memory-loop.md`, `workspace/experiments/plan.md`, `workspace/experiments/eval-matrix.md`
- expected effect: improve architecture clarity, make reward attribution auditable, and let downstream implementation compare write-policy gains against retrieval-policy gains without confounding
- notes: added explicit policy observations/actions/labels, a ledger schema, decomposed reward terms, offline and online protocols, baseline and ablation structure for joint versus separate policies, and evaluation slices that force per-policy reporting
- reviewability rationale: the workspace now says exactly what must be logged, which decisions belong to write versus retrieval, and which experiment cuts are required before claiming the memory system works
- expected score impact: strengthen architecture coverage and experiment rigor qualitatively by replacing generic memory-manager language with inspectable policy boundaries, measurable reward terms, and a cleaner implementation hand-off
