import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs'
import { createHash } from 'crypto'
import { dirname, join, relative, resolve } from 'path'

type CommandName =
  | 'help'
  | 'init'
  | 'judge'
  | 'list'
  | 'run'
  | 'sentinel'
  | 'dashboard'
  | 'status'

type ProjectConfig = {
  name: string
  description: string
  goal_file: string
  program_file: string
  derived_goal_file?: string
  metric_contract_file?: string
  workspace_dir: string
  allowed_edit_roots: string[]
  ignored_diff_roots?: string[]
  protected_paths?: string[]
  evaluation_command: string[]
  minimum_improvement?: number
  codex?: {
    model?: string
    sandbox?: 'read-only' | 'workspace-write' | 'danger-full-access'
    timeout_minutes?: number
    search?: boolean
  }
  sentinel?: {
    codex_model?: string
    codex_timeout_minutes?: number
    interval_hours?: number
    stagnation_threshold?: number
    allowed_edit_roots?: string[]
    event_trigger_on_run_complete?: boolean
  }
}

type SentinelPhase =
  | 'literature_grounding'
  | 'experiment_design'
  | 'experiment_bootstrap'
  | 'executable_experiments'

type EvaluationResult = {
  score: number
  summary: string
  metrics?: Record<string, number>
  recommendation?: string
}

type RunRecord = {
  runId: string
  status: 'accepted' | 'rejected' | 'baseline' | 'failed'
  dryRun: boolean
  score: number
  scoreDelta: number
  baselineScore: number
  bestScoreAfterRun: number
  changedFiles: string[]
  invalidChanges: string[]
  codexExitCode: number | null
  evaluation: EvaluationResult
  createdAt: string
  timedOut?: boolean
  error?: string
}

type ProjectState = {
  project: string
  bestScore: number | null
  bestRunId: string | null
  totalRuns: number
  acceptedRuns: string[]
  rejectedRuns: string[]
  failedRuns: string[]
  createdAt: string
  updatedAt: string
  lastRun?: RunRecord
}

type ProtectedDigest = {
  path: string
  digest: string
}

type HealthIssue = {
  id: string
  severity: 'info' | 'warning' | 'critical'
  summary: string
  suggestedAction: string
}

type MaintenanceAction = {
  title: string
  command: string
}

type HealthReport = {
  project: string
  generatedAt: string
  phase: PhaseState
  evaluation: EvaluationResult
  summary: {
    totalRuns: number
    acceptedRuns: number
    rejectedRuns: number
    failedRuns: number
    bestScore: number | null
    lastRunStatus: RunRecord['status'] | 'n/a'
    lastPromotedRunId: string | null
    lastPromotedAt: string | null
    consecutiveRejectedRuns: number
    consecutiveNoChangeRuns: number
  }
  protectedFiles: {
    tracked: ProtectedDigest[]
    drift: string[]
  }
  versioning: {
    gitStatusLines: string[]
  }
  recentRuns: RunRecord[]
  topChangedFiles: Array<{ path: string; count: number }>
  issues: HealthIssue[]
  maintenanceQueue: MaintenanceAction[]
}

type PhaseState = {
  current: SentinelPhase
  reason: string
  evidence: string[]
  updatedAt: string
}

type SentinelRunRecord = {
  runId: string
  createdAt: string
  codexInvoked: boolean
  codexExitCode: number | null
  timedOut: boolean
  healthIssueCount: number
  maintenancePromptPath: string | null
  maintenanceOutputPath: string | null
  changedFiles: string[]
  invalidChanges: string[]
  promotedPaths: string[]
}

type ParsedArgs = {
  positional: string[]
  flags: Map<string, string | boolean>
}

const repoRoot = resolve(import.meta.dir, '..')
const researchRoot = join(repoRoot, 'research', 'autoresearch')
const projectsRoot = join(researchRoot, 'projects')
const templatesRoot = join(researchRoot, 'templates')
const runtimeRoot = join(repoRoot, '.autoresearch')

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = []
  const flags = new Map<string, string | boolean>()

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]!
    if (!token.startsWith('--')) {
      positional.push(token)
      continue
    }

    const body = token.slice(2)
    const eqIndex = body.indexOf('=')
    if (eqIndex >= 0) {
      flags.set(body.slice(0, eqIndex), body.slice(eqIndex + 1))
      continue
    }

    const next = args[index + 1]
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(body, next)
      index += 1
      continue
    }

    flags.set(body, true)
  }

  return { positional, flags }
}

function getFlag(
  args: ParsedArgs,
  name: string,
): string | boolean | undefined {
  return args.flags.get(name)
}

function getStringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = getFlag(args, name)
  return typeof value === 'string' ? value : undefined
}

function getBooleanFlag(args: ParsedArgs, name: string): boolean {
  return getFlag(args, name) === true
}

function getNumberFlag(
  args: ParsedArgs,
  name: string,
  fallback: number,
): number {
  const value = getStringFlag(args, name)
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true })
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function writeJsonFile(path: string, value: unknown): void {
  ensureDir(dirname(path))
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function relativePosix(base: string, path: string): string {
  return relative(base, path).replaceAll('\\', '/')
}

function projectDir(projectName: string): string {
  return join(projectsRoot, projectName)
}

function projectConfigPath(projectName: string): string {
  return join(projectDir(projectName), 'project.json')
}

function projectRuntimeDir(projectName: string): string {
  return join(runtimeRoot, 'projects', projectName)
}

function projectStatePath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'state.json')
}

function projectRunsDir(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'runs')
}

function projectHealthPath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'health.json')
}

function projectPhasePath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'phase.json')
}

function projectDashboardPath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'dashboard.html')
}

function projectManifestPath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'protected-manifest.json')
}

function projectMaintenanceQueuePath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'maintenance-queue.json')
}

function projectHealthMarkdownPath(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'health.md')
}

function projectSentinelDir(projectName: string): string {
  return join(projectRuntimeDir(projectName), 'sentinel')
}

function loadProjectConfig(projectName: string): ProjectConfig {
  const configPath = projectConfigPath(projectName)
  if (!existsSync(configPath)) {
    throw new Error(`Project "${projectName}" does not exist at ${configPath}`)
  }
  return readJsonFile<ProjectConfig>(configPath)
}

function loadProjectState(projectName: string): ProjectState {
  const statePath = projectStatePath(projectName)
  if (existsSync(statePath)) {
    const state = readJsonFile<ProjectState>(statePath)
    state.failedRuns ??= []
    return state
  }

  const now = new Date().toISOString()
  return {
    project: projectName,
    bestScore: null,
    bestRunId: null,
    totalRuns: 0,
    acceptedRuns: [],
    rejectedRuns: [],
    failedRuns: [],
    createdAt: now,
    updatedAt: now,
  }
}

function saveProjectState(projectName: string, state: ProjectState): void {
  state.updatedAt = new Date().toISOString()
  writeJsonFile(projectStatePath(projectName), state)
}

function loadPhaseState(projectName: string): PhaseState {
  const phasePath = projectPhasePath(projectName)
  if (existsSync(phasePath)) {
    return readJsonFile<PhaseState>(phasePath)
  }

  return {
    current: 'literature_grounding',
    reason: 'Default phase before sentinel has evaluated project readiness.',
    evidence: [],
    updatedAt: new Date().toISOString(),
  }
}

function savePhaseState(projectName: string, phase: PhaseState): void {
  writeJsonFile(projectPhasePath(projectName), phase)
}

function listProjectNames(): string[] {
  if (!existsSync(projectsRoot)) return []
  return readdirSync(projectsRoot)
    .filter(entry => existsSync(join(projectsRoot, entry, 'project.json')))
    .sort()
}

function listFilesRecursive(root: string): string[] {
  if (!existsSync(root)) return []

  const files: string[] = []
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const fullPath = join(current, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (stat.isFile()) {
        files.push(relativePosix(root, fullPath))
      }
    }
  }

  walk(root)
  files.sort()
  return files
}

function fileDigest(path: string): string {
  const hash = createHash('sha1')
  hash.update(readFileSync(path))
  return hash.digest('hex')
}

function collectFileDigests(root: string): Map<string, string> {
  const digests = new Map<string, string>()
  for (const file of listFilesRecursive(root)) {
    digests.set(file, fileDigest(join(root, file)))
  }
  return digests
}

function changedFilesBetween(previousRoot: string, nextRoot: string): string[] {
  const previous = collectFileDigests(previousRoot)
  const next = collectFileDigests(nextRoot)
  const changed = new Set<string>()
  for (const file of new Set([...previous.keys(), ...next.keys()])) {
    if (previous.get(file) !== next.get(file)) {
      changed.add(file)
    }
  }
  return [...changed].sort()
}

function filterIgnoredPaths(
  paths: string[],
  ignoredRoots: string[],
): string[] {
  if (ignoredRoots.length === 0) return paths
  return paths.filter(path => !isAllowedPath(path, ignoredRoots))
}

function isAllowedPath(relativePath: string, allowedRoots: string[]): boolean {
  return allowedRoots.some(root => {
    const normalized = root.replaceAll('\\', '/').replace(/\/+$/, '')
    return (
      relativePath === normalized ||
      relativePath.startsWith(`${normalized}/`)
    )
  })
}

function syncAllowedRoots(
  sourceProjectRoot: string,
  targetProjectRoot: string,
  allowedRoots: string[],
): void {
  for (const root of allowedRoots) {
    const source = join(sourceProjectRoot, root)
    const target = join(targetProjectRoot, root)

    rmSync(target, { recursive: true, force: true })
    if (existsSync(source)) {
      ensureDir(dirname(target))
      cpSync(source, target, { recursive: true })
    }
  }
}

function normalizeCommandName(raw?: string): CommandName {
  switch (raw) {
    case 'init':
    case 'judge':
    case 'list':
    case 'run':
    case 'sentinel':
    case 'dashboard':
    case 'status':
      return raw
    default:
      return 'help'
  }
}

function printHelp(): void {
  console.log(`autoresearch

Usage:
  bun run autoresearch list
  bun run autoresearch init <project-name> [--template default-project] [--goal-file notes/my-goal.md | --goal "research brief"] [--description "..."]
  bun run autoresearch judge <project-name>
  bun run autoresearch status <project-name>
  bun run autoresearch run <project-name> [--iterations 3] [--model gpt-5.4-medium] [--search] [--dry-run]
  bun run autoresearch sentinel <project-name> [--fix] [--refresh-protected] [--codex]
  bun run autoresearch sentinel <project-name> --loop --codex [--model gpt-5.4-medium]
  bun run autoresearch dashboard <project-name>

Notes:
  - Projects live in research/autoresearch/projects/<name>
  - Runtime state lives in .autoresearch/projects/<name>
  - init bootstraps sentinel-owned control files and writes the first dashboard/health artifacts
  - The run loop calls Codex directly with "codex exec"
  - Sentinel emits health artifacts, a maintenance queue, and a connected HTML dashboard
  - Only files inside project.json.allowed_edit_roots are promoted back into the main workspace
  - Files inside project.json.ignored_diff_roots are ignored when evaluating candidate drift
`)
}

function copyTemplateProject(
  templateName: string,
  projectName: string,
  extraReplacements: Record<string, string> = {},
): void {
  const templateDir = join(templatesRoot, templateName)
  const targetDir = projectDir(projectName)
  if (!existsSync(templateDir)) {
    throw new Error(`Template "${templateName}" does not exist`)
  }
  if (existsSync(targetDir)) {
    throw new Error(`Project "${projectName}" already exists`)
  }

  ensureDir(dirname(targetDir))
  cpSync(templateDir, targetDir, { recursive: true })

  const replacements: Record<string, string> = {
    '__PROJECT_NAME__': projectName,
    '__PROJECT_TITLE__': projectName.replaceAll('-', ' '),
    '__PROJECT_DESCRIPTION__': `Autonomous research lane for ${projectName.replaceAll('-', ' ')}`,
    '__RESEARCH_GOAL__': 'Define a research objective that benefits from autonomous iteration.',
    ...extraReplacements,
  }

  for (const file of listFilesRecursive(targetDir)) {
    if (!/\.(json|md|ts|txt)$/i.test(file)) continue
    const fullPath = join(targetDir, file)
    let content = readFileSync(fullPath, 'utf8')
    for (const [needle, value] of Object.entries(replacements)) {
      content = content.replaceAll(needle, value)
    }
    writeFileSync(fullPath, content, 'utf8')
  }
}

function readTextFile(path: string): string {
  return readFileSync(path, 'utf8')
}

