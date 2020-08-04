import * as core from '@actions/core'
import * as github from '@actions/github'
import * as stateHelper from './state-helper'

async function run(): Promise<void> {
  try {
    core.warning('main')
    postStatus('pending')
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function cleanup(): Promise<void> {
  try {
    core.warning('cleanup')
    postStatus('success') // TODO(haya14busa): use an appropriate status.
  } catch (error) {
    core.warning(error.message)
  }
}

async function postStatus(
  state: 'failure' | 'pending' | 'success'
): Promise<void> {
  const context = github.context
  core.warning(JSON.stringify(context, null, 2))
  if (context.eventName !== 'workflow_run') {
    throw new Error(
      `This is not workflow_run event: eventName=${context.eventName}`
    )
  }
  const token = core.getInput('github_token')
  const octokit = github.getOctokit(token)
  const resp = await octokit.repos.createCommitStatus({
    owner: context.repo.owner,
    repo: context.repo.repo,
    sha: context.payload.workflow_run.head_commit.id,
    state,
    context: `workflow_run:${context.workflow}`,
    target_url: `https://github.com/${context.repo.owner}/${context.repo.repo}/runs/${context.runId}`
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
