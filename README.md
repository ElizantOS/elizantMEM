# auto-research

Codex-native autonomous research framework inspired by `karpathy/autoresearch`, but adapted for product and systems research instead of single-file GPU training.

The target user experience is OMX-like:

1. install the framework once
2. initialize a project from a research goal
3. let sentinel derive the active optimization contract
4. let the main loop iterate only on the editable research workspace
5. inspect health, runtime evidence, and paper/experiment artifacts through the dashboard

## Design

The controller keeps the loop narrow:

1. A project defines a protected source intent plus a narrow editable surface.
2. Sentinel bootstraps `control/derived-objective.md` and `control/metric-contract.json`.
3. `codex exec` proposes one iteration of changes inside a candidate copy.
4. An evaluator scores the candidate and returns JSON.
5. The controller accepts only allowed-file changes that improve the score.
6. Every iteration is written to `.autoresearch/projects/<name>/runs/<run-id>`.

This gives you:

- reviewable diffs
- explicit evaluation
- run ledger and state
- controlled promotion of successful iterations
- a separate sentinel maintenance lane and dashboard UI
- a built-in literature-grounding lane before experiment optimization

## Commands

```bash
bun run autoresearch list
bun run autoresearch init demo-memory --goal-file notes/memory-goal.md --description "Autonomous memory-policy research lane"
bun run autoresearch judge demo-memory
bun run autoresearch status demo-memory
bun run autoresearch sentinel demo-memory
bun run autoresearch run demo-memory --iterations 1 --model gpt-5.4-medium
bun run autoresearch sentinel demo-memory --codex --model gpt-5.4-medium
bun run autoresearch sentinel demo-memory --loop --codex --model gpt-5.4-medium
bun run autoresearch dashboard demo-memory
```

## Layout

```text
research/autoresearch/
  templates/               generic project templates

.autoresearch/
  projects/<name>/state.json
  projects/<name>/runs/<run-id>/
```

## Project Contract

Each project needs:

- `project.json`: controller config
- `goal.md`: research objective and constraints
- `program.md`: iteration rules for Codex
- `control/derived-objective.md`: sentinel-owned optimization target
- `control/metric-contract.json`: sentinel-owned metric contract
- `workspace/`: the only accepted edit surface
- `evaluation/evaluate.ts`: emits JSON `{"score": number, "summary": string, ...}`

Recommended workspace lanes:

- `workspace/literature/`: prior work review and benchmark map
- `workspace/design/`: architecture and contracts
- `workspace/experiments/`: hypotheses, metrics, ablations
- `workspace/results/`: result tables and failure notes
- `workspace/paper/`: abstract and outline

Projects can also define `sentinel` defaults for maintenance model, interval, and stagnation threshold.
They may additionally declare `sentinel.allowed_edit_roots` so the maintenance loop is code-gated to controller/template/control/evaluation surfaces.

For Codex CLI compatibility, `gpt-5.4-medium` is treated as:

- `--model gpt-5.4`
- `--config model_reasoning_effort="medium"`

The controller handles that mapping automatically for both the main loop and the sentinel maintenance loop.

The main controller will reject any candidate that edits files outside `allowed_edit_roots`.
The sentinel controller now uses the same candidate/promotion pattern for its maintenance lane, so prompt instructions are backed by code-level write-scope enforcement.

The original `goal.md` and `program.md` stay protected. `autoresearch` should optimize against sentinel-owned targets under `control/`, not rewrite the original user intent.

The intended lifecycle is:

1. `init` a project from a goal.
2. Let sentinel bootstrap `derived-objective.md` and `metric-contract.json`.
3. Use the first accepted iterations to populate `workspace/literature/` with benchmark and metric grounding.
4. Only then tighten design, experiments, and paper artifacts against the derived contract.

## Sentinel Phases

Sentinel now tracks a per-project phase in `.autoresearch/projects/<name>/phase.json`.

Current phases:

- `literature_grounding`
- `experiment_design`
- `experiment_bootstrap`
- `executable_experiments`

The important boundary is that sentinel, not the user or the main loop, decides when a project is ready to expand from pure `workspace/` research artifacts into executable experiment scaffolding such as `implementation/contracts/*`, `implementation/replay/*`, and `implementation/evaluation/*`.

## Event Triggers

The background sentinel loop can still run on a timer, but the controller now also supports event-driven sentinel passes.

- Default background cadence remains whatever `project.json.sentinel.interval_hours` specifies.
- After a non-dry `autoresearch run` completes, the controller immediately triggers a lightweight sentinel pass.
- That event-triggered pass can update phase state, widen `allowed_edit_roots`, rewrite `derived-objective.md`, and rewrite `metric-contract.json` without waiting for the next timed sentinel loop.

`init` now bootstraps a project the same way every time:

1. copy the template into `research/autoresearch/projects/<name>`
2. optionally inject the supplied goal text or goal file into `goal.md`
3. bootstrap sentinel-owned control files
4. write the initial runtime health report, maintenance queue, protected manifest, and dashboard

## Sentinel UI

`bun run autoresearch sentinel <project>` produces:

- `.autoresearch/projects/<name>/health.json`
- `.autoresearch/projects/<name>/health.md`
- `.autoresearch/projects/<name>/maintenance-queue.json`
- `.autoresearch/projects/<name>/dashboard.html`

The dashboard is the lightweight UI for:

- current score and best score
- recent iterations and changed files
- protected goal/program file digests
- failed or stalled run visibility via health issues
- git status for autoresearch-related files
- queued maintenance actions

When run with `--codex`, sentinel delegates future autoresearch infrastructure maintenance to a separate Codex loop. That lane is restricted to controller/templates/dashboard/config plus project `control/` and `evaluation/` surfaces. It must not rewrite `goal.md`, `program.md`, or the editable research workspace, and any invalid writes are rejected at promotion time.

## Recommended Cadence

Keep the main loop and sentinel loop separate:

```bash
# main research loop
bun run autoresearch run memory-policy --iterations 1

# health audit + dashboard refresh
bun run autoresearch sentinel memory-policy

# health audit + Codex maintenance
bun run autoresearch sentinel memory-policy --codex --model gpt-5.4-medium

# long-running sentinel loop
bun run autoresearch sentinel memory-policy --loop --codex --model gpt-5.4-medium
```

## Reference

The control philosophy is adapted from `karpathy/autoresearch`: fixed iteration loop, narrow edit surface, external scorer, keep-the-winner promotion.