function writeTextFile(path: string, content: string): void {
  ensureDir(dirname(path))
  writeFileSync(path, content, 'utf8')
}

function rewriteProjectConfig(
  projectName: string,
  mutate: (config: ProjectConfig) => ProjectConfig,
): ProjectConfig {
  const configPath = projectConfigPath(projectName)
  const next = mutate(loadProjectConfig(projectName))
  writeJsonFile(configPath, next)
  return next
}

function getGoalSeed(parsedArgs: ParsedArgs): string | null {
  const inlineGoal = getStringFlag(parsedArgs, 'goal')
  if (inlineGoal) return inlineGoal.trim()

  const goalFile = getStringFlag(parsedArgs, 'goal-file')
  if (!goalFile) return null

  const fullPath = resolve(repoRoot, goalFile)
  if (!existsSync(fullPath)) {
    throw new Error(`Goal file does not exist: ${goalFile}`)
  }
  return readTextFile(fullPath).trim()
}

function normalizeDocumentTitle(projectName: string): string {
  return projectName.replaceAll('-', ' ')
}

function formatGoalDocument(projectName: string, goalSeed: string): string {
  const trimmed = goalSeed.trim()
  if (trimmed.startsWith('#')) return `${trimmed}\n`

  return `# ${normalizeDocumentTitle(projectName)}

${trimmed}
`
}

function getSentinelAllowedRoots(
  projectName: string,
  config: ProjectConfig,
): string[] {
  const defaults = [
    'scripts/autoresearch.ts',
    'research/autoresearch/README.md',
    'research/autoresearch/templates',
    `research/autoresearch/projects/${projectName}/project.json`,
    `research/autoresearch/projects/${projectName}/control`,
    `research/autoresearch/projects/${projectName}/evaluation`,
  ]

  return [
    ...new Set([...(config.sentinel?.allowed_edit_roots ?? []), ...defaults]),
  ].sort()
}

function buildDerivedObjective(
  projectName: string,
  config: ProjectConfig,
  phase: SentinelPhase,
): string {
  const goalText = readTextFile(join(projectDir(projectName), config.goal_file)).trim()
  const phaseObjectives: Record<SentinelPhase, string[]> = {
    literature_grounding: [
      'The workspace begins with literature grounding before inventing new system metrics or reward formulas.',
      'Literature artifacts extract benchmark tasks, metric definitions, baselines, and open engineering gaps from prior work.',
      'The evaluator contract measures structured research progress rather than vague prose quality alone.',
    ],
    experiment_design: [
      'The research design is explicit enough to implement without rewriting the original goal.',
      'The experiment plan names baselines, metrics, ablations, risks, and rollout stages clearly enough to score iteration quality.',
      'The paper artifacts explain the problem, method, evaluation plan, target results, and limitations coherently.',
      'Every accepted iteration leaves a concrete trail in the workspace iteration notes.',
    ],
    experiment_bootstrap: [
      'The project defines executable experiment contracts instead of only paper-ready descriptions.',
      'Implementation scaffolds exist for trace logging, ledger rows, replay harnesses, baseline runners, and metric computation.',
      'The main loop can safely edit implementation surfaces in addition to the research workspace.',
      'The experiment contract preserves reproducibility and keeps write policy versus retrieval policy evaluation separate.',
    ],
    executable_experiments: [
      'The project runs executable experiments over the defined replay and rollout surfaces.',
      'Result artifacts report baseline comparisons, deltas, and failure modes from actual experiment runs.',
      'The evaluation contract now emphasizes runnable experiment outputs and reproducible result generation.',
    ],
  }
  const phaseTitle = phase.replaceAll('_', ' ')

  return `# Sentinel-Derived Objective

This file is owned by sentinel. It translates the protected source intent in \`${config.goal_file}\` into the active optimization target for \`autoresearch\`.

## Source Intent

${goalText}

## Active Optimization Target

The main loop should improve the editable workspace until all of these are true:

Current sentinel phase: \`${phaseTitle}\`

${phaseObjectives[phase].map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Ownership Rule

- \`${config.goal_file}\` remains the protected source of intent.
- \`${config.program_file}\` remains the protected operating policy for the main research loop.
- \`${config.derived_goal_file ?? 'control/derived-objective.md'}\` is the active optimization target for \`autoresearch\`.
- \`${config.metric_contract_file ?? 'control/metric-contract.json'}\` defines what “better” means right now.
- Sentinel may revise the derived objective and metric contract when the measurement strategy or framework architecture needs to evolve.
`
}

function buildMetricContract(phase: SentinelPhase): Record<string, unknown> {
  const sharedMetrics = [
    {
      id: 'iteration_notes',
      label: 'Iteration notes',
      kind: 'exists_min_length',
      file: 'workspace/ITERATION_NOTES.md',
      target: 120,
      weight: 0.5,
    },
  ]

  if (phase === 'literature_grounding') {
    return {
      owner: 'sentinel',
      summary:
        'Sentinel-owned metric contract for literature-grounded research progress across design, experiments, results, and paper artifacts.',
      metrics: [
        {
          id: 'literature_review',
          label: 'Literature grounding review',
          kind: 'coverage',
          file: 'workspace/literature/review.md',
          terms: [
            'paper',
            'benchmark',
            'metric',
            'retrieval',
            'write policy',
            'memory',
            'gap',
          ],
          weight: 2.0,
        },
        {
          id: 'benchmark_map',
          label: 'Benchmark and metric map',
          kind: 'table_rows',
          file: 'workspace/literature/benchmark-map.md',
          target: 4,
          weight: 1.5,
        },
        {
          id: 'paper_outline_structure',
          label: 'Paper outline structure',
          kind: 'coverage',
          file: 'workspace/paper/outline.md',
          terms: ['problem', 'method', 'experiments', 'results', 'limitations'],
          weight: 2.0,
        },
        {
          id: 'paper_abstract_presence',
          label: 'Abstract draft exists',
          kind: 'exists_min_length',
          file: 'workspace/paper/abstract.md',
          target: 180,
          weight: 1.0,
        },
        {
          id: 'design_specificity',
          label: 'System design specificity',
          kind: 'coverage',
          file: 'workspace/design/system.md',
          terms: ['architecture', 'interfaces', 'data flow', 'failure modes', 'guardrails'],
          weight: 2.5,
        },
        {
          id: 'experiment_rigor',
          label: 'Experiment rigor',
          kind: 'coverage',
          file: 'workspace/experiments/plan.md',
          terms: ['hypothesis', 'baseline', 'metrics', 'ablations', 'risks', 'rollout'],
          weight: 3.0,
        },
        {
          id: 'evaluation_matrix_rows',
          label: 'Evaluation matrix breadth',
          kind: 'table_rows',
          file: 'workspace/experiments/eval-matrix.md',
          target: 4,
          weight: 1.5,
        },
        {
          id: 'results_readout',
          label: 'Results readout scaffold',
          kind: 'coverage',
          file: 'workspace/results/readout.md',
          terms: ['baseline', 'variant', 'delta', 'failure modes', 'next hypothesis'],
          weight: 1.5,
        },
        ...sharedMetrics,
      ],
    }
  }

  if (phase === 'experiment_design') {
    return {
      owner: 'sentinel',
      summary:
        'Sentinel-owned metric contract for implementation-ready experiment design.',
      metrics: [
        {
          id: 'architecture_coverage',
          label: 'Architecture coverage',
          kind: 'coverage',
          file: 'workspace/design/memory-loop.md',
          terms: [
            'event capture',
            'candidate generator',
            'memory scorer',
            'write policy',
            'memory store',
            'retrieval policy',
            'feedback ledger',
            'reward',
          ],
          weight: 3.0,
        },
        {
          id: 'experiment_rigor',
          label: 'Experiment rigor',
          kind: 'coverage',
          file: 'workspace/experiments/plan.md',
          terms: ['hypothesis', 'baseline', 'offline', 'online', 'ablation', 'rollout', 'risks'],
          weight: 3.0,
        },
        {
          id: 'evaluation_specificity',
          label: 'Evaluation specificity',
          kind: 'coverage',
          file: 'workspace/experiments/eval-matrix.md',
          terms: [
            'write precision',
            'pollution rate',
            'stale rate',
            'task success lift',
            'sql success lift',
            'token reduction',
            'latency reduction',
          ],
          weight: 2.0,
        },
        {
          id: 'results_readout',
          label: 'Results readout scaffold',
          kind: 'coverage',
          file: 'workspace/results/readout.md',
          terms: ['baseline', 'variant', 'delta', 'failure modes', 'next hypothesis'],
          weight: 1.5,
        },
        ...sharedMetrics,
      ],
    }
  }

  if (phase === 'experiment_bootstrap') {
    return {
      owner: 'sentinel',
      summary:
        'Sentinel-owned metric contract for bootstrapping executable experiment code.',
      metrics: [
        {
          id: 'trace_schema',
          label: 'Trace schema contract',
          kind: 'exists_min_length',
          file: 'implementation/contracts/trace-schema.ts',
          target: 240,
          weight: 2.0,
        },
        {
          id: 'ledger_schema',
          label: 'Ledger schema contract',
          kind: 'exists_min_length',
          file: 'implementation/contracts/ledger-schema.ts',
          target: 240,
          weight: 2.0,
        },
        {
          id: 'replay_harness',
          label: 'Replay harness scaffold',
          kind: 'exists_min_length',
          file: 'implementation/replay/replay-harness.ts',
          target: 240,
          weight: 2.0,
        },
        {
          id: 'baseline_registry',
          label: 'Baseline registry scaffold',
          kind: 'exists_min_length',
          file: 'implementation/baselines/registry.ts',
          target: 180,
          weight: 1.5,
        },
        {
          id: 'metric_engine',
          label: 'Metric computation scaffold',
          kind: 'exists_min_length',
          file: 'implementation/evaluation/metrics.ts',
          target: 180,
          weight: 1.5,
        },
        {
          id: 'implementation_readme',
          label: 'Implementation roadmap',
          kind: 'coverage',
          file: 'implementation/README.md',
          terms: ['trace', 'ledger', 'replay', 'baseline', 'evaluation'],
          weight: 1.5,
        },
        ...sharedMetrics,
      ],
    }
  }

  return {
    owner: 'sentinel',
    summary:
      'Sentinel-owned metric contract for runnable experiment execution and result generation.',
    metrics: [
      {
        id: 'trace_schema',
        label: 'Trace schema contract',
        kind: 'exists_min_length',
        file: 'implementation/contracts/trace-schema.ts',
        target: 240,
        weight: 1.0,
      },
      {
        id: 'ledger_schema',
        label: 'Ledger schema contract',
        kind: 'exists_min_length',
        file: 'implementation/contracts/ledger-schema.ts',
        target: 240,
        weight: 1.0,
      },
      {
        id: 'replay_harness',
        label: 'Replay harness scaffold',
        kind: 'exists_min_length',
        file: 'implementation/replay/replay-harness.ts',
        target: 240,
        weight: 1.0,
      },
      {
        id: 'metrics_runner',
        label: 'Metric runner result mapping',
        kind: 'coverage',
        file: 'implementation/evaluation/metrics.ts',
        terms: [
          'write precision',
          'pollution rate',
          'stale rate',
          'task success lift',
          'latency reduction',
        ],
        weight: 2.0,
      },
      {
        id: 'results_readout',
        label: 'Results readout scaffold',
        kind: 'coverage',
        file: 'workspace/results/readout.md',
        terms: ['baseline', 'variant', 'delta', 'failure modes', 'next hypothesis'],
        weight: 1.5,
      },
      ...sharedMetrics,
    ],
  }
}

function getIgnoredDiffRoots(config: ProjectConfig): string[] {
  return [...new Set(['.omx', ...(config.ignored_diff_roots ?? [])])].sort()
}

function acceptedNonDryRuns(runs: RunRecord[]): RunRecord[] {
  return runs.filter(run => run.status === 'accepted' && !run.dryRun)
}

function projectFileText(projectName: string, relativePath: string): string {
  const fullPath = join(projectDir(projectName), relativePath)
  return existsSync(fullPath) ? readTextFile(fullPath) : ''
}

function projectFileMinLength(
  projectName: string,
  relativePath: string,
  minLength: number,
): boolean {
  return projectFileText(projectName, relativePath).trim().length >= minLength
}

