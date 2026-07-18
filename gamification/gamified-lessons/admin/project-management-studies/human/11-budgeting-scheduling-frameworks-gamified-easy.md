:::mechanic-data
id: 11-budgeting-scheduling-frameworks-easy-c2-m1
version: 1
categories:
  - id: cat-task
    label: Task
  - id: cat-ms
    label: Milestone
items:
  - id: i1
    content: Build login screen
  - id: i2
    content: Prototype Approved
  - id: i3
    content: Write API endpoint
  - id: i4
    content: Storefront Launched
  - id: i5
    content: Test payment flow
  - id: i6
    content: Design Finalized
:::

:::mechanic-private
id: 11-budgeting-scheduling-frameworks-easy-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-task
  i2: cat-ms
  i3: cat-task
  i4: cat-ms
  i5: cat-task
  i6: cat-ms
:::

:::mechanic
schemaVersion: 1
id: 11-budgeting-scheduling-frameworks-easy-c2-m1
version: 1
lessonSlug: budgeting-scheduling-projects-easy
type: quick-classification
tier: Easy
anchor:
  heading: defining-milestones
  position: after
concepts:
  - Work Packages
  - Milestones
  - Work Breakdown Structure
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the project elements: work task or milestone'
validator:
  kind: mapping
  ref: budgeting-scheduling-projects-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: budgeting-scheduling-projects-easy-c2-m1:public
privateValidatorRef: budgeting-scheduling-projects-easy-c2-m1:private
rewardIdentity: budgeting-scheduling-projects-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-budgeting-scheduling-frameworks-easy-c3-m1
version: 1
scenario: You're estimating a new software feature build using the PERT method.
outputs:
  - id: out1
    label: PERT Weighted Score (O + 4M + P)
    baseValue: 0
    targetMin: 30
    targetMax: 70
sliders:
  - id: s1
    label: Optimistic (O) days
    min: 2
    max: 12
    step: 1
    effects:
      - outputId: out1
        multiplier: 1
  - id: s2
    label: Most Likely (M) days
    min: 4
    max: 14
    step: 1
    effects:
      - outputId: out1
        multiplier: 4
  - id: s3
    label: Pessimistic (P) days
    min: 6
    max: 24
    step: 1
    effects:
      - outputId: out1
        multiplier: 1
cards:
  - id: c1
    label: Insert 2-Day Lag
    effects:
      - outputId: out1
        multiplier: 12
  - id: c2
    label: Apply 1-Day Lead
    effects:
      - outputId: out1
        multiplier: -6
:::

:::mechanic-private
id: 11-budgeting-scheduling-frameworks-easy-c3-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 11-budgeting-scheduling-frameworks-easy-c3-m1
version: 1
lessonSlug: budgeting-scheduling-projects-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: leads-and-lags
  position: after
concepts:
  - PERT three-point estimation
  - Weighted average formula
  - Lead and lag time adjustments
skills:
  - recall
domain: project-management-studies
prompt: >-
  Adjust the PERT estimates and use lead/lag cards so the weighted score falls
  inside the target range (divide by 6 to get the time estimate in days).
validator:
  kind: invariants
  ref: budgeting-scheduling-projects-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: budgeting-scheduling-projects-easy-c3-m1:public
privateValidatorRef: budgeting-scheduling-projects-easy-c3-m1:private
rewardIdentity: budgeting-scheduling-projects-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-budgeting-scheduling-frameworks-easy-c4-m1
version: 1
scenario: >-
  A project manager must choose a cost estimation technique for their current
  project phase.
theories:
  - id: th-a
    content: Analogous Estimating (Top-Down)
  - id: th-b
    content: Bottom-Up Estimating
clues:
  - id: c1
    content: Project is at the proposal stage with almost no detail known yet
  - id: c2
    content: >-
      Manager estimates the cost of every single sub-task in the WBS and adds
      them together
  - id: c3
    content: Used to produce a quick initial ballpark for an executive summary
  - id: c4
    content: >-
      The most accurate method, but very time-intensive and requires a detailed
      WBS
:::

