:::mechanic-data
id: 02-building-delegable-business-systems-easy-c2-m1
version: 1
question: What makes a real business?
options:
  - id: a
    content: Runs without you
  - id: b
    content: Needs your daily presence
  - id: c
    content: Stops when you rest
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c2-m1
version: 1
lessonSlug: building-business-systems-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-fundamental-truth-about-business-ownership
  position: after
concepts:
  - self-sustaining business
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: building-business-systems-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: building-business-systems-easy-c2-m1:public
privateValidatorRef: building-business-systems-easy-c2-m1:private
rewardIdentity: building-business-systems-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c3-m1
version: 1
categories:
  - id: cat-a
    label: System
  - id: cat-b
    label: Chaos
items:
  - id: i1
    content: Repeatable process
  - id: i2
    content: Random outcome
  - id: i3
    content: Clear goal
  - id: i4
    content: Isolated activity
  - id: i5
    content: Consistent results
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
  i5: cat-a
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c3-m1
version: 1
lessonSlug: building-business-systems-easy
type: quick-classification
tier: Easy
anchor:
  heading: what-is-a-system-formal-definition
  position: after
concepts:
  - formal definition of a system
  - system characteristics
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort the system traits: System or Chaos'
validator:
  kind: mapping
  ref: building-business-systems-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: building-business-systems-easy-c3-m1:public
privateValidatorRef: building-business-systems-easy-c3-m1:private
rewardIdentity: building-business-systems-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c4-m1
version: 1
scenario: Match each clue to the theory it supports about how the business is run.
theories:
  - id: th-a
    content: The business depends too much on the owner's head.
  - id: th-b
    content: The business relies on documented, repeatable systems.
clues:
  - id: c1
    content: Only one person knows how key work gets done.
  - id: c2
    content: Processes are written down so others can follow them.
  - id: c3
    content: If the owner takes time off, the business struggles.
  - id: c4
    content: Knowledge is stored outside the owner's memory.
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c4-m1
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
id: 02-building-delegable-business-systems-easy-c4-m1
version: 1
lessonSlug: building-business-systems-easy
type: evidence-match
tier: Easy
anchor:
  heading: you-are-not-the-system
  position: after
concepts:
  - documented systems
  - owner dependency
skills:
  - recall
domain: business-systems-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: building-business-systems-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: building-business-systems-easy-c4-m1:public
privateValidatorRef: building-business-systems-easy-c4-m1:private
rewardIdentity: building-business-systems-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c5-m1
version: 1
items:
  - id: i1
    content: System
  - id: i2
    content: Sub-system
  - id: i3
    content: Process
  - id: i4
    content: Task
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c5-m1
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
id: 02-building-delegable-business-systems-easy-c5-m1
version: 1
lessonSlug: building-business-systems-easy
type: sequence-builder
tier: Easy
anchor:
  heading: the-hierarchy-systems-sub-systems-processes-tasks
  position: after
concepts:
  - business operations hierarchy
skills:
  - recall
domain: business-systems-studies
prompt: How a business operation breaks down from highest level to individual work
validator:
  kind: sequence
  ref: building-business-systems-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: building-business-systems-easy-c5-m1:public
privateValidatorRef: building-business-systems-easy-c5-m1:private
rewardIdentity: building-business-systems-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c6-m1
version: 1
scenario: Tune a business task so its score table supports delegation.
outputs:
  - id: frequency
    label: Frequency
    baseValue: 1
    targetMin: 4
    targetMax: 5
  - id: annoying
    label: Annoying
    baseValue: 1
    targetMin: 3
    targetMax: 5
  - id: impact
    label: Impact
    baseValue: 1
    targetMin: 3
    targetMax: 5
  - id: simplicity
    label: Simplicity
    baseValue: 1
    targetMin: 4
    targetMax: 5
  - id: delegationScore
    label: Delegation Priority Score
    baseValue: 1
    targetMin: 3.5
    targetMax: 5