function projectFileCoverage(
  projectName: string,
  relativePath: string,
  terms: string[],
): number {
  const text = projectFileText(projectName, relativePath).toLowerCase()
  if (terms.length === 0) return 0
  const matched = terms.filter(term => text.includes(term.toLowerCase())).length
  return matched / terms.length
}

function projectFileTableRows(
  projectName: string,
  relativePath: string,
): number {
  const text = projectFileText(projectName, relativePath)
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.includes('|'))

  return lines.filter(
    line => line !== '' && !/^[:|\-\s]+$/.test(line.replaceAll('|', '')),
  ).length
}

function inferSentinelPhase(
  projectName: string,
  state: ProjectState,
  runs: RunRecord[],
  config: ProjectConfig,
): Omit<PhaseState, 'updatedAt'> {
  const nonDryAccepted = acceptedNonDryRuns(runs)
  const implementationEnabled = config.allowed_edit_roots.includes('implementation')
  const literatureReady =
    projectFileCoverage(projectName, 'workspace/literature/review.md', [
      'MemGPT',
      'LongMemEval',
      'LoCoMo',
      'Memory-R1',
      'AgeMem',
      'MemRL',
      'AtomMem',
    ]) >= 1 &&
    projectFileTableRows(projectName, 'workspace/literature/benchmark-map.md') >= 6
  const designReady =
    projectFileCoverage(projectName, 'workspace/design/memory-loop.md', [
      'event capture',
      'candidate generator',
      'memory scorer',
      'write policy',
      'memory store',
      'retrieval policy',
      'feedback ledger',
      'reward',
    ]) >= 1 &&
    projectFileCoverage(projectName, 'workspace/experiments/plan.md', [
      'hypothesis',
      'baseline',
      'offline',
      'online',
      'ablation',
      'rollout',
      'risks',
    ]) >= 1 &&
    projectFileCoverage(projectName, 'workspace/experiments/eval-matrix.md', [
      'write precision',
      'pollution rate',
      'stale rate',
      'task success lift',
      'sql success lift',
      'token reduction',
      'latency reduction',
    ]) >= 1 &&
    projectFileCoverage(projectName, 'workspace/results/readout.md', [
      'baseline',
      'variant',
      'delta',
      'failure modes',
      'next hypothesis',
    ]) >= 1
  const implementationReady =
    projectFileMinLength(
      projectName,
      'implementation/contracts/trace-schema.ts',
      240,
    ) &&
    projectFileMinLength(
      projectName,
      'implementation/contracts/ledger-schema.ts',
      240,
    ) &&
    projectFileMinLength(
      projectName,
      'implementation/replay/replay-harness.ts',
      240,
    ) &&
    projectFileMinLength(
      projectName,
      'implementation/baselines/registry.ts',
      180,
    ) &&
    projectFileMinLength(
      projectName,
      'implementation/evaluation/metrics.ts',
      180,
    )

  if (!literatureReady) {
    return {
      current: 'literature_grounding',
      reason:
        'The project still needs benchmark and prior-work grounding before sentinel should widen the implementation surface.',
      evidence: [
        `literature_review_ready=${literatureReady}`,
        `benchmark_rows=${projectFileTableRows(projectName, 'workspace/literature/benchmark-map.md')}`,
      ],
    }
  }

  if (!designReady || nonDryAccepted.length === 0) {
    return {
      current: 'experiment_design',
      reason:
        'Literature grounding exists, but the design and experiment contract still need to stabilize before code scaffolding should dominate.',
      evidence: [
        `accepted_non_dry_runs=${nonDryAccepted.length}`,
        `design_ready=${designReady}`,
      ],
    }
  }

  if (!implementationEnabled || !implementationReady) {
    return {
      current: 'experiment_bootstrap',
      reason:
        'The research design is saturated enough to begin implementing trace, ledger, replay, baseline, and metric scaffolds.',
      evidence: [
        `accepted_non_dry_runs=${nonDryAccepted.length}`,
        `best_score=${state.bestScore ?? 0}`,
        `implementation_enabled=${implementationEnabled}`,
      ],
    }
  }

  return {
      current: 'executable_experiments',
      reason:
        'Implementation scaffolds are in place, so sentinel can shift the optimization target toward runnable experiments and result generation.',
      evidence: [
        `accepted_non_dry_runs=${nonDryAccepted.length}`,
        `implementation_ready=${implementationReady}`,
        `implementation_enabled=${implementationEnabled}`,
      ],
    }
  }

function phaseAllowedEditRoots(
  config: ProjectConfig,
  phase: SentinelPhase,
): string[] {
  if (phase === 'experiment_bootstrap' || phase === 'executable_experiments') {
    return [...new Set([...config.allowed_edit_roots, 'implementation'])].sort()
  }
  return [...config.allowed_edit_roots].sort()
}

function phaseSpecificProjectConfig(
  config: ProjectConfig,
  phase: SentinelPhase,
): ProjectConfig {
  return {
    ...config,
    allowed_edit_roots: phaseAllowedEditRoots(config, phase),
    sentinel: {
      ...config.sentinel,
      event_trigger_on_run_complete:
        config.sentinel?.event_trigger_on_run_complete ?? true,
    },
  }
}

function ensureExperimentBootstrapFiles(projectName: string): void {
  const root = projectDir(projectName)
  const files: Array<[string, string]> = [
    [
      'implementation/README.md',
      `# Experiment Bootstrap

This lane holds executable experiment scaffolds that the main autoresearch loop can implement and refine.

Expected components:

- \`contracts/trace-schema.ts\`
- \`contracts/ledger-schema.ts\`
- \`replay/replay-harness.ts\`
- \`baselines/registry.ts\`
- \`evaluation/metrics.ts\`
`,
    ],
    [
      'implementation/contracts/trace-schema.ts',
      `export type TraceEvent = {
  traceId: string
  tenantId: string
  taskType: string
  eventType: 'request' | 'memory_read' | 'memory_write' | 'tool' | 'sql' | 'answer' | 'feedback'
  timestamp: string
  payload: Record<string, unknown>
}

export type TraceRecord = {
  traceId: string
  startedAt: string
  finishedAt?: string
  events: TraceEvent[]
}
`,
    ],
    [
      'implementation/contracts/ledger-schema.ts',
      `export type MemoryLedgerRow = {
  memoryId: string
  traceId: string
  retrieved: boolean
  injected: boolean
  referenced: boolean
  helped: boolean
  harmed: boolean
  taskSuccess?: boolean
  sqlSuccess?: boolean
  deltaToken?: number
  deltaLatencyMs?: number
}
`,
    ],
    [
      'implementation/replay/replay-harness.ts',
      `import type { TraceRecord } from '../contracts/trace-schema'

export type ReplayBatch = {
  traces: TraceRecord[]
}

export function replayBatch(batch: ReplayBatch): number {
  return batch.traces.length
}
`,
    ],
    [
      'implementation/baselines/registry.ts',
      `export type BaselineVariant =
  | 'no_memory'
  | 'passive_vector_memory'
  | 'rule_based_typed_memory'
  | 'bandit_memory_manager'
  | 'policy_split_memory'

export const baselineVariants: BaselineVariant[] = [
  'no_memory',
  'passive_vector_memory',
  'rule_based_typed_memory',
  'bandit_memory_manager',
  'policy_split_memory',
]
`,
    ],
    [
      'implementation/evaluation/metrics.ts',
      `export type ExperimentMetric =
  | 'write_precision'
  | 'pollution_rate'
  | 'stale_rate'
  | 'task_success_lift'
  | 'sql_success_lift'
  | 'token_reduction'
  | 'latency_reduction'

export function supportedMetrics(): ExperimentMetric[] {
  return [
    'write_precision',
    'pollution_rate',
    'stale_rate',
    'task_success_lift',
    'sql_success_lift',
    'token_reduction',
    'latency_reduction',
  ]
}
`,
    ],
  ]

  for (const [relativePath, content] of files) {
    const fullPath = join(root, relativePath)
    if (!existsSync(fullPath)) {
      writeTextFile(fullPath, content)
    }
  }
}

function reconcileSentinelPhase(
  projectName: string,
  config: ProjectConfig,
  state: ProjectState,
): { config: ProjectConfig; phase: PhaseState; changed: boolean } {
  const runs = listRunRecords(projectName)
  const inferred = inferSentinelPhase(projectName, state, runs, config)
  const previous = loadPhaseState(projectName)
  const next: PhaseState = {
    ...inferred,
    updatedAt:
      inferred.current === previous.current &&
      inferred.reason === previous.reason &&
      JSON.stringify(inferred.evidence) === JSON.stringify(previous.evidence)
        ? previous.updatedAt
        : new Date().toISOString(),
  }

  let nextConfig = phaseSpecificProjectConfig(config, next.current)
  let changed = false

  if (
    JSON.stringify(nextConfig.allowed_edit_roots) !==
      JSON.stringify(config.allowed_edit_roots) ||
    nextConfig.sentinel?.event_trigger_on_run_complete !==
      config.sentinel?.event_trigger_on_run_complete
  ) {
    nextConfig = rewriteProjectConfig(projectName, () => nextConfig)
    changed = true
  }

  if (
    next.current === 'experiment_bootstrap' ||
    next.current === 'executable_experiments'
  ) {
    ensureExperimentBootstrapFiles(projectName)
  }

  const derivedGoalPath = nextConfig.derived_goal_file
    ? join(projectDir(projectName), nextConfig.derived_goal_file)
    : null
  const metricContractPath = nextConfig.metric_contract_file
    ? join(projectDir(projectName), nextConfig.metric_contract_file)
    : null

  const desiredObjective = `${buildDerivedObjective(
    projectName,
    nextConfig,
    next.current,
  )}\n`
  if (
    derivedGoalPath &&
    (!existsSync(derivedGoalPath) ||
      readTextFile(derivedGoalPath) !== desiredObjective)
  ) {
    writeTextFile(derivedGoalPath, desiredObjective)
    changed = true
  }

  if (metricContractPath) {
    const desiredMetricContract = buildMetricContract(next.current)
    const currentMetricContract = existsSync(metricContractPath)
      ? JSON.stringify(readJsonFile(metricContractPath))
      : ''
    if (JSON.stringify(desiredMetricContract) !== currentMetricContract) {
      writeJsonFile(metricContractPath, desiredMetricContract)
      changed = true
    }
  }

  if (
    previous.current !== next.current ||
    previous.reason !== next.reason ||
    JSON.stringify(previous.evidence) !== JSON.stringify(next.evidence)
  ) {
    savePhaseState(projectName, next)
    changed = true
  }

  return { config: nextConfig, phase: next, changed }
}

function bootstrapSentinelOwnedFiles(
  projectName: string,
  config: ProjectConfig,
  options?: { forceDerivedTargets?: boolean },
): void {
  const projectRoot = projectDir(projectName)
  const forceDerivedTargets = options?.forceDerivedTargets ?? false
  const iterationNotesPath = join(projectRoot, config.workspace_dir, 'ITERATION_NOTES.md')
  if (!existsSync(iterationNotesPath)) {
    writeTextFile(
      iterationNotesPath,
      '# Iteration Notes\n\n- hypothesis:\n- changed files:\n- expected effect:\n',
    )
  }

  if (config.derived_goal_file) {
    const derivedGoalPath = join(projectRoot, config.derived_goal_file)
    if (forceDerivedTargets || !existsSync(derivedGoalPath)) {
      writeTextFile(
        derivedGoalPath,
        `${buildDerivedObjective(projectName, config, 'literature_grounding')}\n`,
      )
    }
  }

  if (config.metric_contract_file) {
    const metricContractPath = join(projectRoot, config.metric_contract_file)
    if (forceDerivedTargets || !existsSync(metricContractPath)) {
      writeJsonFile(metricContractPath, buildMetricContract('literature_grounding'))
    }
  }
}

function copyPathsIntoRoot(
  sourceRoot: string,
  targetRoot: string,
  relativePaths: string[],
): void {
  for (const relativePath of relativePaths) {
    const sourcePath = join(sourceRoot, relativePath)
    if (!existsSync(sourcePath)) continue

    const targetPath = join(targetRoot, relativePath)
    ensureDir(dirname(targetPath))
    cpSync(sourcePath, targetPath, { recursive: true })
  }
}

function commandList(): void {
  const projects = listProjectNames()
  if (projects.length === 0) {
    console.log('No autoresearch projects found.')
    return
  }

  for (const name of projects) {
    const config = loadProjectConfig(name)
    console.log(`${name}: ${config.description}`)
  }
}

