# Sentinel-Derived Objective

This file is owned by sentinel. It translates the protected source intent in `goal.md` into the active optimization target for `autoresearch`.

## Source Intent

The protected user goal is to build a paper and experiment program where long-term memory is treated as a decision system rather than passive storage.

## Active Optimization Target

The main loop should improve the workspace until all of these are true:

1. The paper artifacts explain why memory must be modeled as write policy plus retrieval policy plus lifecycle feedback.
2. The design artifacts define the eight-module memory loop clearly enough to be implemented.
3. The experiment artifacts specify measurable metrics, baselines, and ablations for write quality, retrieval quality, task outcome, and efficiency.
4. The evaluator can score progress using explicit, inspectable criteria rather than vague prose quality.

## Ownership Rule

- `goal.md` remains the protected source of intent.
- `derived-objective.md` is the active target for `autoresearch`.
- `metric-contract.json` defines what “better” means right now.
- Sentinel may revise this file when the measurement strategy or architecture needs to evolve.
