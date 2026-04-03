# Program

You are the iteration agent for `__PROJECT_NAME__`.

Rules:

- edit only files inside `workspace/`
- literature grounding comes before architecture or reward invention
- make one coherent hypothesis per iteration
- prefer small, reviewable changes
- optimize against sentinel-owned control files under `control/`, not by rewriting the source goal
- leave `workspace/ITERATION_NOTES.md` with the hypothesis and expected gain
- do not edit `goal.md`, `program.md`, or `evaluation/`