async function commandInit(parsedArgs: ParsedArgs): Promise<void> {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('init requires a project name')
  }
  const templateName = getStringFlag(parsedArgs, 'template') ?? 'default-project'
  const goalSeed = getGoalSeed(parsedArgs)
  const description = getStringFlag(parsedArgs, 'description')
  copyTemplateProject(templateName, projectName, {
    '__PROJECT_DESCRIPTION__':
      description?.trim() ||
      `Autonomous research lane for ${projectName.replaceAll('-', ' ')}`,
    '__RESEARCH_GOAL__':
      goalSeed ?? 'Define a research objective that benefits from autonomous iteration.',
  })
  const initialConfig = loadProjectConfig(projectName)

  if (goalSeed) {
    writeTextFile(
      join(projectDir(projectName), initialConfig.goal_file),
      formatGoalDocument(projectName, goalSeed),
    )
  }

  const config = rewriteProjectConfig(projectName, current => ({
    ...current,
    description: description?.trim() || current.description,
  }))
  bootstrapSentinelOwnedFiles(projectName, config, { forceDerivedTargets: true })
  maybeRefreshProtectedManifest(projectName, config, parseArgs(['--fix']))

  const initState = loadProjectState(projectName)
  const evaluation = runEvaluation(projectDir(projectName), config).parsed
  const report = buildHealthReport(projectName, config, initState, evaluation)
  writeSentinelArtifacts(projectName, config, initState, report)

  console.log(
    `Initialized project "${projectName}" from template "${templateName}" at ${projectDir(projectName)}`,
  )
  console.log(`Sentinel bootstrap complete at ${projectRuntimeDir(projectName)}`)
}