:::mechanic-private
id: 11-budgeting-scheduling-frameworks-easy-c4-m1
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
id: 11-budgeting-scheduling-frameworks-easy-c4-m1
version: 1
lessonSlug: budgeting-scheduling-projects-easy
type: evidence-match
tier: Easy
anchor:
  heading: the-three-standard-budgeting-models
  position: after
concepts:
  - analogous estimating
  - bottom-up estimating
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: budgeting-scheduling-projects-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: budgeting-scheduling-projects-easy-c4-m1:public
privateValidatorRef: budgeting-scheduling-projects-easy-c4-m1:private
rewardIdentity: budgeting-scheduling-projects-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-budgeting-scheduling-frameworks-easy-c5-m1
version: 1
categories:
  - id: cat-responsible
    label: Does work
  - id: cat-accountable
    label: Signs off
items:
  - id: i1
    content: Developer writing code
  - id: i2
    content: Lead approving design
  - id: i3
    content: Programmer building feature
  - id: i4
    content: Manager signing off
  - id: i5
    content: Engineer fixing bugs
  - id: i6
    content: Director approving budget
:::

:::mechanic-private
id: 11-budgeting-scheduling-frameworks-easy-c5-m1
version: 1
kind: mapping
matches:
  i1: cat-responsible
  i2: cat-accountable
  i3: cat-responsible
  i4: cat-accountable
  i5: cat-responsible
  i6: cat-accountable
:::

:::mechanic
schemaVersion: 1
id: 11-budgeting-scheduling-frameworks-easy-c5-m1
version: 1
lessonSlug: budgeting-scheduling-projects-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-raci-matrix
  position: after
concepts:
  - RACI matrix
  - Responsible vs Accountable
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the RACI role examples: Does the work or Signs it off'
validator:
  kind: mapping
  ref: budgeting-scheduling-projects-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: budgeting-scheduling-projects-easy-c5-m1:public
privateValidatorRef: budgeting-scheduling-projects-easy-c5-m1:private
rewardIdentity: budgeting-scheduling-projects-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-budgeting-scheduling-frameworks-easy-c6-m1
version: 1
question: QC focuses on what?
options:
  - id: a
    content: Testing the final deliverable
  - id: b
    content: Preventing defects upfront
  - id: c
    content: Setting project budgets
:::

:::mechanic-private
id: 11-budgeting-scheduling-frameworks-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 11-budgeting-scheduling-frameworks-easy-c6-m1
version: 1
lessonSlug: budgeting-scheduling-projects-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 5-quality-management
  position: after
concepts:
  - Quality Control purpose
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: budgeting-scheduling-projects-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: budgeting-scheduling-projects-easy-c6-m1:public
privateValidatorRef: budgeting-scheduling-projects-easy-c6-m1:private
rewardIdentity: budgeting-scheduling-projects-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-budgeting-scheduling-frameworks-easy-c7-m1
version: 1
sourceDomain: Project Management
targetDomain: Software Engineering
scenario: >-
  Apply the project management principle that quality must be built into the
  process rather than inspected in at the end to the software development
  lifecycle of a new application.
options:
  - id: a
    content: >-
      Embed unit tests, peer code reviews, and continuous integration into every
      stage of development so defects are caught as they arise.
  - id: b
    content: >-
      Finish the full application first, then rely on a dedicated QA team to
      test the completed product and fix any bugs before release.
  - id: c
    content: >-
      Skip formal quality activities during development and address issues only
      after end users report them in production.
:::

:::mechanic-private
id: 11-budgeting-scheduling-frameworks-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 11-budgeting-scheduling-frameworks-easy-c7-m1
version: 1
lessonSlug: budgeting-scheduling-projects-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: misconception-5-quality-is-something-you-check-at-the-end
  position: after
concepts:
  - quality management
  - QA vs QC
  - process design
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: budgeting-scheduling-projects-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: budgeting-scheduling-projects-easy-c7-m1:public
privateValidatorRef: budgeting-scheduling-projects-easy-c7-m1:private
rewardIdentity: budgeting-scheduling-projects-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"defining-milestones"},{"mechanicType":"parameter-tuner","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"leads-and-lags"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"the-three-standard-budgeting-models"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"the-raci-matrix"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"5-quality-management"},{"mechanicType":"abstract-transfer","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-quality-is-something-you-check-at-the-end"}]}
:::