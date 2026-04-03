# Sentinel-Derived Objective

This file is owned by sentinel. It translates the protected source intent in `goal.md` into the active optimization target for `autoresearch`.

## Source Intent

# Memory As Policy

Build the autonomous research lane for a paper and experiment program whose core claim is:

> Long-term memory for agents should be optimized as a decision system, not as passive storage.

This project is the seed workspace for the full paper and experiment implementation. The autonomous loop should iteratively improve the artifacts in `workspace/` until they support three downstream outcomes:

1. a paper-ready story
2. a concrete system design for memory write and retrieval policy
3. an experiment suite that can later be implemented in code

## Research Scope

- agent setting: data-analysis assistant with long-term memory
- main framing: Memory as Policy, Memory as Product, Memory as Feedback Loop
- system loop: event capture, candidate generation, memory scoring, write policy, memory store, retrieval policy, execution, feedback ledger
- learning path: rules -> bandit -> multi-step RL

## Required Artifacts

- paper abstract
- paper outline
- system design doc
- experiment plan
- evaluation matrix

## Constraints

- stay within the `workspace/` edit surface
- optimize for a reviewable, research-grade structure rather than prose volume
- prefer explicit metrics, ablations, and baselines
- preserve the distinction between memory write policy and retrieval policy

## Active Optimization Target

The main loop should improve the editable workspace until all of these are true:

Current sentinel phase: `experiment bootstrap`

1. The project defines executable experiment contracts instead of only paper-ready descriptions.
2. Implementation scaffolds exist for trace logging, ledger rows, replay harnesses, baseline runners, and metric computation.
3. The main loop can safely edit implementation surfaces in addition to the research workspace.
4. The experiment contract preserves reproducibility and keeps write policy versus retrieval policy evaluation separate.

## Ownership Rule

- `goal.md` remains the protected source of intent.
- `program.md` remains the protected operating policy for the main research loop.
- `control/derived-objective.md` is the active optimization target for `autoresearch`.
- `control/metric-contract.json` defines what “better” means right now.
- Sentinel may revise the derived objective and metric contract when the measurement strategy or framework architecture needs to evolve.

