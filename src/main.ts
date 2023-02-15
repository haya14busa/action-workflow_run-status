import * as core from '@actions/core'
import * as github from '@actions/github'
import * as stateHelper from './state-helper'
import type {components} from '@octokit/openapi-types'
import {wait} from './wait'

type Status = 'failure' | 'pending' | 'success' | 'error'

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
  job: components['schemas']['job'],
  isCleanUp: boolean
): Status {
  if (!isCleanUp) {
    return 'pending'
  }
  // Find step with failure instead of relying on job.conclusion because this
  // (post) action itself is one of a step of this job and job.conclusion is
  // always null while running this action.
  const failedStep = job.steps?.find(step => step.conclusion === 'failure')
  if (failedStep) {
    return 'failure'
  }
  return job.conclusion === 'success' ? 'success' : 'error'
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
  const job = jobs.data.jobs.find(j => j.run_id === context.runId)
  if (!job) {
    throw new Error(`job not found: ${context.job}`)
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
    context: `${context.workflow} / ${context.job}${matrixName()} (${
      context.payload.workflow_run.event
    } => ${context.eventName})`,
    target_url: job.html_url ?? undefined
  })
  core.debug(JSON.stringify(resp, null, 2))
}

function requestedAsPending(): boolean {
  return core.getBooleanInput('requested_as_pending')
}

function matrixName(): string {
  const name = core.getInput('matrix_name')
  if (name === '') {
    return ''
  }
  return ` (${name})`
}

// Main
if (!stateHelper.IsPost) {
  run()
}
// Post
else {
  cleanup()
}