sliders:
  - id: repeatLevel
    label: How often it happens
    min: 0
    max: 4
    step: 1
    effects:
      - outputId: frequency
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
  - id: frustrationLevel
    label: How annoying it feels
    min: 0
    max: 4
    step: 1
    effects:
      - outputId: annoying
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
  - id: importanceLevel
    label: How important it is
    min: 0
    max: 4
    step: 1
    effects:
      - outputId: impact
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
  - id: explainabilityLevel
    label: How easy it is to explain
    min: 0
    max: 4
    step: 1
    effects:
      - outputId: simplicity
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
cards:
  - id: dailyTask
    label: Daily task
    effects:
      - outputId: frequency
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
  - id: routineSteps
    label: Routine steps
    effects:
      - outputId: simplicity
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
  - id: businessCritical
    label: Business-critical
    effects:
      - outputId: impact
        multiplier: 1
      - outputId: delegationScore
        multiplier: 0.25
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c6-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c6-m1
version: 1
lessonSlug: building-business-systems-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: step-1-brain-dump-and-create-a-score-table
  position: after
concepts:
  - Delegation Priority Score
  - Frequency
  - Annoying
  - Impact
  - Simplicity
skills:
  - recall
domain: business-systems-studies
prompt: >-
  Adjust the task factors so the score table shows a strong delegation
  candidate.
validator:
  kind: invariants
  ref: building-business-systems-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: building-business-systems-easy-c6-m1:public
privateValidatorRef: building-business-systems-easy-c6-m1:private
rewardIdentity: building-business-systems-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c7-m1
version: 1
categories:
  - id: cat-a
    label: Automate
  - id: cat-b
    label: Delegate
items:
  - id: i1
    content: tool can handle it
  - id: i2
    content: someone else at 80%
  - id: i3
    content: remove manual action
  - id: i4
    content: important but annoying
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c7-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c7-m1
version: 1
lessonSlug: building-business-systems-easy
type: quick-classification
tier: Easy
anchor:
  heading: step-2-decide-delete-automate-or-delegate
  position: after
concepts:
  - automate vs delegate
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort the task cues: Automate or Delegate'
validator:
  kind: mapping
  ref: building-business-systems-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: building-business-systems-easy-c7-m1:public
privateValidatorRef: building-business-systems-easy-c7-m1:private
rewardIdentity: building-business-systems-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c8-m1
version: 1
scenario: >-
  You are documenting a task you want to delegate, but the ideal long-term owner
  is not on your team yet.
options:
  - id: a
    content: >-
      List the Current Owner as who does it now and the Ideal Owner as the role
      that should own it permanently, even if that role has not been hired yet.
    pros:
      - shows who handles the task right now
      - creates a clear long-term ownership target
      - makes hiring or transition needs visible
    cons: []
  - id: b
    content: >-
      List the same current person for both Current Owner and Ideal Owner until
      the team changes later.
    pros:
      - keeps the record simple
    cons:
      - does not show the intended permanent owner
      - can hide a future hiring need
  - id: c
    content: >-
      Fill in the Current Owner, but leave the Ideal Owner blank until the right
      person exists.
    pros:
      - avoids naming a role before it exists
    cons:
      - does not provide a clear hiring roadmap
      - leaves the future transition unclear
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c8-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c8-m1
version: 1
lessonSlug: building-business-systems-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: step-3-determine-current-owner-vs-ideal-owner
  position: after
concepts:
  - current owner vs ideal owner
  - hiring and transition roadmap
skills:
  - recall
domain: business-systems-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: building-business-systems-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: building-business-systems-easy-c8-m1:public
privateValidatorRef: building-business-systems-easy-c8-m1:private
rewardIdentity: building-business-systems-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c9-m1
version: 1
attributes:
  - id: stepCoverage
    label: Step Coverage
  - id: qualityControl
    label: Quality Control
components:
  - id: c1
    content: >-
      Checklist of individual tasks — breaks the process into its smallest
      logical steps
    metrics:
      stepCoverage: 4
      qualityControl: 1
  - id: c2
    content: >-
      Requirements — states the standards, quality levels, or constraints that
      must be met
    metrics:
      stepCoverage: 1
      qualityControl: 4
  - id: c3
    content: Validations — shows how to confirm the task was completed correctly
    metrics:
      stepCoverage: 1
      qualityControl: 4
  - id: c4
    content: Templates — provides the documents, forms, and formats used repeatedly
    metrics:
      stepCoverage: 2
      qualityControl: 2
