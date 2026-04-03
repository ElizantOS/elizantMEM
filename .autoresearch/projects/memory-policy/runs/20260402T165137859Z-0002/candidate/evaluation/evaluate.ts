import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const root = process.cwd()

function read(relativePath: string): string {
  const fullPath = join(root, relativePath)
  return existsSync(fullPath) ? readFileSync(fullPath, 'utf8') : ''
}

function coverage(text: string, terms: string[]): number {
  if (terms.length === 0) return 0
  const matched = terms.filter(term =>
    text.toLowerCase().includes(term.toLowerCase()),
  ).length
  return matched / terms.length
}

function headingCount(text: string): number {
  return text
    .split('\n')
    .filter(line => line.trim().startsWith('#')).length
}

const abstract = read('workspace/paper/abstract.md')
const outline = read('workspace/paper/outline.md')
const design = read('workspace/design/memory-loop.md')
const plan = read('workspace/experiments/plan.md')
const matrix = read('workspace/experiments/eval-matrix.md')
const notes = read('workspace/ITERATION_NOTES.md')

const metrics = {
  abstract_quality: Math.min(abstract.trim().length / 900, 1),
  outline_structure: Math.min(headingCount(outline) / 7, 1),
  architecture_coverage: coverage(design, [
    'event capture',
    'candidate generator',
    'memory scorer',
    'write policy',
    'memory store',
    'retrieval policy',
    'feedback ledger',
    'reward',
  ]),
  experiment_rigor: coverage(plan, [
    'hypothesis',
    'baseline',
    'offline',
    'online',
    'ablation',
    'rollout',
    'risks',
  ]),
  evaluation_specificity: coverage(matrix, [
    'write precision',
    'pollution rate',
    'stale rate',
    'task success lift',
    'sql success lift',
    'token reduction',
    'latency reduction',
  ]),
  iteration_notes: notes.trim().length > 120 ? 1 : 0,
}

const score = Number(
  (
    metrics.abstract_quality * 1.5 +
    metrics.outline_structure * 1.5 +
    metrics.architecture_coverage * 3 +
    metrics.experiment_rigor * 2.5 +
    metrics.evaluation_specificity * 1 +
    metrics.iteration_notes * 0.5
  ).toFixed(3),
)

const summary =
  score >= 8
    ? 'The workspace is coherent enough to hand off for implementation-oriented experimentation.'
    : 'The workspace still needs sharper architecture, experiment rigor, or iteration bookkeeping.'

const recommendation =
  metrics.iteration_notes === 0
    ? 'Add workspace/ITERATION_NOTES.md so each run records a concrete hypothesis.'
    : metrics.experiment_rigor < 0.9
      ? 'Tighten baselines, offline/online protocol, and ablation design.'
      : 'Push deeper on implementation specificity or statistical evaluation details.'

console.log(JSON.stringify({ score, summary, metrics, recommendation }, null, 2))