function runEvaluation(
  projectRoot: string,
  config: ProjectConfig,
): {
  exitCode: number
  stdout: string
  stderr: string
  parsed: EvaluationResult
} {
  const proc = Bun.spawnSync({
    cmd: config.evaluation_command,
    cwd: projectRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = new TextDecoder().decode(proc.stdout).trim()
  const stderr = new TextDecoder().decode(proc.stderr).trim()

  if (proc.exitCode !== 0) {
    throw new Error(
      `Evaluator failed with exit code ${proc.exitCode}\n${stderr || stdout}`,
    )
  }

  let parsed: EvaluationResult
  try {
    parsed = JSON.parse(stdout) as EvaluationResult
  } catch (error) {
    throw new Error(
      `Evaluator did not emit valid JSON\n${String(error)}\nOutput:\n${stdout}`,
    )
  }

  if (typeof parsed.score !== 'number' || !Number.isFinite(parsed.score)) {
    throw new Error('Evaluator JSON must include a finite numeric "score"')
  }
  if (typeof parsed.summary !== 'string' || parsed.summary.length === 0) {
    throw new Error('Evaluator JSON must include a non-empty "summary"')
  }

  return {
    exitCode: proc.exitCode ?? 1,
    stdout,
    stderr,
    parsed,
  }
}

function buildCodexPrompt(
  config: ProjectConfig,
  evaluation: EvaluationResult | null,
  runDir: string,
): string {
  const goalText = readFileSync(
    join(projectDir(config.name), config.goal_file),
    'utf8',
  ).trim()
  const programText = readFileSync(
    join(projectDir(config.name), config.program_file),
    'utf8',
  ).trim()
  const derivedGoalPath = config.derived_goal_file
    ? join(projectDir(config.name), config.derived_goal_file)
    : null
  const derivedGoalText =
    derivedGoalPath && existsSync(derivedGoalPath)
      ? readFileSync(derivedGoalPath, 'utf8').trim()
      : 'No sentinel-derived objective found yet.'
  const metricContractPath = config.metric_contract_file
    ? join(projectDir(config.name), config.metric_contract_file)
    : null
  const metricContractText =
    metricContractPath && existsSync(metricContractPath)
      ? readFileSync(metricContractPath, 'utf8').trim()
      : 'No sentinel metric contract found yet.'
  const evaluationBlock = evaluation
    ? `Current accepted score: ${evaluation.score}
Evaluator summary: ${evaluation.summary}
Metrics: ${JSON.stringify(evaluation.metrics ?? {}, null, 2)}`
    : 'No accepted run yet. Establish a strong baseline.'

  return `You are operating inside an autonomous research loop inspired by karpathy/autoresearch.

Project: ${config.name}
Run directory: ${runDir}

Goal:
${goalText}

Sentinel-derived objective:
${derivedGoalText}

Sentinel metric contract:
${metricContractText}

Operating program:
${programText}

State:
${evaluationBlock}

Controller rules:
- Only edit files under: ${config.allowed_edit_roots.join(', ')}
- Do not edit project.json, goal.md, program.md, or anything under evaluation/
- Optimize against the sentinel-derived objective and metric contract, not by rewriting the original user goal
- The controller will run the authoritative evaluator after you finish
- Prefer small, reviewable changes that increase evaluator score
- Leave a short note in ${config.workspace_dir}/ITERATION_NOTES.md summarizing the hypothesis, changed files, and expected effect
- If you make no useful change, say so explicitly in ITERATION_NOTES.md instead of churning

Success criterion:
- Improve the evaluator score beyond the current best by at least ${config.minimum_improvement ?? 0}
- If there is no current best, establish a clean baseline candidate
`
}

function runCodexIteration(
  candidateRoot: string,
  prompt: string,
  config: ProjectConfig,
  outputPath: string,
  parsedArgs: ParsedArgs,
): Promise<{ exitCode: number | null; timedOut: boolean; stdout: string; stderr: string }> {
  const cmd = ['codex', 'exec', '--full-auto', '--cd', candidateRoot]

  const modelConfig = parseCodexModelSetting(
    getStringFlag(parsedArgs, 'model') ?? config.codex?.model,
  )
  if (modelConfig.model) {
    cmd.push('--model', modelConfig.model)
  }
  if (modelConfig.reasoningEffort) {
    cmd.push(
      '--config',
      `model_reasoning_effort="${modelConfig.reasoningEffort}"`,
    )
  }

  const sandbox = getStringFlag(parsedArgs, 'sandbox') ?? config.codex?.sandbox
  if (sandbox) {
    cmd.push('--sandbox', sandbox)
  }

  cmd.push('--output-last-message', outputPath, prompt)

  const proc = Bun.spawn({
    cmd,
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const timeoutMinutes = getNumberFlag(
    parsedArgs,
    'codex-timeout-minutes',
    config.codex?.timeout_minutes ?? 30,
  )
  const timeoutMs = timeoutMinutes * 60_000

  let timedOut = false
  return Promise.race<number | null>([
    proc.exited,
    sleepMs(timeoutMs).then(() => {
      timedOut = true
      proc.kill()
      return null
    }),
  ]).then(async exitCode => {
    const stdout = await new Response(proc.stdout).text()
    const stderr = await new Response(proc.stderr).text()
    return { exitCode, timedOut, stdout, stderr }
  })
}

function parseCodexModelSetting(modelRaw?: string): {
  model?: string
  reasoningEffort?: string
} {
  if (!modelRaw) return {}

  const match = modelRaw.match(
    /^(gpt-5\.4)-(none|minimal|low|medium|high|xhigh)$/i,
  )
  if (!match) {
    return { model: modelRaw }
  }

  return {
    model: match[1],
    reasoningEffort: match[2].toLowerCase(),
  }
}

function getProtectedPaths(config: ProjectConfig): string[] {
  const defaults = ['project.json', config.goal_file, config.program_file]
  return [...new Set([...(config.protected_paths ?? []), ...defaults])].sort()
}

function collectProtectedDigests(
  projectName: string,
  config: ProjectConfig,
): ProtectedDigest[] {
  const root = projectDir(projectName)
  const digests = new Map<string, string>()

  for (const protectedPath of getProtectedPaths(config)) {
    const fullPath = join(root, protectedPath)
    if (!existsSync(fullPath)) continue
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      for (const file of listFilesRecursive(fullPath)) {
        const absoluteFile = join(fullPath, file)
        digests.set(relativePosix(root, absoluteFile), fileDigest(absoluteFile))
      }
      continue
    }

    digests.set(relativePosix(root, fullPath), fileDigest(fullPath))
  }

  return [...digests.entries()]
    .map(([path, digest]) => ({ path, digest }))
    .sort((left, right) => left.path.localeCompare(right.path))
}

function readProtectedManifest(projectName: string): ProtectedDigest[] | null {
  const manifestPath = projectManifestPath(projectName)
  if (!existsSync(manifestPath)) return null
  return readJsonFile<ProtectedDigest[]>(manifestPath)
}

function computeProtectedDrift(
  current: ProtectedDigest[],
  previous: ProtectedDigest[] | null,
): string[] {
  if (previous === null) return []
  const prevMap = new Map(previous.map(entry => [entry.path, entry.digest]))
  const currentMap = new Map(current.map(entry => [entry.path, entry.digest]))
  const drift = new Set<string>()

  for (const path of new Set([...prevMap.keys(), ...currentMap.keys()])) {
    if (prevMap.get(path) !== currentMap.get(path)) {
      drift.add(path)
    }
  }

  return [...drift].sort()
}

function getGitStatusLines(projectName: string): string[] {
  const projectPath = relativePosix(repoRoot, projectDir(projectName))
  const proc = Bun.spawnSync({
    cmd: [
      'git',
      'status',
      '--short',
      '--',
      'package.json',
      'scripts/autoresearch.ts',
      'research/autoresearch/README.md',
      'research/autoresearch/templates',
      projectPath,
    ],
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (proc.exitCode !== 0) {
    return ['git status unavailable']
  }

  const output = new TextDecoder().decode(proc.stdout).trim()
  return output.length > 0 ? output.split('\n') : ['clean']
}

function listRunRecords(projectName: string): RunRecord[] {
  const runsDir = projectRunsDir(projectName)
  if (!existsSync(runsDir)) return []

  return readdirSync(runsDir)
    .map(runId => join(runsDir, runId, 'result.json'))
    .filter(existsSync)
    .map(path => readJsonFile<RunRecord>(path))
    .sort((left, right) => right.runId.localeCompare(left.runId))
}

function topChangedFiles(runs: RunRecord[]): Array<{ path: string; count: number }> {
  const counts = new Map<string, number>()
  for (const run of runs) {
    for (const path of run.changedFiles) {
      counts.set(path, (counts.get(path) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))
}

function countLeadingRuns(
  runs: RunRecord[],
  predicate: (run: RunRecord) => boolean,
): number {
  let count = 0
  for (const run of runs) {
    if (!predicate(run)) break
    count += 1
  }
  return count
}

function detectHealthIssues(
  projectName: string,
  config: ProjectConfig,
  state: ProjectState,
  evaluation: EvaluationResult,
  runs: RunRecord[],
  drift: string[],
): HealthIssue[] {
  const issues: HealthIssue[] = []
  const workspaceRoot = join(projectDir(projectName), config.workspace_dir)
  const iterationNotesPath = join(workspaceRoot, 'ITERATION_NOTES.md')
  const derivedGoalPath = config.derived_goal_file
    ? join(projectDir(projectName), config.derived_goal_file)
    : null
  const metricContractPath = config.metric_contract_file
    ? join(projectDir(projectName), config.metric_contract_file)
    : null
  const stagnationThreshold = config.sentinel?.stagnation_threshold ?? 3
  const recentRuns = runs.slice(0, stagnationThreshold)
  const hasRecentAcceptance = recentRuns.some(run => run.status === 'accepted')
  const noChangeStreak = countLeadingRuns(
    runs,
    run => run.changedFiles.length === 0 && run.invalidChanges.length === 0,
  )
  const dryRunNoChangeStreak = countLeadingRuns(
    runs,
    run =>
      run.dryRun &&
      run.changedFiles.length === 0 &&
      run.invalidChanges.length === 0,
  )

  if (!existsSync(iterationNotesPath)) {
    issues.push({
      id: 'missing-iteration-notes',
      severity: 'warning',
      summary: 'Iteration notes are missing from the editable workspace.',
      suggestedAction:
        'Create workspace/ITERATION_NOTES.md so every loop documents its hypothesis and expected gain.',
    })
  }

  if (
    (derivedGoalPath && !existsSync(derivedGoalPath)) ||
    (metricContractPath && !existsSync(metricContractPath))
  ) {
    issues.push({
      id: 'missing-derived-targets',
      severity: 'critical',
      summary:
        'Sentinel-owned derived objective or metric contract is missing.',
      suggestedAction:
        'Run sentinel with --fix so the optimization target is defined before the main loop continues.',
    })
  }

  if (drift.length > 0) {
    issues.push({
      id: 'protected-file-drift',
      severity: 'critical',
      summary: `Protected files changed since the last sentinel snapshot: ${drift.join(', ')}`,
      suggestedAction:
        'Review whether goal/program/evaluation changes were intentional, then refresh the protected manifest if approved.',
    })
  }

  if (runs.length >= stagnationThreshold && !hasRecentAcceptance) {
    issues.push({
      id: 'stagnation',
      severity: 'warning',
      summary: `No accepted run in the latest ${stagnationThreshold} iterations.`,
      suggestedAction:
        'Inspect the prompt, evaluator, and workspace plan. The loop may be stalled or optimizing the wrong surface.',
    })
  }

  if (dryRunNoChangeStreak >= stagnationThreshold) {
    issues.push({
      id: 'dry-run-noop-loop',
      severity: 'warning',
      summary: `The latest ${dryRunNoChangeStreak} iterations were dry-run no-ops with zero file changes.`,
      suggestedAction:
        'Switch the next iteration to a real Codex run or lower the baseline gate. Dry runs alone cannot produce a new accepted run.',
    })
  } else if (noChangeStreak >= stagnationThreshold) {
    issues.push({
      id: 'no-change-loop',
      severity: 'warning',
      summary: `The latest ${noChangeStreak} iterations produced zero file changes.`,
      suggestedAction:
        'Inspect the prompt and workspace plan. The loop may be stuck before proposing edits or already at an evaluator ceiling.',
    })
  }

  const failedStreak = countLeadingRuns(runs, run => run.status === 'failed')
  if (failedStreak > 0) {
    issues.push({
      id: 'failing-loop',
      severity: failedStreak >= 2 ? 'critical' : 'warning',
      summary: `The latest ${failedStreak} iteration${failedStreak === 1 ? '' : 's'} failed before acceptance or rejection could be decided.`,
      suggestedAction:
        'Inspect the latest run logs and controller prompt. The loop is failing before it can produce a valid candidate.',
    })
  }

  if (state.lastRun && state.lastRun.invalidChanges.length > 0) {
    issues.push({
      id: 'invalid-change-surface',
      severity: 'critical',
      summary: `The last run attempted edits outside allowed roots: ${state.lastRun.invalidChanges.join(', ')}`,
      suggestedAction:
        'Tighten the prompt or allowed roots so research iterations cannot wander outside workspace scope.',
    })
  }

  if (state.bestScore === null || evaluation.score <= 0) {
    issues.push({
      id: 'no-baseline',
      severity: 'info',
      summary: 'The project has not yet established a meaningful accepted baseline.',
      suggestedAction:
        'Run a dry-run or first accepted iteration and keep the resulting workspace/dashboard under version control.',
    })
  }

  return issues
}

function buildMaintenanceQueue(
  projectName: string,
  issues: HealthIssue[],
): MaintenanceAction[] {
  const queue: MaintenanceAction[] = []

  for (const issue of issues) {
    switch (issue.id) {
      case 'missing-iteration-notes':
        queue.push({
          title: 'Backfill iteration notes',
          command: `bun run autoresearch sentinel ${projectName} --fix`,
        })
        break
      case 'missing-derived-targets':
        queue.push({
          title: 'Bootstrap sentinel-owned target contract',
          command: `bun run autoresearch sentinel ${projectName} --fix`,
        })
        break
      case 'protected-file-drift':
        queue.push({
          title: 'Review protected file drift',
          command: `git diff -- ${projectDir(projectName)}`,
        })
        break
      case 'stagnation':
        queue.push({
          title: 'Inspect the latest health report and dashboard',
          command: `bun run autoresearch dashboard ${projectName}`,
        })
        break
      case 'dry-run-noop-loop':
        queue.push({
          title: 'Run a real iteration instead of another dry run',
          command: `bun run autoresearch run ${projectName} --iterations 1`,
        })
        break
      case 'no-change-loop':
        queue.push({
          title: 'Inspect prompt and evaluator saturation',
          command: `bun run autoresearch judge ${projectName}`,
        })
        break
      case 'invalid-change-surface':
        queue.push({
          title: 'Inspect change-surface drift',
          command: `bun run autoresearch dashboard ${projectName}`,
        })
        break
      case 'failing-loop':
        queue.push({
          title: 'Inspect the latest failed run logs',
          command: `bun run autoresearch status ${projectName}`,
        })
        break
      case 'no-baseline':
        queue.push({
          title: 'Establish the first baseline run',
          command: `bun run autoresearch run ${projectName} --dry-run --iterations 1`,
        })
        break
    }
  }

  if (queue.length === 0) {
    queue.push({
      title: 'Refresh sentinel artifacts',
      command: `bun run autoresearch sentinel ${projectName}`,
    })
  }

  return queue
}

function writeHealthMarkdown(projectName: string, report: HealthReport): void {
  const issueLines =
    report.issues.length > 0
      ? report.issues
          .map(
            issue =>
              `- [${issue.severity}] ${issue.summary}\n  Action: ${issue.suggestedAction}`,
          )
          .join('\n')
      : '- none'

  const recentRunLines =
    report.recentRuns.length > 0
      ? report.recentRuns
          .map(
            run =>
              `- ${run.runId}: ${run.status}, score=${run.score}, delta=${run.scoreDelta}, changed=${run.changedFiles.length}`,
          )
          .join('\n')
      : '- none'

  const content = `# Sentinel Health Report

Project: ${report.project}
Generated: ${report.generatedAt}
Current evaluation score: ${report.evaluation.score}
Current evaluation summary: ${report.evaluation.summary}
Current sentinel phase: ${report.phase.current}

## Summary

- total runs: ${report.summary.totalRuns}
- accepted runs: ${report.summary.acceptedRuns}
- rejected runs: ${report.summary.rejectedRuns}
- failed runs: ${report.summary.failedRuns}
- best score: ${report.summary.bestScore ?? 'n/a'}
- last run status: ${report.summary.lastRunStatus}
- last promoted run: ${report.summary.lastPromotedRunId ?? 'n/a'}
- last promoted at: ${report.summary.lastPromotedAt ?? 'n/a'}
- consecutive rejected runs: ${report.summary.consecutiveRejectedRuns}
- consecutive no-change runs: ${report.summary.consecutiveNoChangeRuns}

## Protected Files

- tracked: ${report.protectedFiles.tracked.length}
- drift: ${
    report.protectedFiles.drift.length > 0
      ? report.protectedFiles.drift.join(', ')
      : 'none'
  }

## Versioning

${report.versioning.gitStatusLines.map(line => `- ${line}`).join('\n')}

## Issues

${issueLines}

## Recent Runs

${recentRunLines}
`

  writeFileSync(projectHealthMarkdownPath(projectName), content, 'utf8')
}

function generateDashboardHtml(
  projectName: string,
  config: ProjectConfig,
  state: ProjectState,
  evaluation: EvaluationResult,
  report: HealthReport | null,
): string {
  const payload = JSON.stringify({
    project: projectName,
    description: config.description,
    state,
    evaluation,
    report,
  }).replaceAll('</script>', '<\\/script>')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Autoresearch Dashboard - ${projectName}</title>
  <style>
    :root {
      --bg: #efe8d8;
      --panel: #fffaf0;
      --panel-strong: #f6efe1;
      --ink: #181512;
      --muted: #6b6257;
      --accent: #0e7490;
      --accent-2: #14532d;
      --warn: #b45309;
      --bad: #b91c1c;
      --good: #166534;
      --border: #d7ccb9;
      --line: #e7dcc9;
      --shadow: rgba(56, 43, 24, 0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Iowan Old Style", "Palatino Linotype", Georgia, serif;
      background:
        radial-gradient(circle at top left, rgba(14,116,144,0.10), transparent 28%),
        radial-gradient(circle at top right, rgba(20,83,45,0.08), transparent 24%),
        linear-gradient(180deg, #f7f1e4 0%, var(--bg) 100%);
      color: var(--ink);
    }
    main {
      max-width: 1380px;
      margin: 0 auto;
      padding: 28px 20px 56px;
    }
    .hero {
      display: grid;
      gap: 16px;
      margin-bottom: 18px;
    }
    h1, h2, h3, h4 { margin: 0; }
    h1 {
      font-size: clamp(2.4rem, 5vw, 4.4rem);
      line-height: 0.92;
      letter-spacing: -0.03em;
    }
    h2 {
      font-size: 1.15rem;
      letter-spacing: 0.01em;
    }
    p { margin: 0; color: var(--muted); }
    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.76rem;
      color: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 16px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 22px;
      padding: 18px 18px 16px;
      box-shadow: 0 10px 28px var(--shadow);
    }
    .card.hero-card {
      padding: 22px;
      background:
        linear-gradient(135deg, rgba(14,116,144,0.07), transparent 45%),
        linear-gradient(180deg, rgba(255,255,255,0.52), transparent 100%),
        var(--panel);
    }
    .span-3 { grid-column: span 3; }
    .span-4 { grid-column: span 4; }
    .span-6 { grid-column: span 6; }
    .span-8 { grid-column: span 8; }
    .span-9 { grid-column: span 9; }
    .span-12 { grid-column: span 12; }
    .metric {
      display: grid;
      gap: 6px;
    }
    .metric-value {
      font-size: 2.1rem;
      font-weight: 700;
      color: var(--accent);
      line-height: 1;
    }
    .chip {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      font-size: 0.85rem;
      margin-right: 8px;
      margin-bottom: 8px;
      color: var(--muted);
      background: rgba(255,255,255,0.6);
    }
    .phase-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(14,116,144,0.18);
      background: rgba(14,116,144,0.08);
      color: var(--accent);
      font-size: 0.92rem;
      font-weight: 700;
    }
    .phase-dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--accent);
      box-shadow: 0 0 0 6px rgba(14,116,144,0.12);
    }
    .issue {
      border-left: 4px solid var(--line);
      padding-left: 12px;
      margin-bottom: 12px;
    }
    .issue.warning { border-left-color: var(--warn); }
    .issue.critical { border-left-color: var(--bad); }
    .issue.info { border-left-color: var(--accent); }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    .table th, .table td {
      text-align: left;
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    .table.compact th, .table.compact td {
      padding: 7px 6px;
      font-size: 0.88rem;
    }
    .mono { font-family: "SFMono-Regular", Menlo, monospace; font-size: 0.9rem; }
    .hero-layout {
      display: grid;
      grid-template-columns: 2.2fr 1fr;
      gap: 18px;
      align-items: start;
    }
    .hero-copy {
      display: grid;
      gap: 12px;
    }
    .hero-stats {
      display: grid;
      gap: 12px;
    }
    .mini-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .mini-stat {
      background: rgba(255,255,255,0.58);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 12px;
    }
    .mini-stat-label {
      color: var(--muted);
      font-size: 0.82rem;
    }
    .mini-stat-value {
      margin-top: 6px;
      font-size: 1.36rem;
      line-height: 1;
      font-weight: 700;
    }
    .section-lead {
      margin-top: 10px;
      font-size: 0.95rem;
    }
    .readiness {
      display: grid;
      gap: 14px;
    }
    .readiness-header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
    }
    .readiness-score {
      font-size: 2.5rem;
      line-height: 0.92;
      font-weight: 700;
      color: var(--accent-2);
    }
    .progress {
      width: 100%;
      height: 12px;
      border-radius: 999px;
      background: #e8dece;
      overflow: hidden;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
      border-radius: 999px;
    }
    .metric-stack {
      display: grid;
      gap: 10px;
    }
    .metric-row {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) 72px;
      gap: 12px;
      align-items: center;
    }
    .metric-row strong {
      display: block;
      font-size: 0.92rem;
      margin-bottom: 4px;
    }
    .metric-track {
      height: 10px;
      background: #eadfcd;
      border-radius: 999px;
      overflow: hidden;
    }
    .metric-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
    }
    .metric-score {
      text-align: right;
      font-weight: 700;
      color: var(--muted);
    }
    .blocker-list {
      display: grid;
      gap: 8px;
    }
    .blocker {
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(180,83,9,0.22);
      background: rgba(180,83,9,0.08);
      color: #8a3a08;
      font-size: 0.92rem;
    }
    .friction-terminal {
      display: grid;
      gap: 10px;
      padding: 14px;
      border-radius: 18px;
      background: #1f2937;
      color: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.22);
    }
    .friction-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      font-family: "SFMono-Regular", Menlo, monospace;
      font-size: 0.82rem;
      color: #cbd5e1;
    }
    .friction-line {
      display: grid;
      gap: 4px;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(255,255,255,0.06);
      font-family: "SFMono-Regular", Menlo, monospace;
      font-size: 0.85rem;
    }
    .friction-pill {
      display: inline-block;
      width: fit-content;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(251, 191, 36, 0.16);
      color: #fde68a;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .success-note {
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(22,101,52,0.18);
      background: rgba(22,101,52,0.08);
      color: var(--good);
      font-size: 0.92rem;
    }
    .phase-reason {
      padding: 12px 14px;
      border-radius: 16px;
      background: var(--panel-strong);
      border: 1px solid var(--line);
    }
    .action-card {
      display: grid;
      gap: 12px;
    }
    .action-command {
      padding: 12px 14px;
      border-radius: 14px;
      background: #1f2937;
      color: #f9fafb;
      font-family: "SFMono-Regular", Menlo, monospace;
      font-size: 0.88rem;
      overflow: auto;
    }
    .timeline {
      display: grid;
      gap: 10px;
    }
    .trend-card {
      display: grid;
      gap: 12px;
    }
    .trend-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: baseline;
    }
    .trend-value {
      font-size: 2rem;
      line-height: 1;
      font-weight: 700;
      color: var(--accent);
    }
    .sparkline-shell {
      padding: 14px;
      border-radius: 18px;
      background: rgba(255,255,255,0.56);
      border: 1px solid var(--line);
    }
    .sparkline {
      width: 100%;
      height: 84px;
      display: block;
    }
    .sparkline-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.82rem;
    }
    .run-balance {
      display: grid;
      gap: 10px;
    }
    .stack-bar {
      display: grid;
      grid-template-columns: var(--accepted,1fr) var(--rejected,1fr) var(--failed,1fr);
      gap: 6px;
    }
    .stack-segment {
      height: 12px;
      border-radius: 999px;
      min-width: 12px;
    }
    .stack-segment.accepted { background: var(--good); }
    .stack-segment.rejected { background: var(--warn); }
    .stack-segment.failed { background: var(--bad); }
    .timeline-item {
      display: grid;
      grid-template-columns: 12px 1fr;
      gap: 12px;
      align-items: start;
    }
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 999px;
      margin-top: 5px;
      background: var(--accent);
    }
    .timeline-dot.rejected { background: var(--warn); }
    .timeline-dot.failed { background: var(--bad); }
    .timeline-dot.accepted { background: var(--good); }
    .timeline-body {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.55);
      border-radius: 16px;
      padding: 12px 14px;
    }
    .timeline-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.86rem;
    }
    .subdued {
      color: var(--muted);
      font-size: 0.88rem;
    }
    @media (max-width: 900px) {
      .span-3, .span-4, .span-6, .span-8, .span-12 { grid-column: span 12; }
      .span-9 { grid-column: span 12; }
      .hero-layout { grid-template-columns: 1fr; }
      .mini-grid { grid-template-columns: 1fr 1fr; }
      .metric-row { grid-template-columns: 1fr; }
      .metric-score { text-align: left; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p>Sentinel dashboard connected to autoresearch runtime data.</p>
      <h1>${projectName}</h1>
      <p>${config.description}</p>
    </section>
    <section class="grid" id="app"></section>
  </main>
  <script id="payload" type="application/json">${payload}</script>
  <script>
    const data = JSON.parse(document.getElementById('payload').textContent);
    const report = data.report;
    const app = document.getElementById('app');
    const fmt = (value) => value === null || value === undefined ? 'n/a' : String(value);
    const titleize = (value) => String(value || '')
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    const issues = report?.issues ?? [];
    const queue = report?.maintenanceQueue ?? [];
    const runs = report?.recentRuns ?? [];
    const topFiles = report?.topChangedFiles ?? [];
    const protectedDrift = report?.protectedFiles?.drift ?? [];
    const gitLines = report?.versioning?.gitStatusLines ?? [];
    const metrics = Object.entries(data.evaluation.metrics ?? {});
    const phaseCurrent = report?.phase?.current ?? 'n/a';
    const phaseReason = report?.phase?.reason ?? 'No phase reason recorded.';
    const completedMetrics = metrics.filter(([, value]) => Number(value) >= 1).length;
    const readinessPercent = metrics.length ? Math.round((completedMetrics / metrics.length) * 100) : 0;
    const blockerMetrics = metrics
      .filter(([, value]) => Number(value) < 1)
      .sort((a, b) => Number(a[1]) - Number(b[1]));
    const nextAction = queue[0] ?? null;
    const lastRun = data.state.lastRun;
    const acceptedCount = report?.summary?.acceptedRuns ?? data.state.acceptedRuns?.length ?? 0;
    const rejectedCount = report?.summary?.rejectedRuns ?? data.state.rejectedRuns?.length ?? 0;
    const failedCount = report?.summary?.failedRuns ?? data.state.failedRuns?.length ?? 0;
    const runMix = acceptedCount + rejectedCount + failedCount;
    const acceptRate = runMix > 0 ? Math.round((acceptedCount / runMix) * 100) : 0;
    const recentScores = runs
      .slice()
      .reverse()
      .map(run => Number(run.score))
      .filter(value => Number.isFinite(value));
    const buildSparkline = (values) => {
      if (!values.length) return '';
      const width = 420;
      const height = 84;
      const padding = 8;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const spread = max - min || 1;
      const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
      const points = values.map((value, index) => {
        const x = padding + step * index;
        const y = height - padding - ((value - min) / spread) * (height - padding * 2);
        return [x, y];
      });
      const line = points.map(([x, y]) => x + ',' + y).join(' ');
      const area = [padding + ',' + (height - padding)]
        .concat(points.map(([x, y]) => x + ',' + y))
        .concat((padding + step * (values.length - 1)) + ',' + (height - padding))
        .join(' ');
      const circles = points.map(([x, y], index) => {
        const radius = index === points.length - 1 ? 4.5 : 3;
        const fill = index === points.length - 1 ? 'var(--accent-2)' : 'var(--accent)';
        return '<circle cx="' + x + '" cy="' + y + '" r="' + radius + '" fill="' + fill + '"></circle>';
      }).join('');
      return '<svg class="sparkline" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" aria-label="Recent run score trend">' +
        '<defs><linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">' +
        '<stop offset="0%" stop-color="rgba(14,116,144,0.28)"></stop>' +
        '<stop offset="100%" stop-color="rgba(14,116,144,0.02)"></stop>' +
        '</linearGradient></defs>' +
        '<polygon points="' + area + '" fill="url(#spark-fill)"></polygon>' +
        '<polyline points="' + line + '" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
        circles +
        '</svg>';
    };
    const trendDelta = runs.length >= 2 ? Number(runs[0].score) - Number(runs[1].score) : 0;

    const heroHtml = \`
      <section class="card hero-card span-12">
        <div class="hero-layout">
          <div class="hero-copy">
            <span class="eyebrow">Autonomous Research Cockpit</span>
            <h1>\${data.project}</h1>
            <p>\${data.description}</p>
            <div>
              <span class="phase-chip"><span class="phase-dot"></span>\${titleize(phaseCurrent)}</span>
            </div>
            <div class="phase-reason">
              <strong>Current experiment objective</strong>
              <p class="section-lead">\${phaseReason}</p>
            </div>
            <div>
              <span class="chip">best run: \${fmt(report?.summary?.lastPromotedRunId)}</span>
              <span class="chip">accept rate: \${acceptRate}%</span>
              <span class="chip">issues: \${issues.length}</span>
            </div>
          </div>
          <div class="hero-stats">
            <div class="mini-grid">
              <div class="mini-stat">
                <div class="mini-stat-label">Experiment readiness</div>
                <div class="mini-stat-value">\${readinessPercent}%</div>
              </div>
              <div class="mini-stat">
                <div class="mini-stat-label">Current score</div>
                <div class="mini-stat-value">\${fmt(data.evaluation.score)}</div>
              </div>
              <div class="mini-stat">
                <div class="mini-stat-label">Best score</div>
                <div class="mini-stat-value">\${fmt(data.state.bestScore)}</div>
              </div>
              <div class="mini-stat">
                <div class="mini-stat-label">Last run</div>
                <div class="mini-stat-value">\${lastRun ? titleize(lastRun.status) : 'n/a'}</div>
              </div>
            </div>
            <div class="card" style="padding:14px 16px;">
              <h2>Immediate next action</h2>
              \${nextAction ? \`
                <p class="section-lead">\${nextAction.title}</p>
                <div class="action-command">\${nextAction.command}</div>
              \` : '<p class="section-lead">No queued action.</p>'}
            </div>
          </div>
        </div>
      </section>
    \`;

    const readinessHtml = \`
      <section class="card span-8">
        <div class="readiness">
          <div class="readiness-header">
            <div>
              <h2>Experiment Readiness</h2>
              <p class="section-lead">How close the current lane is to its active phase contract.</p>
            </div>
            <div class="readiness-score">\${completedMetrics}/\${metrics.length}</div>
          </div>
          <div class="progress"><div class="progress-bar" style="width:\${readinessPercent}%"></div></div>
          <div class="metric-stack">
            \${metrics.map(([key, value]) => {
              const score = Math.max(0, Math.min(1, Number(value)));
              return \`
                <div class="metric-row">
                  <div>
                    <strong>\${titleize(key)}</strong>
                    <div class="metric-track"><div class="metric-fill" style="width:\${score * 100}%"></div></div>
                  </div>
                  <div class="metric-score">\${score.toFixed(2)}</div>
                </div>
              \`
            }).join('')}
          </div>
        </div>
      </section>
      <section class="card span-4">
        <h2>CURRENT_FRICTION</h2>
        <p class="section-lead">What is blocking phase completion or promotion right now.</p>
        <div style="margin-top:12px;">
          \${blockerMetrics.length ? (
            '<div class="friction-terminal">' +
            '<div class="friction-head"><span>memory-policy://experiment_bootstrap</span><span>' + blockerMetrics.length + ' active blocker(s)</span></div>' +
            blockerMetrics.map(([key, value], index) =>
              '<div class="friction-line">' +
              '<span class="friction-pill">drag ' + Math.round((1 - Number(value)) * 100) + '%</span>' +
              '<strong>[' + (index + 1) + '] ' + titleize(key) + '</strong>' +
              '<span>completion=' + Number(value).toFixed(2) + '</span>' +
              '</div>'
            ).join('') +
            '</div>'
          ) : '<div class="success-note">No blocker metrics. The active contract is fully satisfied.</div>'}
        </div>
      </section>
    \`;

    const runPressureHtml = [
      ['Accepted runs', acceptedCount],
      ['Rejected runs', rejectedCount],
      ['Failed runs', failedCount],
      ['Reject streak', fmt(report?.summary?.consecutiveRejectedRuns)],
      ['No-change streak', fmt(report?.summary?.consecutiveNoChangeRuns)],
      ['Issue count', issues.length],
    ].map(([label, value]) => \`
      <article class="card span-4">
        <div class="metric">
          <span>\${label}</span>
          <span class="metric-value">\${value}</span>
        </div>
      </article>
    \`).join('');

    const summaryHtml = \`
      <section class="card span-6">
        <h2>Project Summary</h2>
        <p class="section-lead">\${data.evaluation.summary}</p>
        <p class="section-lead">Recommendation: \${data.evaluation.recommendation ?? 'n/a'}</p>
        <div style="margin-top:14px;">
          <span class="chip">phase: \${titleize(phaseCurrent)}</span>
          <span class="chip">protected goals tracked</span>
          <span class="chip">event-triggered sentinel enabled</span>
        </div>
      </section>
      <section class="card span-6">
        <h2>Health & Decisions</h2>
        <div style="margin-top:12px;">
          \${issues.length ? issues.map(issue => \`
            <div class="issue \${issue.severity}">
              <strong>\${issue.summary}</strong>
              <p style="margin-top:6px;">\${issue.suggestedAction}</p>
            </div>
          \`).join('') : '<div class="success-note">No active health issues. The current blocker is experiment completeness, not system instability.</div>'}
        </div>
      </section>
    \`;

    const runsHtml = \`
      <section class="card span-4">
        <div class="trend-card">
          <div class="trend-head">
            <div>
              <h2>Run Trend</h2>
              <p class="section-lead">Recent score direction across latest runs.</p>
            </div>
            <div class="trend-value">\${fmt(runs[0]?.score ?? data.evaluation.score)}</div>
          </div>
          <div class="sparkline-shell">
            \${recentScores.length ? buildSparkline(recentScores) : '<p class="subdued">No score history yet.</p>'}
            <div class="sparkline-labels">
              <span>oldest</span>
              <span>latest</span>
            </div>
          </div>
          <div class="run-balance">
            <div class="stack-bar" style="--accepted:\${Math.max(acceptedCount,1)}fr; --rejected:\${Math.max(rejectedCount,1)}fr; --failed:\${Math.max(failedCount,1)}fr;">
              <span class="stack-segment accepted"></span>
              <span class="stack-segment rejected"></span>
              <span class="stack-segment failed"></span>
            </div>
            <div class="timeline-meta">
              <span>accepted: \${acceptedCount}</span>
              <span>rejected: \${rejectedCount}</span>
              <span>failed: \${failedCount}</span>
              <span>delta vs previous: \${trendDelta >= 0 ? '+' : ''}\${trendDelta.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="card span-8">
        <h2>Run Timeline</h2>
        <p class="section-lead">Most recent iterations, ordered newest first.</p>
        <div class="timeline" style="margin-top:12px;">
          \${runs.length ? runs.map(run => \`
            <div class="timeline-item">
              <span class="timeline-dot \${run.status}"></span>
              <div class="timeline-body">
                <strong class="mono">\${run.runId}</strong>
                <p class="section-lead">\${titleize(run.status)} run with score \${run.score} and delta \${run.scoreDelta}</p>
                <div class="timeline-meta">
                  <span>changed files: \${run.changedFiles.length}</span>
                  <span>invalid writes: \${run.invalidChanges.length}</span>
                  <span>dry run: \${run.dryRun ? 'yes' : 'no'}</span>
                </div>
              </div>
            </div>
          \`).join('') : '<p>No runs yet.</p>'}
        </div>
      </section>
      <section class="card span-12">
        <h2>Active Surfaces</h2>
        <p class="section-lead">Files changing most often across recent runs.</p>
        <table class="table compact" style="margin-top:12px;">
          <tbody>
            \${topFiles.length ? topFiles.map(item => \`
              <tr><td class="mono">\${item.path}</td><td>\${item.count}</td></tr>
            \`).join('') : '<tr><td>No file changes recorded.</td><td></td></tr>'}
          </tbody>
        </table>
      </section>
    \`;

    const opsHtml = \`
      <section class="card span-6">
        <h2>Maintenance Queue</h2>
        <table class="table compact" style="margin-top:12px;">
          <thead>
            <tr><th>Action</th><th>Command</th></tr>
          </thead>
          <tbody>
            \${queue.map(item => \`
              <tr>
                <td>\${item.title}</td>
                <td class="mono">\${item.command}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      </section>
      <section class="card span-6">
        <h2>Version & Drift</h2>
        <p class="section-lead">Operational context is retained, but intentionally de-emphasized below experiment status.</p>
        <pre class="mono" style="white-space:pre-wrap; margin-top:12px;">\${gitLines.join('\\n')}</pre>
        <h3 style="margin-top:14px;">Protected Drift</h3>
        <pre class="mono" style="white-space:pre-wrap; margin-top:10px;">\${protectedDrift.length ? protectedDrift.join('\\n') : 'none'}</pre>
      </section>
    \`;

    app.innerHTML = heroHtml + readinessHtml + runPressureHtml + summaryHtml + runsHtml + opsHtml;
  </script>
</body>
</html>`
}

function refreshDashboard(
  projectName: string,
  config: ProjectConfig,
  state: ProjectState,
  evaluation: EvaluationResult,
  report: HealthReport | null,
): void {
  const html = generateDashboardHtml(projectName, config, state, evaluation, report)
  ensureDir(projectRuntimeDir(projectName))
  writeFileSync(projectDashboardPath(projectName), html, 'utf8')
}

function buildSentinelMaintenancePrompt(
  projectName: string,
  config: ProjectConfig,
  report: HealthReport,
): string {
  const allowedMaintenanceRoots = getSentinelAllowedRoots(projectName, config)

  return `You are the sentinel maintenance loop for the autoresearch environment.

Scope:
- project: ${projectName}
- runtime dir: ${projectRuntimeDir(projectName)}
- dashboard path: ${projectDashboardPath(projectName)}
- current phase: ${report.phase.current}

Mission:
- maintain the autoresearch controller, templates, dashboard, and related infrastructure
- keep the research environment healthy and aligned with the original goal
- do not optimize the research score by mutating the protected target

Protected paths you must not edit:
- ${config.goal_file}
- ${config.program_file}
- ${config.workspace_dir}/

Allowed maintenance surfaces:
${allowedMaintenanceRoots.map(path => `- ${path}`).join('\n')}

Current health issues:
${report.issues.length > 0 ? report.issues.map(issue => `- [${issue.severity}] ${issue.summary} | action: ${issue.suggestedAction}`).join('\n') : '- none'}

Current git status:
${report.versioning.gitStatusLines.map(line => `- ${line}`).join('\n')}

Instructions:
- make only maintenance-oriented edits that improve reliability, observability, dashboard usefulness, or version discipline
- do not rewrite paper/design/experiment content
- your candidate changes will be promoted only if every modified file stays inside the allowed maintenance surfaces
- if no code maintenance is needed, explain why in your final response and make no edits
- keep changes small and reviewable
`
}

function buildHealthReport(
  projectName: string,
  config: ProjectConfig,
  state: ProjectState,
  evaluation: EvaluationResult,
): HealthReport {
  const phase = loadPhaseState(projectName)
  const currentProtected = collectProtectedDigests(projectName, config)
  const manifest = readProtectedManifest(projectName)
  const drift = computeProtectedDrift(currentProtected, manifest)
  const runs = listRunRecords(projectName)
  const promotedRunIds = new Set(state.acceptedRuns)
  const lastPromotedRun =
    runs.find(run => promotedRunIds.has(run.runId)) ?? null
  const report: HealthReport = {
    project: projectName,
    generatedAt: new Date().toISOString(),
    phase,
    evaluation,
    summary: {
      totalRuns: state.totalRuns,
      acceptedRuns: state.acceptedRuns.length,
      rejectedRuns: state.rejectedRuns.length,
      failedRuns: state.failedRuns.length,
      bestScore: state.bestScore,
      lastRunStatus: state.lastRun?.status ?? 'n/a',
      lastPromotedRunId: lastPromotedRun?.runId ?? null,
      lastPromotedAt: lastPromotedRun?.createdAt ?? null,
      consecutiveRejectedRuns: countLeadingRuns(
        runs,
        run => run.status === 'rejected',
      ),
      consecutiveNoChangeRuns: countLeadingRuns(
        runs,
        run => run.changedFiles.length === 0 && run.invalidChanges.length === 0,
      ),
    },
    protectedFiles: {
      tracked: currentProtected,
      drift,
    },
    versioning: {
      gitStatusLines: getGitStatusLines(projectName),
    },
    recentRuns: runs.slice(0, 10),
    topChangedFiles: topChangedFiles(runs.slice(0, 25)),
    issues: detectHealthIssues(projectName, config, state, evaluation, runs, drift),
    maintenanceQueue: [],
  }

  report.maintenanceQueue = buildMaintenanceQueue(projectName, report.issues)

  return report
}

function maybeRefreshProtectedManifest(
  projectName: string,
  config: ProjectConfig,
  parsedArgs: ParsedArgs,
): void {
  const manifestExists = existsSync(projectManifestPath(projectName))
  const shouldRefreshManifest =
    getBooleanFlag(parsedArgs, 'refresh-protected') ||
    getBooleanFlag(parsedArgs, 'fix') ||
    !manifestExists

  if (shouldRefreshManifest) {
    writeJsonFile(
      projectManifestPath(projectName),
      collectProtectedDigests(projectName, config),
    )
  }
}

function writeSentinelArtifacts(
  projectName: string,
  config: ProjectConfig,
  state: ProjectState,
  report: HealthReport,
): void {
  ensureDir(projectRuntimeDir(projectName))
  writeJsonFile(projectHealthPath(projectName), report)
  writeJsonFile(projectMaintenanceQueuePath(projectName), report.maintenanceQueue)
  writeHealthMarkdown(projectName, report)
  refreshDashboard(projectName, config, state, report.evaluation, report)
}

async function runSentinelCodexMaintenance(
  projectName: string,
  config: ProjectConfig,
  report: HealthReport,
  parsedArgs: ParsedArgs,
): Promise<SentinelRunRecord> {
  const sentinelDir = projectSentinelDir(projectName)
  ensureDir(sentinelDir)
  const runId = new Date()
    .toISOString()
    .replaceAll(':', '')
    .replaceAll('.', '')
    .replaceAll('-', '')
  const runDir = join(sentinelDir, runId)
  ensureDir(runDir)
  const candidateRoot = join(runDir, 'candidate')
  const baselineRoot = join(runDir, 'baseline')
  const allowedMaintenanceRoots = getSentinelAllowedRoots(projectName, config)
  const candidateContextRoots = [
    'scripts/autoresearch.ts',
    'research/autoresearch',
    'package.json',
    'AGENTS.md',
    relativePosix(repoRoot, projectRuntimeDir(projectName)),
  ]

  copyPathsIntoRoot(repoRoot, candidateRoot, candidateContextRoots)
  copyPathsIntoRoot(repoRoot, baselineRoot, candidateContextRoots)

  const prompt = buildSentinelMaintenancePrompt(projectName, config, report)
  const promptPath = join(runDir, 'prompt.md')
  const outputPath = join(runDir, 'codex-last-message.md')
  writeFileSync(promptPath, prompt, 'utf8')

  const cmd = ['codex', 'exec', '--full-auto', '--cd', candidateRoot]
  const modelConfig = parseCodexModelSetting(
    getStringFlag(parsedArgs, 'model') ??
      config.sentinel?.codex_model ??
      'gpt-5.4-medium',
  )
  if (modelConfig.model) {
    cmd.push('--model', modelConfig.model)
  }
  if (modelConfig.reasoningEffort) {
    cmd.push(
      '--config',
      `model_reasoning_effort="${modelConfig.reasoningEffort}"`,
    )
  }
  cmd.push('--sandbox', 'workspace-write')
  cmd.push('--output-last-message', outputPath, prompt)

  const proc = Bun.spawn({
    cmd,
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const timeoutMinutes = getNumberFlag(
    parsedArgs,
    'codex-timeout-minutes',
    config.sentinel?.codex_timeout_minutes ?? 15,
  )
  const timeoutMs = timeoutMinutes * 60_000

  let timedOut = false
  const exitCode = await Promise.race<number | null>([
    proc.exited,
    sleepMs(timeoutMs).then(() => {
      timedOut = true
      proc.kill()
      return null
    }),
  ])

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()

  writeFileSync(join(runDir, 'stdout.log'), stdout, 'utf8')
  writeFileSync(join(runDir, 'stderr.log'), stderr, 'utf8')

  const record: SentinelRunRecord = {
    runId,
    createdAt: new Date().toISOString(),
    codexInvoked: true,
    codexExitCode: exitCode,
    timedOut,
    healthIssueCount: report.issues.length,
    maintenancePromptPath: promptPath,
    maintenanceOutputPath: outputPath,
    changedFiles: [],
    invalidChanges: [],
    promotedPaths: [],
  }

  const changedFiles = changedFilesBetween(baselineRoot, candidateRoot)
  const invalidChanges = changedFiles.filter(
    file => !isAllowedPath(file, allowedMaintenanceRoots),
  )
  const promotedPaths =
    exitCode === 0 && !timedOut && invalidChanges.length === 0
      ? changedFiles.filter(file => isAllowedPath(file, allowedMaintenanceRoots))
      : []

  if (promotedPaths.length > 0) {
    syncAllowedRoots(candidateRoot, repoRoot, allowedMaintenanceRoots)
  }

  record.changedFiles = changedFiles
  record.invalidChanges = invalidChanges
  record.promotedPaths = promotedPaths

  writeJsonFile(join(runDir, 'result.json'), record)
  writeJsonFile(join(sentinelDir, 'latest.json'), record)
  return record
}

function sentinelIntervalMs(
  config: ProjectConfig,
  parsedArgs: ParsedArgs,
): number {
  const explicitMinutes = getStringFlag(parsedArgs, 'interval-minutes')
  if (explicitMinutes !== undefined) {
    const parsed = Number(explicitMinutes)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed * 60_000
    }
  }
  return (config.sentinel?.interval_hours ?? 6) * 3_600_000
}

function shouldEventTriggerSentinel(
  config: ProjectConfig,
  runRecord: RunRecord,
): boolean {
  return (config.sentinel?.event_trigger_on_run_complete ?? true) && !runRecord.dryRun
}

async function sleepMs(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function commandJudge(parsedArgs: ParsedArgs): void {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('judge requires a project name')
  }

  const config = loadProjectConfig(projectName)
  const evaluation = runEvaluation(projectDir(projectName), config)
  console.log(JSON.stringify(evaluation.parsed, null, 2))
}

function commandStatus(parsedArgs: ParsedArgs): void {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('status requires a project name')
  }

  const config = loadProjectConfig(projectName)
  const state = loadProjectState(projectName)
  const phase = loadPhaseState(projectName)

  console.log(`Project: ${config.name}`)
  console.log(`Description: ${config.description}`)
  console.log(`Sentinel phase: ${phase.current}`)
  console.log(`Best score: ${state.bestScore ?? 'n/a'}`)
  console.log(`Best run: ${state.bestRunId ?? 'n/a'}`)
  console.log(`Total runs: ${state.totalRuns}`)
  console.log(`Accepted runs: ${state.acceptedRuns.length}`)
  console.log(`Rejected runs: ${state.rejectedRuns.length}`)
  console.log(`Failed runs: ${state.failedRuns.length}`)
  console.log(`Dashboard: ${projectDashboardPath(projectName)}`)
  if (state.lastRun) {
    console.log(
      `Last run: ${state.lastRun.runId} (${state.lastRun.status}, score=${state.lastRun.score})`,
    )
  }
}

async function commandRun(parsedArgs: ParsedArgs): Promise<void> {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('run requires a project name')
  }

  const iterations = getNumberFlag(parsedArgs, 'iterations', 1)
  const dryRun = getBooleanFlag(parsedArgs, 'dry-run')
  let config = loadProjectConfig(projectName)
  const root = projectDir(projectName)
  const runsRoot = projectRunsDir(projectName)
  const missingDerivedTargets = [
    config.derived_goal_file,
    config.metric_contract_file,
  ]
    .filter((path): path is string => typeof path === 'string')
    .filter(path => !existsSync(join(root, path)))

  if (missingDerivedTargets.length > 0) {
    throw new Error(
      `Sentinel-owned targets are missing (${missingDerivedTargets.join(', ')}). Run "bun run autoresearch sentinel ${projectName} --fix" before starting the main loop.`,
    )
  }

  ensureDir(runsRoot)

  let state = loadProjectState(projectName)

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const persistRunRecord = (runRecord: RunRecord): void => {
      state.totalRuns += 1
      state.lastRun = runRecord
      writeJsonFile(join(runDir, 'result.json'), runRecord)
      saveProjectState(projectName, state)

      const health = buildHealthReport(
        projectName,
        config,
        state,
        runEvaluation(root, config).parsed,
      )
      writeSentinelArtifacts(projectName, config, state, health)
    }

    const currentEvaluation = runEvaluation(root, config).parsed
    const sequence = state.totalRuns + 1
    const runId = `${new Date().toISOString().replaceAll(':', '').replaceAll('.', '').replaceAll('-', '')}-${String(sequence).padStart(4, '0')}`
    const runDir = join(runsRoot, runId)
    const candidateRoot = join(runDir, 'candidate')
    const outputPath = join(runDir, 'codex-last-message.md')
    ensureDir(runDir)
    cpSync(root, candidateRoot, { recursive: true })

    const prompt = buildCodexPrompt(config, currentEvaluation, runDir)
    writeFileSync(join(runDir, 'prompt.md'), prompt, 'utf8')

    let codexExitCode: number | null = null
    let codexStdout = ''
    let codexStderr = ''
    let changedFiles: string[] = []
    let invalidChanges: string[] = []
    const ignoredDiffRoots = getIgnoredDiffRoots(config)

    if (!dryRun) {
      const codexResult = await runCodexIteration(
        candidateRoot,
        prompt,
        config,
        outputPath,
        parsedArgs,
      )
      codexExitCode = codexResult.exitCode
      codexStdout = codexResult.stdout
      codexStderr = codexResult.stderr
      writeFileSync(join(runDir, 'codex-stdout.log'), codexStdout, 'utf8')
      writeFileSync(join(runDir, 'codex-stderr.log'), codexStderr, 'utf8')
      changedFiles = changedFilesBetween(root, candidateRoot)
      changedFiles = filterIgnoredPaths(changedFiles, ignoredDiffRoots)
      invalidChanges = changedFiles.filter(
        file => !isAllowedPath(file, config.allowed_edit_roots),
      )

      if (codexResult.timedOut) {
        const baselineScore = state.bestScore ?? currentEvaluation.score
        const failureMessage = `Codex iteration timed out in run ${runId} after ${getNumberFlag(parsedArgs, 'codex-timeout-minutes', config.codex?.timeout_minutes ?? 30)} minute(s)`
        state.failedRuns.push(runId)
        persistRunRecord({
          runId,
          status: 'failed',
          dryRun,
          score: currentEvaluation.score,
          scoreDelta: 0,
          baselineScore,
          bestScoreAfterRun: state.bestScore ?? currentEvaluation.score,
          changedFiles,
          invalidChanges,
          codexExitCode,
          evaluation: currentEvaluation,
          createdAt: new Date().toISOString(),
          timedOut: true,
          error: failureMessage,
        })
        throw new Error(
          failureMessage,
        )
      }

      if (codexExitCode !== 0) {
        const baselineScore = state.bestScore ?? currentEvaluation.score
        const failureMessage = `Codex iteration failed in run ${runId} with exit code ${codexExitCode}\n${codexStderr || codexStdout}`
        state.failedRuns.push(runId)
        persistRunRecord({
          runId,
          status: 'failed',
          dryRun,
          score: currentEvaluation.score,
          scoreDelta: 0,
          baselineScore,
          bestScoreAfterRun: state.bestScore ?? currentEvaluation.score,
          changedFiles,
          invalidChanges,
          codexExitCode,
          evaluation: currentEvaluation,
          createdAt: new Date().toISOString(),
          error: failureMessage,
        })
        throw new Error(
          failureMessage,
        )
      }
    } else {
      writeFileSync(
        outputPath,
        'Dry run: controller skipped codex exec and evaluated the current workspace snapshot.\n',
        'utf8',
      )
    }

    if (dryRun) {
      changedFiles = changedFilesBetween(root, candidateRoot)
      changedFiles = filterIgnoredPaths(changedFiles, ignoredDiffRoots)
      invalidChanges = changedFiles.filter(
        file => !isAllowedPath(file, config.allowed_edit_roots),
      )
    }

    const evaluation = runEvaluation(candidateRoot, config).parsed
    writeJsonFile(join(runDir, 'evaluation.json'), evaluation)

    const baselineScore = state.bestScore ?? currentEvaluation.score
    const minimumImprovement = config.minimum_improvement ?? 0
    const scoreDelta = Number((evaluation.score - baselineScore).toFixed(3))
    const improvedEnough =
      state.bestScore === null ||
      evaluation.score >= state.bestScore + minimumImprovement
    const accepted = invalidChanges.length === 0 && improvedEnough
    const status: RunRecord['status'] =
      state.bestScore === null && changedFiles.length === 0 && dryRun
        ? 'baseline'
        : accepted
          ? 'accepted'
          : 'rejected'

    if (accepted) {
      syncAllowedRoots(candidateRoot, root, config.allowed_edit_roots)
      state.bestScore = evaluation.score
      state.bestRunId = runId
      state.acceptedRuns.push(runId)
    } else {
      state.rejectedRuns.push(runId)
    }

    const runRecord: RunRecord = {
      runId,
      status,
      dryRun,
      score: evaluation.score,
      scoreDelta,
      baselineScore,
      bestScoreAfterRun: state.bestScore ?? evaluation.score,
      changedFiles,
      invalidChanges,
      codexExitCode,
      evaluation,
      createdAt: new Date().toISOString(),
    }

    persistRunRecord(runRecord)

    console.log(
      `${runId}: ${status} score=${evaluation.score} delta=${scoreDelta} changed=${changedFiles.length} invalid=${invalidChanges.length}`,
    )

    if (shouldEventTriggerSentinel(config, runRecord)) {
      await runSentinelPass(parseArgs([projectName, '--refresh-protected']))
      config = loadProjectConfig(projectName)
    }
  }
}

