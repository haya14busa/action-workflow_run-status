import * as core from '@actions/core'
import * as stateHelper from './state-helper'

async function run(): Promise<void> {
  try {
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