requirements:
  - attributeId: stepCoverage
    operator: '>='
    value: 5
  - attributeId: qualityControl
    operator: '>='
    value: 6
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c9-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c9-m1
version: 1
lessonSlug: building-business-systems-easy
type: constraint-construction
tier: Easy
anchor:
  heading: step-4-document-before-you-delegate
  position: after
concepts:
  - documenting tasks before delegation
  - including requirements and validations in documentation
skills:
  - recall
domain: business-systems-studies
prompt: Select documentation components that meet all constraints.
validator:
  kind: invariants
  ref: building-business-systems-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: building-business-systems-easy-c9-m1:public
privateValidatorRef: building-business-systems-easy-c9-m1:private
rewardIdentity: building-business-systems-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c10-m1
version: 1
scenario: >-
  A business owner has delegated key processes and now needs to decide how to
  keep those systems useful over time.
startNodeId: n1
nodes:
  - id: n1
    question: What should the owner do first after delegation?
    options:
      - id: a1
        content: >-
          Review and update the documented systems periodically as conditions
          and tools change
        nextNodeId: n2
      - id: b1
        content: >-
          Leave the systems alone permanently because delegation means they no
          longer need attention
        nextNodeId: null
      - id: c1
        content: Stop documenting processes once someone else is handling them
        nextNodeId: null
  - id: n2
    question: >-
      If the owner does not want to manage the systems personally, what happens
      next?
    options:
      - id: a2
        content: >-
          Hire a Digital Business Manager to manage projects, systems, teams,
          and processes while the owner oversees
        nextNodeId: null
      - id: b2
        content: Return to managing every process detail personally
        nextNodeId: null
      - id: c2
        content: Let the systems run without any manager or oversight
        nextNodeId: null
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c10-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c10-m1
version: 1
lessonSlug: building-business-systems-easy
type: prediction
tier: Easy
anchor:
  heading: step-5-after-delegation-maintain-and-evolve
  position: after
concepts:
  - updating delegated systems periodically
  - Digital Business Manager oversight role
skills:
  - recall
domain: business-systems-studies
prompt: How does the post-delegation systems scenario play out?
validator:
  kind: exact
  ref: building-business-systems-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: building-business-systems-easy-c10-m1:public
privateValidatorRef: building-business-systems-easy-c10-m1:private
rewardIdentity: building-business-systems-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c11-m1
version: 1
scenario: >-
  A manufacturing system works when inputs are ready, the process produces
  finished products, and feedback is being tracked. Use the controls to bring
  each part of the system up to its target.
maxTurns: 8
variables:
  - id: v1
    name: Inputs Ready
    initialValue: 40
    targetValue: 80
    min: 0
    max: 100
  - id: v2
    name: Outputs Ready
    initialValue: 25
    targetValue: 70
    min: 0
    max: 100
  - id: v3
    name: Feedback Tracking
    initialValue: 20
    targetValue: 60
    min: 0
    max: 100
controls:
  - id: c1
    type: button
    label: Load Raw Materials
    effects:
      - variableId: v1
        delta: 20
  - id: c2
    type: slider
    label: Set Assembly Pace
    bindsTo: v2
    min: 0
    max: 100
    step: 5
  - id: c3
    type: button
    label: Package Finished Products
    effects:
      - variableId: v2
        delta: 15
  - id: c4
    type: button
    label: Review Quality Reports
    effects:
      - variableId: v3
        delta: 20
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c11-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c11-m1
version: 1
lessonSlug: building-business-systems-easy
type: system-simulation
tier: Easy
anchor:
  heading: the-system-as-a-machine-input-process-output-feedback
  position: after
concepts:
  - inputs-processes-outputs-feedback loop
  - manufacturing system
skills:
  - recall
domain: business-systems-studies
prompt: Tune the manufacturing system so it produces results.
validator:
  kind: invariants
  ref: building-business-systems-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 3
publicPayloadRef: building-business-systems-easy-c11-m1:public
privateValidatorRef: building-business-systems-easy-c11-m1:private
rewardIdentity: building-business-systems-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c12-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Check sales and analytics
  - id: s2
    isMissing: true
  - id: s3
    content: Hear team and customer views
  - id: s4
    isMissing: true
  - id: s5
    content: Refine the system