async function runSentinelPass(
  parsedArgs: ParsedArgs,
): Promise<SentinelRunRecord | null> {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('sentinel requires a project name')
  }

  let config = loadProjectConfig(projectName)
  const state = loadProjectState(projectName)
  if (getBooleanFlag(parsedArgs, 'fix')) {
    bootstrapSentinelOwnedFiles(projectName, config)
  }

  let evaluation = runEvaluation(projectDir(projectName), config).parsed
  const phaseReconcile = reconcileSentinelPhase(
    projectName,
    config,
    state,
  )
  config = phaseReconcile.config
  maybeRefreshProtectedManifest(projectName, config, parsedArgs)

  evaluation = runEvaluation(projectDir(projectName), config).parsed
  let report = buildHealthReport(projectName, config, state, evaluation)
  writeSentinelArtifacts(projectName, config, state, report)

  const shouldRunCodex =
    getBooleanFlag(parsedArgs, 'codex') || getBooleanFlag(parsedArgs, 'loop')
  const sentinelRecord = shouldRunCodex
    ? await runSentinelCodexMaintenance(projectName, config, report, parsedArgs)
    : null

  if (sentinelRecord && sentinelRecord.promotedPaths.length > 0) {
    evaluation = runEvaluation(projectDir(projectName), config).parsed
    report = buildHealthReport(projectName, config, state, evaluation)
    writeSentinelArtifacts(projectName, config, state, report)
  }

  console.log(
    `Sentinel updated ${projectHealthPath(projectName)} and ${projectDashboardPath(projectName)}`,
  )
  console.log(
    `Issues: ${
      report.issues.length > 0
        ? report.issues.map(issue => `${issue.severity}:${issue.id}`).join(', ')
        : 'none'
    }`,
  )

  if (sentinelRecord) {
    console.log(
      `Sentinel Codex maintenance run ${sentinelRecord.runId} exit=${sentinelRecord.codexExitCode}${sentinelRecord.timedOut ? ' timed_out=true' : ''} promoted=${sentinelRecord.promotedPaths.length} invalid=${sentinelRecord.invalidChanges.length}`,
    )
  }

  return sentinelRecord
}

