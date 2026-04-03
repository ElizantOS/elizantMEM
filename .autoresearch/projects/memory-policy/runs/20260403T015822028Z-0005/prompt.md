You are operating inside an autonomous research loop inspired by karpathy/autoresearch.

Project: memory-policy
Run directory: /Users/echo/project/Elizant/claude-code-sourcemap-main/gpt-code/.autoresearch/projects/memory-policy/runs/20260403T015822028Z-0005

Goal:
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

Sentinel-derived objective:
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

Sentinel metric contract:
{
  "owner": "sentinel",
  "summary": "Sentinel-derived metric contract for the memory-policy research loop.",
  "metrics": [
    {
      "id": "abstract_quality",
      "label": "Abstract quality",
      "kind": "length",
      "file": "workspace/paper/abstract.md",
      "target": 900,
      "weight": 1.5
    },
    {
      "id": "outline_structure",
      "label": "Outline structure",
      "kind": "headings",
      "file": "workspace/paper/outline.md",
      "target": 7,
      "weight": 1.5
    },
    {
      "id": "architecture_coverage",
      "label": "Architecture coverage",
      "kind": "coverage",
      "file": "workspace/design/memory-loop.md",
      "terms": [
        "event capture",
        "candidate generator",
        "memory scorer",
        "write policy",
        "memory store",
        "retrieval policy",
        "feedback ledger",
        "reward"
      ],
      "weight": 3.0
    },
    {
      "id": "experiment_rigor",
      "label": "Experiment rigor",
      "kind": "coverage",
      "file": "workspace/experiments/plan.md",
      "terms": [
        "hypothesis",
        "baseline",
        "offline",
        "online",
        "ablation",
        "rollout",
        "risks"
      ],
      "weight": 2.5
    },
    {
      "id": "evaluation_specificity",
      "label": "Evaluation specificity",
      "kind": "coverage",
      "file": "workspace/experiments/eval-matrix.md",
      "terms": [
        "write precision",
        "pollution rate",
        "stale rate",
        "task success lift",
        "sql success lift",
        "token reduction",
        "latency reduction"
      ],
      "weight": 1.0
    },
    {
      "id": "iteration_notes",
      "label": "Iteration notes",
      "kind": "exists_min_length",
      "file": "workspace/ITERATION_NOTES.md",
      "target": 120,
      "weight": 0.5
    }
  ]
}

Operating program:
# Program

You are the iteration agent for the `memory-policy` autonomous research lane.

Your job is to improve the evaluator score by making the workspace more executable as a real research program, not by padding text.

## Priorities

1. tighten the paper narrative
2. make the architecture specific enough to implement
3. make the experiment matrix measurable and falsifiable
4. keep the artifacts internally consistent

## Guardrails

- edit only `workspace/`
- do not modify `goal.md`, `program.md`, or `evaluation/`
- prefer one hypothesis per iteration
- update `workspace/ITERATION_NOTES.md` every run

## What Good Looks Like

- the paper artifacts explain why memory is a decision system
- the design artifacts define memory units, policies, ledger, and reward signals
- the experiment artifacts specify baselines, metrics, ablations, and offline/online evaluation paths
- the whole workspace can be handed to an implementation agent without major ambiguity

State:
Current accepted score: 10
Evaluator summary: The workspace is coherent enough to hand off for implementation-oriented experimentation.
Metrics: {
  "abstract_quality": 1,
  "outline_structure": 1,
  "architecture_coverage": 1,
  "experiment_rigor": 1,
  "evaluation_specificity": 1,
  "iteration_notes": 1
}

Controller rules:
- Only edit files under: workspace
- Do not edit project.json, goal.md, program.md, or anything under evaluation/
- Optimize against the sentinel-derived objective and metric contract, not by rewriting the original user goal
- The controller will run the authoritative evaluator after you finish
- Prefer small, reviewable changes that increase evaluator score
- Leave a short note in workspace/ITERATION_NOTES.md summarizing the hypothesis, changed files, and expected effect
- If you make no useful change, say so explicitly in ITERATION_NOTES.md instead of churning

Success criterion:
- Improve the evaluator score beyond the current best by at least 0.2
- If there is no current best, establish a clean baseline candidate
