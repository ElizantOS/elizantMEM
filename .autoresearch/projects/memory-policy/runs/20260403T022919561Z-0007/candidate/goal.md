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