options:
  - id: o1
    content: Data feedback
  - id: o2
    content: Human feedback
  - id: o3
    content: Ignore complaints
  - id: o4
    content: Launch a new product
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c12-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c12-m1
version: 1
lessonSlug: building-business-systems-easy
type: missing-step
tier: Easy
anchor:
  heading: why-the-feedback-loop-is-the-missing-piece
  position: after
concepts:
  - data feedback
  - human feedback
skills:
  - recall
domain: business-systems-studies
prompt: What's missing from the feedback loop process?
validator:
  kind: mapping
  ref: building-business-systems-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: building-business-systems-easy-c12-m1:public
privateValidatorRef: building-business-systems-easy-c12-m1:private
rewardIdentity: building-business-systems-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c13-m1
version: 1
scenario: Simple and direct.
theories:
  - id: th-a
    content: >-
      The owner must stay personally in control of most work, and systems matter
      less.
  - id: th-b
    content: >-
      Businesses grow through delegation, updated systems, and feedback-driven
      control.
clues:
  - id: c1
    content: You do not need 100% perfection. You need consistent 80% adequacy.
  - id: c2
    content: >-
      If a process was documented two years ago and never reviewed, it is likely
      outdated.
  - id: c3
    content: Delegation means losing control unless the owner watches every action.
  - id: c4
    content: >-
      Small businesses can rely on the owner's effort instead of repeatable
      systems.
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c13-m1
version: 1
kind: mapping
matches:
  c1: th-b
  c2: th-b
  c3: th-a
  c4: th-a
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c13-m1
version: 1
lessonSlug: building-business-systems-easy
type: evidence-match
tier: Easy
anchor:
  heading: misconception-5-feedback-loops-are-optional
  position: after
concepts:
  - common misconceptions about delegation and systems
skills:
  - recall
domain: business-systems-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: building-business-systems-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: building-business-systems-easy-c13-m1:public
privateValidatorRef: building-business-systems-easy-c13-m1:private
rewardIdentity: building-business-systems-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-building-delegable-business-systems-easy-c14-m1
version: 1
sourceDomain: Business process delegation and scaling
targetDomain: Systems engineering
scenario: >-
  A systems engineering team wants one lead engineer to stop personally handling
  every workflow step and instead build a repeatable team process. Which
  transfer best applies the lesson's core principles?
options:
  - id: a
    content: >-
      Define the workflow with clear inputs, process steps, outputs, and a
      feedback loop, then document it before handing parts of it to others.
  - id: b
    content: >-
      Keep the workflow centered on the lead engineer's direct involvement,
      since quality depends on the person doing each step personally.
  - id: c
    content: >-
      Document the final output standards, but leave the process and feedback
      details flexible so each team member can figure them out independently.
:::

:::mechanic-private
id: 02-building-delegable-business-systems-easy-c14-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 02-building-delegable-business-systems-easy-c14-m1
version: 1
lessonSlug: building-business-systems-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: question-5
  position: after
concepts:
  - input-process-output-feedback model
  - process documentation before delegation
  - scalable ownership
skills:
  - recall
domain: business-systems-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: building-business-systems-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: building-business-systems-easy-c14-m1:public
privateValidatorRef: building-business-systems-easy-c14-m1:private
rewardIdentity: building-business-systems-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,14],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"the-fundamental-truth-about-business-ownership"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"what-is-a-system-formal-definition"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"you-are-not-the-system"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"the-hierarchy-systems-sub-systems-processes-tasks"},{"mechanicType":"parameter-tuner","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"step-1-brain-dump-and-create-a-score-table"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"step-2-decide-delete-automate-or-delegate"},{"mechanicType":"tradeoff-decision","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"step-3-determine-current-owner-vs-ideal-owner"},{"mechanicType":"constraint-construction","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"step-4-document-before-you-delegate"},{"mechanicType":"prediction","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"step-5-after-delegation-maintain-and-evolve"},{"mechanicType":"system-simulation","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"the-system-as-a-machine-input-process-output-feedback"},{"mechanicType":"missing-step","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"why-the-feedback-loop-is-the-missing-piece"},{"mechanicType":"evidence-match","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-feedback-loops-are-optional"},{"mechanicType":"abstract-transfer","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"question-5"}]}
:::