import * as core from '@actions/core'
import * as github from '@actions/github'
import * as stateHelper from './state-helper'

async function run(): Promise<void> {
  try {
    // const token = core.getInput('github_token');
    // const octokit = github.getOctokit(token);
    const context = github.context
    core.warning(JSON.stringify(context, null, 2))
    // octokit.status
    // octokit.repos.createCommitStatus({
    //   owner,
    //   repo,
    //   sha,
    //   state,
    // });
    core.warning('main')
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function cleanup(): Promise<void> {
  try {
    core.warning('cleanup')
  } catch (error) {
    core.warning(error.message)
  }
}

// Main
if (!stateHelper.IsPost) {
  run()
}
// Post
else {
  cleanup()
}
