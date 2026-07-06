---
type: gamified-lesson-mechanics
lesson_slug: agile-project-management-easy
domain: project-management-studies
---

:::mechanic-data
id: agile-project-management-easy-c2-m1
version: 1
question: What are Agile's iterative cycles called?
options:
  - id: a
    content: Sprints
  - id: b
    content: Phases
  - id: c
    content: Milestones
:::

:::mechanic-private
id: agile-project-management-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c2-m1
version: 1
lessonSlug: agile-project-management-easy
type: multiple-choice
tier: Easy
anchor:
  heading: what-is-agile-project-management
  position: after
concepts:
  - Agile sprints
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-project-management-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-project-management-easy-c2-m1:public
privateValidatorRef: agile-project-management-easy-c2-m1:private
rewardIdentity: agile-project-management-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c3-m1
version: 1
categories:
  - id: cat-sprint
    label: Sprint
  - id: cat-feature
    label: Feature
items:
  - id: i1
    content: Sprint
  - id: i2
    content: 4-12 week timebox
  - id: i3
    content: Block of work
  - id: i4
    content: Feature
  - id: i5
    content: Item
  - id: i6
    content: Business value
shuffle: true
:::

:::mechanic-private
id: agile-project-management-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-sprint
  i2: cat-sprint
  i3: cat-sprint
  i4: cat-feature
  i5: cat-feature
  i6: cat-feature
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c3-m1
version: 1
lessonSlug: agile-project-management-easy
type: quick-classification
tier: Easy
anchor:
  heading: block
  position: after
concepts:
  - Sprint definition
  - Feature/Item definition
  - Block as Sprint subunit
  - Feature as business value deliverable
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Agile PM terms: Sprint concept or Feature concept'
validator:
  kind: mapping
  ref: agile-project-management-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-project-management-easy-c3-m1:public
privateValidatorRef: agile-project-management-easy-c3-m1:private
rewardIdentity: agile-project-management-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c4-m1
version: 1
scenario: >-
  Your team is starting a new product project where business needs are expected
  to shift frequently and stakeholders want to see usable value early. Choose
  the project management approach that best fits this situation.
options:
  - id: a
    content: Traditional (Waterfall) PM
    pros:
      - Linear sequence provides clear structure and phases
      - All requirements documented upfront before development
      - Final product delivered as one complete unit
    cons:
      - No tangible value is delivered until the entire project is finished
      - Late changes or mistakes are expensive and time-consuming to fix
      - Cannot easily adapt to changing business needs mid-project
  - id: b
    content: Agile PM
    pros:
      - Delivers value incrementally through short Sprints
      - >-
        Focuses on what the business needs now rather than what was planned
        months ago
      - New or changed requirements can be accommodated in following Sprints
      - >-
        Continuous delivery keeps stakeholders engaged and provides early
        feedback
    cons:
      - Requires ongoing stakeholder involvement throughout the project
      - Final scope and timeline are less predictable
:::

:::mechanic-private
id: agile-project-management-easy-c4-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c4-m1
version: 1
lessonSlug: agile-project-management-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: agile-pm-approach
  position: after
concepts:
  - traditional PM vs Agile PM
  - iterative delivery of value
  - adaptability to changing requirements
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-project-management-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-project-management-easy-c4-m1:public
privateValidatorRef: agile-project-management-easy-c4-m1:private
rewardIdentity: agile-project-management-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c6-m1
version: 1
scenario: >-
  Decide whether each project clue points to an Agile approach or a traditional
  Waterfall approach.
theories:
  - id: th-a
    content: Agile methodology
  - id: th-b
    content: Waterfall methodology
clues:
  - id: c1
    content: Work is broken into 4-12 week sprints
  - id: c2
    content: Heavy, upfront written documentation is required before work begins
  - id: c3
    content: Verbal communication and face-to-face collaboration are preferred
  - id: c4
    content: Requirements are frozen at the start and changes are resisted
:::

:::mechanic-private
id: agile-project-management-easy-c6-m1
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
id: agile-project-management-easy-c6-m1
version: 1
lessonSlug: agile-project-management-easy
type: evidence-match
tier: Easy
anchor:
  heading: flexibility
  position: after
concepts:
  - Agile project characteristics
  - Agile vs Waterfall
skills:
  - recall
domain: project-management-studies
prompt: Which methodology do these clues support?
validator:
  kind: mapping
  ref: agile-project-management-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-project-management-easy-c6-m1:public
privateValidatorRef: agile-project-management-easy-c6-m1:private
rewardIdentity: agile-project-management-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c8-m1
version: 1
items:
  - id: i1
    content: Envision
  - id: i2
    content: Plan
  - id: i3
    content: Explore/Create
  - id: i4
    content: Adapt
  - id: i5
    content: Close
:::

:::mechanic-private
id: agile-project-management-easy-c8-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
  - i4
  - i5
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c8-m1
version: 1
lessonSlug: agile-project-management-easy
type: sequence-builder
tier: Easy
anchor:
  heading: the-five-stage-agile-methodology
  position: after
