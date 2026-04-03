# Memory Loop Design

## Objective

Upgrade agent memory from passive storage to an explicit decision loop that learns:

- what to write
- what to skip
- when to retrieve
- what type of memory to retrieve
- when a memory has become stale or harmful

## Typed Memory Unit

Each memory unit should include:

- identity: memory id, tenant id, scope
- type: preference, schema, query pattern, business rule, exception case, skill case
- content: text body and compact summary
- provenance: source event ids and trace ids
- metadata: domain, tables, metrics, confidence, ttl, privacy
- lifecycle stats: retrieved count, used count, helpful count, harmful count, last used, value score

## Policy Boundary

The system keeps write policy and retrieval policy separate on purpose.

- write policy answers: should this candidate become memory, in what form, and with what lifecycle controls
- retrieval policy answers: should memory be consulted for this task, which memory types are admissible, and how much context budget to spend
- the feedback ledger is the coupling mechanism: it links prior writes and current retrieval decisions to downstream outcomes without collapsing the policies into one opaque score

## Control Records

Every policy decision should emit an auditable record.

### Write Decision Record

- input: source event ids, candidate type, novelty signals, stability signals, estimated reuse horizon, privacy scope
- actions: skip, write-new, merge-into-existing, replace-existing, shorten-ttl, extend-ttl, queue-for-review
- outputs: selected action, confidence, reason codes, affected memory ids

### Retrieval Decision Record

- input: current task features, user id, tenant scope, tool plan, predicted uncertainty, context budget
- actions: skip-retrieval, retrieve-episodic, retrieve-semantic, retrieve-procedural, hybrid-top-k, retrieve-with-abstain-guard
- outputs: selected action, memory ids considered, memory ids injected, token budget spent, abstention flag

### Ledger Event

- linkages: task id, write decision id, retrieval decision id, memory ids touched
- outcomes: task success, SQL success, retry count, token count, latency, human correction, abstention correctness
- attribution labels: helped, neutral, harmed, stale, duplicate, privacy-blocked

## Eight-Module Loop

### 1. Event Capture

- record request, role, domain, tools, SQL, retries, tokens, latency, final outcome

### 2. Candidate Generator

- extract candidate memories from user statements, successful traces, error recovery, and repeated workflows

### 3. Memory Scorer

- estimate novelty, reuse, stability, helpfulness, and risk
- produce score components rather than a single scalar so policy rules can be audited
- reserve a stability score for time-sensitive business rules and schemas

### 4. Write Policy

- action space starts with skip, write, merge, replace, ttl-short, ttl-long
- default training label: future-window utility of the written memory over the next N matching tasks
- minimum acceptance gates: privacy-safe, novelty above duplicate threshold, stability above domain-specific floor
- write policy should optimize write precision before storage volume

### 5. Memory Store

- split into episodic, semantic, and procedural layers
- episodic: trace fragments and prior task outcomes
- semantic: durable facts such as schema mappings, metric definitions, business rules
- procedural: reusable analysis plans, query templates, recovery tactics

### 6. Retrieval Policy

- decide whether to retrieve and which memory types or top-k mixture to inject
- optimize retrieve-or-skip first, then optimize type routing and top-k allocation
- retrieval policy should be allowed to abstain when confidence is low or stale risk is high

### 7. Execution Contextualizer

- rerank and compress retrieved memories before they enter planning or tool use
- tag each injected memory with source, age, and confidence so downstream failures remain attributable

### 8. Feedback Ledger

- log retrieved, injected, referenced, helped, harmed, delta token, delta latency, downstream outcome
- support delayed credit assignment by joining writes and retrievals against future tasks in a replay window
- maintain separate labels for write failures and retrieval failures so the two policies can improve independently

## Policy Learning Path

### Rules

- threshold-based write and retrieval gates to establish observability

### Contextual Bandit

- optimize write-or-skip and retrieve-or-skip under immediate downstream reward

### Multi-Step RL

- optimize the full trajectory from retrieval to execution to delayed writeback reward

## Reward Sketch

- positive: future reuse, task success, SQL success, lower retry count, lower token cost, lower latency
- negative: wrong answers, duplicates, stale retrievals, harmful context injection, storage growth

## Reward Decomposition

Use a decomposed reward instead of one blended scalar during early stages.

- write reward: helpful future reuse minus duplicate writes minus stale-memory harm minus privacy risk
- retrieval reward: task-success lift plus SQL-success lift plus retry reduction minus over-retrieval cost minus stale injection harm
- store-health reward: lower pollution rate, lower stale rate, bounded storage growth
- product reward: lower latency and lower token usage subject to no regression in task quality

This allows rules and bandits to optimize interpretable sub-objectives before full RL learns cross-step tradeoffs.

## Training And Replay Substrate

- unit of replay: one end-to-end analysis task plus the prior memory state snapshot
- candidate labels: whether a candidate memory would have helped within a defined future window
- retrieval labels: whether retrieved memory changed the downstream plan, tool execution, or final answer quality
- counterfactual slices: no retrieval, wrong retrieval, stale retrieval, correct retrieval but unused

## Open Implementation Decisions

- choose the replay matching window for "future reuse" without leaking answer labels across unrelated tasks
- define when a corrected answer updates an existing semantic memory versus creating a new episodic exception
- decide whether procedural memory should be retrieved into the planner, tool caller, or both

## Implementation Notes

- keep the trace format explicit enough for offline replay
- treat write policy and retrieval policy as separate but coupled learners
- preserve privacy and role scope in every memory unit
