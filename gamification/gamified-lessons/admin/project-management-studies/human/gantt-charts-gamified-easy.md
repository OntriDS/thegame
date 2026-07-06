---
type: gamified-lesson-mechanics
lesson_slug: gantt-charts-easy
domain: project-management-studies
---

:::mechanic-data
id: gantt-charts-easy-c2-m1
version: 1
question: Who popularized the Gantt chart?
options:
  - id: a
    content: Henry Gantt
  - id: b
    content: Frederick Taylor
  - id: c
    content: Peter Drucker
:::

:::mechanic-private
id: gantt-charts-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: gantt-charts-easy-c2-m1
version: 1
lessonSlug: gantt-charts-easy
type: multiple-choice
tier: Easy
anchor:
  heading: what-is-a-gantt-chart
  position: after
concepts:
  - origin of the Gantt chart
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: gantt-charts-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: gantt-charts-easy-c2-m1:public
privateValidatorRef: gantt-charts-easy-c2-m1:private
rewardIdentity: gantt-charts-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: gantt-charts-easy-c3-m1
version: 1
categories:
  - id: cat-a
    label: Tasks
  - id: cat-b
    label: Time
items:
  - id: i1
    content: Planning Phase
  - id: i2
    content: Project start date
  - id: i3
    content: Design Phase
  - id: i4
    content: Daily time units
  - id: i5
    content: Development Phase
  - id: i6
    content: Project end date
:::

:::mechanic-private
id: gantt-charts-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
  i5: cat-a
  i6: cat-b
:::

:::mechanic
schemaVersion: 1
id: gantt-charts-easy-c3-m1
version: 1
lessonSlug: gantt-charts-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-horizontal-axis-time
  position: after
concepts:
  - Gantt chart axes
  - tasks vs time on a Gantt chart
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Gantt chart elements: Vertical axis (Tasks) or Horizontal axis (Time)'
validator:
  kind: mapping
  ref: gantt-charts-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: gantt-charts-easy-c3-m1:public
privateValidatorRef: gantt-charts-easy-c3-m1:private
rewardIdentity: gantt-charts-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: gantt-charts-easy-c4-m1
version: 1
scenario: >-
  Each clue describes something a Gantt chart can show. Match it to the theory
  it supports.
theories:
  - id: th-a
    content: Bar position and length show task timing
  - id: th-b
    content: Colors and patterns show task status or dependencies
clues:
  - id: c1
    content: Where a bar starts (left edge) shows when a task begins.
  - id: c2
    content: A different color marks a task as completed, in progress, or not started.
  - id: c3
    content: The length of the bar shows how long the task will take.
  - id: c4
    content: A pattern indicates which tasks must finish before others can begin.
:::

:::mechanic-private
id: gantt-charts-easy-c4-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-a
  c4: th-b
:::

:::mechanic
schemaVersion: 1
id: gantt-charts-easy-c4-m1
version: 1
lessonSlug: gantt-charts-easy
type: evidence-match
tier: Easy
anchor:
  heading: reading-a-gantt-chart-a-visual-example
  position: after
concepts:
  - Gantt chart bar meaning
  - Gantt chart color/pattern meaning
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: gantt-charts-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: gantt-charts-easy-c4-m1:public
privateValidatorRef: gantt-charts-easy-c4-m1:private
rewardIdentity: gantt-charts-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: gantt-charts-easy-c5-m1
version: 1
items:
  - id: i1
    content: >-
      Plan the project by breaking it into tasks, estimating durations, and
      ordering them on a timeline
  - id: i2
    content: >-
      Communicate the plan by sharing the Gantt chart with team members,
      stakeholders, and partners
  - id: i3
    content: >-
      Monitor progress by marking completed tasks and comparing actual time
      against estimates
  - id: i4
    content: Adjust the timeline to reflect delays, scope changes, and new information
:::

:::mechanic-private
id: gantt-charts-easy-c5-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
  - i4
:::

:::mechanic
schemaVersion: 1
id: gantt-charts-easy-c5-m1
version: 1
lessonSlug: gantt-charts-easy
type: sequence-builder
tier: Easy
anchor:
  heading: step-4-adjust-the-timeline
  position: after
concepts:
  - gantt chart lifecycle
  - project management phases
skills:
  - recall
domain: project-management-studies
prompt: How the Gantt chart lifecycle unfolds from beginning to end
validator:
  kind: sequence
  ref: gantt-charts-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: gantt-charts-easy-c5-m1:public
privateValidatorRef: gantt-charts-easy-c5-m1:private
rewardIdentity: gantt-charts-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: gantt-charts-easy-c6-m1
version: 1
question: What does a Gantt bar's length show?
options:
  - id: a
    content: How long a task takes
  - id: b
    content: How many people work on it
  - id: c
    content: Total work hours needed
:::

:::mechanic-private
id: gantt-charts-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: gantt-charts-easy-c6-m1
version: 1
lessonSlug: gantt-charts-easy
type: multiple-choice
tier: Easy
anchor:
  heading: >-
    misconception-5-the-horizontal-bars-represent-how-many-people-are-working-on-a-task
  position: after
concepts:
  - Gantt chart bar meaning
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: gantt-charts-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: gantt-charts-easy-c6-m1:public
privateValidatorRef: gantt-charts-easy-c6-m1:private
rewardIdentity: gantt-charts-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: gantt-charts-easy-c8-m1
version: 1
question: What does a Gantt chart's vertical axis show?
options:
  - id: a
    content: Tasks listed sequentially
  - id: b
    content: Project duration in time
  - id: c
    content: Budget for each task
:::

:::mechanic-private
id: gantt-charts-easy-c8-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: gantt-charts-easy-c8-m1
version: 1
lessonSlug: gantt-charts-easy
type: multiple-choice
tier: Easy
anchor:
  heading: key-takeaways
  position: after
concepts:
  - Gantt chart axes
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: gantt-charts-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: gantt-charts-easy-c8-m1:public
privateValidatorRef: gantt-charts-easy-c8-m1:private
rewardIdentity: gantt-charts-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,8],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"what-is-a-gantt-chart"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"the-horizontal-axis-time"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"reading-a-gantt-chart-a-visual-example"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"step-4-adjust-the-timeline"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-the-horizontal-bars-represent-how-many-people-are-working-on-a-task"},{"mechanicType":"multiple-choice","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"key-takeaways"}]}
:::