async function commandSentinel(parsedArgs: ParsedArgs): Promise<void> {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('sentinel requires a project name')
  }

  const config = loadProjectConfig(projectName)
  const loop = getBooleanFlag(parsedArgs, 'loop')

  if (!loop) {
    await runSentinelPass(parsedArgs)
    return
  }

  const intervalMs = sentinelIntervalMs(config, parsedArgs)
  console.log(
    `Starting sentinel loop for ${projectName} with interval ${Math.round(intervalMs / 60000)} minutes`,
  )

  for (;;) {
    await runSentinelPass(parsedArgs)
    await sleepMs(intervalMs)
  }
}

function commandDashboard(parsedArgs: ParsedArgs): void {
  const projectName = parsedArgs.positional[0]
  if (!projectName) {
    throw new Error('dashboard requires a project name')
  }

  const config = loadProjectConfig(projectName)
  const state = loadProjectState(projectName)
  const evaluation = runEvaluation(projectDir(projectName), config).parsed
  const report = existsSync(projectHealthPath(projectName))
    ? readJsonFile<HealthReport>(projectHealthPath(projectName))
    : buildHealthReport(projectName, config, state, evaluation)

  refreshDashboard(projectName, config, state, evaluation, report)
  console.log(`Dashboard written to ${projectDashboardPath(projectName)}`)
}

try {
  const [rawCommand, ...rest] = process.argv.slice(2)
  const command = normalizeCommandName(rawCommand)
  const parsedArgs = parseArgs(rest)

  switch (command) {
    case 'help':
      printHelp()
      break
    case 'init':
      await commandInit(parsedArgs)
      break
    case 'judge':
      commandJudge(parsedArgs)
      break
    case 'list':
      commandList()
      break
    case 'run':
      await commandRun(parsedArgs)
      break
    case 'sentinel':
      await commandSentinel(parsedArgs)
      break
    case 'dashboard':
      commandDashboard(parsedArgs)
      break
    case 'status':
      commandStatus(parsedArgs)
      break
  }
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}
