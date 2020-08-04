import * as core from '@actions/core'
import * as github from '@actions/github'
import * as stateHelper from './state-helper'

type Status = 'failure' | 'pending' | 'success'

async function run(): Promise<void> {
  try {
    core.warning('main')
    await postStatus()
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function cleanup(): Promise<void> {
  try {
    core.warning('cleanup')
    const token = core.getInput('github_token')
    const octokit = github.getOctokit(token)
    const context = github.context
    const resp = await octokit.actions.getWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      run_id: context.runId
    })
    core.warning(JSON.stringify(resp, null, 2))
    await postStatus()
  } catch (error) {
    core.warning(error.message)
  }
}

function toStatus(c: string): Status {
  if (c === 'success') {
    return 'success'
  } else if (c === 'pending') {
    return 'pending'
  } else if (c === 'failure') {
    return 'failure'
  } else {
    core.error(`unkonwn conclusion: ${c}`)
    return 'failure'
  }
}

async function postStatus(): Promise<void> {
  const context = github.context
  core.warning(JSON.stringify(context, null, 2))
  if (context.eventName !== 'workflow_run') {
    throw new Error(
      `This is not workflow_run event: eventName=${context.eventName}`
    )
  }
  const token = core.getInput('github_token')
  const octokit = github.getOctokit(token)
  const jobs = await octokit.actions.listJobsForWorkflowRun({
    owner: context.repo.owner,
    repo: context.repo.repo,
    run_id: context.runId,
    filter: 'latest',
    per_page: 100
  })
  core.warning(JSON.stringify(jobs, null, 2))
  const job = jobs.data.jobs.find(j => j.name === context.job)
  if (!job) {
    throw new Error(`job not found: ${context.job}`)
  }
  const resp = await octokit.repos.createCommitStatus({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: context.payload.workflow_run.head_commit.id,
    state: toStatus(job.conclusion),
    context: `${context.workflow} / ${context.job} (${context.eventName})`,
    target_url: job.html_url
  })
  core.warning(JSON.stringify(resp))
}

// Main
if (!stateHelper.IsPost) {
  run()
}
// Post
else {
  cleanup()
}