concepts:
  - Agile methodology stages
skills:
  - recall
domain: project-management-studies
prompt: How the five-stage Agile methodology unfolds from start to finish
validator:
  kind: sequence
  ref: agile-project-management-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-project-management-easy-c8-m1:public
privateValidatorRef: agile-project-management-easy-c8-m1:private
rewardIdentity: agile-project-management-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c9-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Define project objective
  - id: s2
    isMissing: true
  - id: s3
    content: Establish team norms
  - id: s4
    isMissing: true
options:
  - id: o1
    content: Set project boundaries
  - id: o2
    content: Produce Project Charter
  - id: o3
    content: Hire new employees
  - id: o4
    content: Close the project
:::

:::mechanic-private
id: agile-project-management-easy-c9-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c9-m1
version: 1
lessonSlug: agile-project-management-easy
type: missing-step
tier: Easy
anchor:
  heading: products-of-this-stage
  position: after
concepts:
  - Envision stage workflow
  - Project Charter creation
skills:
  - recall
domain: project-management-studies
prompt: What's missing from the Envision stage process?
validator:
  kind: mapping
  ref: agile-project-management-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-project-management-easy-c9-m1:public
privateValidatorRef: agile-project-management-easy-c9-m1:private
rewardIdentity: agile-project-management-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c10-m1
version: 1
scenario: >-
  Your team is preparing the project delivery plan for an 8-week Item, balancing
  the Item list, estimates, iteration plan, and risks.
outputs:
  - id: out1
    label: Sprint Requirements Clarity
    baseValue: 20
    targetMin: 50
    targetMax: 100
  - id: out2
    label: Estimation Accuracy
    baseValue: 15
    targetMin: 40
    targetMax: 90
  - id: out3
    label: Iteration Plan Completeness
    baseValue: 10
    targetMin: 35
    targetMax: 85
  - id: out4
    label: Risk Coverage
    baseValue: 10
    targetMin: 30
    targetMax: 80
sliders:
  - id: s1
    label: Item List Creation & Prioritization
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 6
  - id: s2
    label: Estimation Effort (Time & Cost)
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 5
  - id: s3
    label: Iteration Planning Detail
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out3
        multiplier: 6
  - id: s4
    label: Risk Analysis Depth
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out4
        multiplier: 5
cards:
  - id: c1
    label: Stakeholder Review of Features
    effects:
      - outputId: out1
        multiplier: 10
  - id: c2
    label: Cross-team Estimation Sync
    effects:
      - outputId: out2
        multiplier: 10
:::

:::mechanic-private
id: agile-project-management-easy-c10-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c10-m1
version: 1
lessonSlug: agile-project-management-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: products-of-this-stage
  position: after
concepts:
  - Plan stage activities
  - Sprint requirements
  - Effort estimation
  - Iteration planning
  - Risk analysis
skills:
  - recall
domain: project-management-studies
prompt: Tune the Plan stage activities so every output lands within its target range.
validator:
  kind: invariants
  ref: agile-project-management-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-project-management-easy-c10-m1:public
privateValidatorRef: agile-project-management-easy-c10-m1:private
rewardIdentity: agile-project-management-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c11-m1
version: 1
scenario: >-
  Your team is in the Explore/Create stage. Daily meetings are dragging past 45
  minutes, the Item Board hasn't been refreshed in days, and the team keeps
  getting stuck. What's going wrong?
symptoms:
  - >-
    Daily meetings frequently exceed 30 minutes and turn into problem-solving
    sessions
  - The Item Board is rarely updated and team members lose track of progress
diagnoses:
  - id: d1
    content: >-
      The PM is acting as a problem-solver in daily meetings instead of
      observing and unblocking the team
  - id: d2
    content: The team has too few members to execute the planned work
  - id: d3
    content: Sprint planning underestimated the work scope of the project
parameters:
  - id: p1
    label: PM Problem-Solving in Meetings
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Item Board Update Frequency
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Daily Meeting Length
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: agile-project-management-easy-c11-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: <=
    targetValue: 25
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c11-m1
version: 1
lessonSlug: agile-project-management-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: products-of-this-stage
  position: after
concepts:
  - Explore/Create stage responsibilities
  - Role of the Project Manager in daily meetings
  - Item Board tracking and progress visibility
skills:
  - recall
domain: project-management-studies
prompt: >-
  Diagnose why the Explore/Create stage is breaking down and adjust the controls
  to fix it.
validator:
  kind: invariants
  ref: agile-project-management-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: agile-project-management-easy-c11-m1:public
privateValidatorRef: agile-project-management-easy-c11-m1:private
rewardIdentity: agile-project-management-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c12-m1
version: 1
scenario: >-
  You've finished a Sprint and entered the Adapt stage. Push Review Quality,
  Team Morale, and Lessons Logged toward their targets without running out of
  turns.
