import * as core from '@actions/core'
import * as github from '@actions/github'
import * as stateHelper from './state-helper'
import {wait} from './wait'

type Status = 'failure' | 'pending' | 'success'

async function run(): Promise<void> {
  try {
    await postStatus(false)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

async function cleanup(): Promise<void> {
  try {
    await postStatus(true)
  } catch (error) {
    if (error instanceof Error) {
      core.warning(error.message)
    }
  }
}

function job2status(
  job: {
    id: number
    run_id: number
    node_id: string
    head_sha: string
    url: string
    html_url: string | null
    status: 'completed' | 'queued' | 'in_progress'
    conclusion: string | null
    started_at: string
    completed_at: string | null
    name: string
    steps?:
      | {
          status: 'completed' | 'queued' | 'in_progress'
          conclusion: string | null
          name: string
          number: number
          started_at?: string | null | undefined
          completed_at?: string | null | undefined
        }[]
      | undefined
    check_run_url: string
  },
  isCleanUp: boolean
): Status {
  if (!isCleanUp) {
    return 'pending'
  }
  if (!job.steps) {
    return 'success'
  }
  for (const value of job.steps) {
    if (!value.conclusion) continue
    core.info(value.conclusion)
  }
  // Find step with failure instead of relying on job.conclusion because this
  // (post) action itself is one of a step of this job and job.conclusion is
  // always null while running this action.
  const failedStep = job.steps.find(
    step => step.conclusion === 'failure' || step.conclusion === 'cancelled'
  )
  if (failedStep) {
    return 'failure'
  }
  return 'success'
}

function jobName(job: string): string {
  if (
    process.env.MATRIX_CONTEXT == null ||
    process.env.MATRIX_CONTEXT === 'null'
  )
    return job
  const matrix = JSON.parse(process.env.MATRIX_CONTEXT)
  const value = Object.values(matrix)
    .filter(x => x !== '')
    .join(', ')
  const value2 = value !== '' ? `${job} (${value})` : job
  if (value2.length <= 100) return value2
  return `${value2.substring(0, 97)}...`
}

async function postStatus(isCleanUp: boolean): Promise<void> {
  const context = github.context
  if (context.eventName !== 'workflow_run') {
    throw new Error(
      `This is not workflow_run event: eventName=${context.eventName}`
    )
  }
  const token = core.getInput('github_token')
  const octokit = github.getOctokit(token)
  if (isCleanUp) {
    core.info(
      'Waiting 10 secs to wait for other steps job completion are propagated to GitHub API response.'
    )
    await wait(10 * 1000)
  }
  const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
    filter: 'latest',
    per_page: 100
  })
  const job = jobs.data.jobs.find(j => j.name === jobName(context.job))
  if (!job) {
    throw new Error(`job not found: ${jobName(context.job)}`)
  }
  const state =
    context.payload.action === 'requested' && requestedAsPending()
      ? 'pending'
      : job2status(job, isCleanUp)
  const resp = await octokit.rest.repos.createCommitStatus({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: context.payload.workflow_run.head_commit.id,
    state,
    context: `${context.workflow} / ${jobName(context.job)} (${
      context.payload.workflow_run.event
    } => ${context.eventName})`,
    target_url: !job.html_url ? undefined : job.html_url
  })
  core.debug(JSON.stringify(resp, null, 2))
}

function requestedAsPending(): boolean {
  return (
    (core.getInput('requested_as_pending') || 'false').toUpperCase() === 'TRUE'
  )
}

// Main
if (!stateHelper.IsPost) {
  run()
}
// Post
else {
  cleanup()
}
