# action-workflow_run-status

![workflow_run status demo](https://user-images.githubusercontent.com/3797062/89281009-6367de00-d684-11ea-9775-82d2e7c15c42.png)

This action updates commit status of a original commit which triggerred [`workflow_run`](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#workflow_run) workflow.

Workflow triggered by `workflow_run` event runs on the default branch for the
repository, so it's hard to track the status by default from the original
commit even though it triggered the workflow.
This action simply resolve this issue by updating commit status. You can check
the status of `workflow_run` job and jump to the associated workflow page from
the attached commit status.

## Usage

Just add `haya14busa/action-workflow_run-status@v1` as a first step of workflow
jobs triggered by `workflow_run` event.

```yaml
name: 'test_post'
on:
  workflow_run:
    workflows: ["test"]
    types:
      - completed

jobs:
  post-test-success:
    runs-on: ubuntu-latest
    steps:
      - uses: haya14busa/action-workflow_run-status@v1
      - uses: actions/checkout@v3
      - run: exit 0

  post-test-failure:
    runs-on: ubuntu-latest
    steps:
      - uses: haya14busa/action-workflow_run-status@v1
      - uses: actions/checkout@v3
      - run: exit 1
```

if your jobs using matrix you can send it's name for display like:

```yaml
name: 'test_post'
on:
  workflow_run:
    workflows: ["test"]
    types:
      - completed
jobs:
  build:
    if: github.event.workflow_run.conclusion == 'success'
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node_group:
          - "1"
          - "2"
    steps:
      - uses: actions/checkout@v3
      - uses: ./
        with:
        matrix_name: ${{ matrix.node_group }}
      - run: exit 0
```