maxTurns: 8
variables:
  - id: v1
    name: Review Quality
    initialValue: 30
    targetValue: 80
    min: 0
    max: 100
  - id: v2
    name: Team Morale
    initialValue: 40
    targetValue: 70
    min: 0
    max: 100
  - id: v3
    name: Lessons Logged
    initialValue: 20
    targetValue: 60
    min: 0
    max: 100
controls:
  - id: c1
    type: button
    label: Test Product
    effects:
      - variableId: v1
        delta: 12
  - id: c2
    type: button
    label: Team Meeting
    effects:
      - variableId: v3
        delta: 10
  - id: c3
    type: button
    label: Investor Sync
    effects:
      - variableId: v2
        delta: 8
  - id: c4
    type: button
    label: Team Celebration
    effects:
      - variableId: v2
        delta: 10
:::

:::mechanic-private
id: agile-project-management-easy-c12-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c12-m1
version: 1
lessonSlug: agile-project-management-easy
type: system-simulation
tier: Easy
anchor:
  heading: continuous-cycle
  position: after
concepts:
  - Adapt stage
  - Sprint review
  - team morale
  - lessons learned
skills:
  - recall
domain: project-management-studies
prompt: Run the Adapt stage and bring its deliverables to target.
validator:
  kind: invariants
  ref: agile-project-management-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 3
publicPayloadRef: agile-project-management-easy-c12-m1:public
privateValidatorRef: agile-project-management-easy-c12-m1:private
rewardIdentity: agile-project-management-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c13-m1
version: 1
items:
  - id: i1
    content: >-
      Final Delivery: ensure all items are delivered, administrative functions
      are complete, and debts and payments are settled
  - id: i2
    content: >-
      Communication of Results: efficiently communicate the benefits of the
      project to the team and investors
  - id: i3
    content: >-
      Final Meeting (Retrospective): hold a meeting to expose lessons learned
      and appreciate what was achieved
  - id: i4
    content: >-
      Team Release: release the team or assign them to other functions in other
      projects
:::

:::mechanic-private
id: agile-project-management-easy-c13-m1
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
id: agile-project-management-easy-c13-m1
version: 1
lessonSlug: agile-project-management-easy
type: sequence-builder
tier: Easy
anchor:
  heading: closing-activities
  position: after
concepts:
  - project close phase activities
skills:
  - recall
domain: project-management-studies
prompt: How the project Close stage unfolds from final delivery to team release
validator:
  kind: sequence
  ref: agile-project-management-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-project-management-easy-c13-m1:public
privateValidatorRef: agile-project-management-easy-c13-m1:private
rewardIdentity: agile-project-management-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-project-management-easy-c14-m1
version: 1
attributes:
  - id: sprintFit
    label: Sprint Suitability
  - id: timeHorizon
    label: Delivery Time (months)
components:
  - id: c1
    content: >-
      Marketing technique development — create campaigns and promotional
      strategies for an upcoming product launch
    metrics:
      sprintFit: 9
      timeHorizon: 2
  - id: c2
    content: >-
      Employee reorganization — restructure teams and redefine roles across
      departments over a fiscal year
    metrics:
      sprintFit: 3
      timeHorizon: 9
  - id: c3
    content: >-
      Software product development — build a platform with features that may
      evolve based on user feedback
    metrics:
      sprintFit: 8
      timeHorizon: 4
  - id: c4
    content: >-
      Annual compliance audit — perform a yearly regulatory review that follows
      a fixed checklist
    metrics:
      sprintFit: 2
      timeHorizon: 12
requirements:
  - attributeId: sprintFit
    operator: '>='
    value: 7
    description: Sprint suitability score must be high
  - attributeId: timeHorizon
    operator: <=
    value: 6
    description: Delivery time must be short or medium term
:::

:::mechanic-private
id: agile-project-management-easy-c14-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: agile-project-management-easy-c14-m1
version: 1
lessonSlug: agile-project-management-easy
type: constraint-construction
tier: Easy
anchor:
  heading: hybrid-projects
  position: after
concepts:
  - Agile project characteristics
  - Project suitability for Agile
skills:
  - recall
domain: project-management-studies
prompt: Select the projects that meet the Agile suitability constraints.
validator:
  kind: invariants
  ref: agile-project-management-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: agile-project-management-easy-c14-m1:public
privateValidatorRef: agile-project-management-easy-c14-m1:private
rewardIdentity: agile-project-management-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,6,8,9,10,11,12,13,14],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"what-is-agile-project-management"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"block"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"agile-pm-approach"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"flexibility"},{"mechanicType":"sequence-builder","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"the-five-stage-agile-methodology"},{"mechanicType":"missing-step","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"products-of-this-stage"},{"mechanicType":"parameter-tuner","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"products-of-this-stage"},{"mechanicType":"diagnostic-lab","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"products-of-this-stage"},{"mechanicType":"system-simulation","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"continuous-cycle"},{"mechanicType":"sequence-builder","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"closing-activities"},{"mechanicType":"constraint-construction","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"hybrid-projects"}]}
:::