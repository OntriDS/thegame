---
type: gamified-lesson-mechanics
lesson_slug: project-management-12-steps-easy
domain: project-management-studies
---

:::mechanic-data
id: project-management-12-steps-easy-c3-m1
version: 1
scenario: >-
  A boutique bakery wants a new e-commerce website to showcase their brand and
  take online orders. They mention they want it to 'wow' customers, but their
  budget is limited and they hope to launch before the holiday season. Which
  driver should be the primary priority?
options:
  - id: a
    content: Prioritize Quality
    pros:
      - delivers a polished site that reflects the bakery's brand
      - creates a strong first impression for new customers
      - reduces rework after launch
    cons:
      - takes longer to build
      - costs more than a basic site
  - id: b
    content: Prioritize Time
    pros:
      - site is ready before the holiday rush
      - lets the bakery start selling sooner
    cons:
      - less time for design refinement
      - may exceed the original budget to hit the deadline
      - likely to need fixes after launch
  - id: c
    content: Prioritize Budget
    pros:
      - stays within what the client can afford
      - low financial risk for a small business
    cons:
      - may miss the holiday launch window
      - limited customization weakens the brand experience
:::

:::mechanic-private
id: project-management-12-steps-easy-c3-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 1
hints:
  a: >-
    The client specifically said the site should 'wow' customers — this is a
    strong signal that quality drives their decision.
  b: >-
    Speed is tempting, but a rushed site that misrepresents the brand may hurt
    sales more than a short delay would.
  c: >-
    A tight budget is real, but pinning money as the primary driver can force
    quality and timing compromises that hurt the business.
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c3-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: the-two-meeting-approach
  position: after
concepts:
  - project drivers
  - primary driver selection
  - quality vs money vs time tradeoffs
skills:
  - recall
domain: project-management-studies
prompt: Choose which driver to make the primary priority for the project.
validator:
  kind: rubric
  ref: project-management-12-steps-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: project-management-12-steps-easy-c3-m1:public
privateValidatorRef: project-management-12-steps-easy-c3-m1:private
rewardIdentity: project-management-12-steps-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c4-m1
version: 1
categories:
  - id: method
    label: Task Method
  - id: issue
    label: WBS Issue
items:
  - id: i1
    content: Brainstorming
  - id: i2
    content: WBS diagram
  - id: i3
    content: Expert consultation
  - id: i4
    content: Too low detail
  - id: i5
    content: Too high detail
:::

:::mechanic-private
id: project-management-12-steps-easy-c4-m1
version: 1
kind: mapping
matches:
  i1: method
  i2: method
  i3: method
  i4: issue
  i5: issue
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c4-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: quick-classification
tier: Easy
anchor:
  heading: granularity-finding-the-right-level-of-detail
  position: after
concepts:
  - task list creation methods
  - WBS granularity
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the task planning concepts: Task Method or WBS Issue'
validator:
  kind: mapping
  ref: project-management-12-steps-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-12-steps-easy-c4-m1:public
privateValidatorRef: project-management-12-steps-easy-c4-m1:private
rewardIdentity: project-management-12-steps-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c5-m1
version: 1
question: What probability level should you use?
options:
  - id: a
    content: 75%
  - id: b
    content: 50%
  - id: c
    content: 100%
:::

:::mechanic-private
id: project-management-12-steps-easy-c5-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c5-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-75-contingency-margin
  position: after
concepts:
  - 75% probability level for estimates
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: project-management-12-steps-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-12-steps-easy-c5-m1:public
privateValidatorRef: project-management-12-steps-easy-c5-m1:private
rewardIdentity: project-management-12-steps-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c6-m1
version: 1
scenario: Match each clue to the PERT Chart task type it describes.
theories:
  - id: th-a
    content: Critical Path
  - id: th-b
    content: Floating Tasks
clues:
  - id: c1
    content: Cannot be delayed without affecting the overall deadline
  - id: c2
    content: Can be delayed slightly without jeopardizing the project
  - id: c3
    content: Longest path that determines the total project duration
  - id: c4
    content: Provides flexibility in scheduling
:::

:::mechanic-private
id: project-management-12-steps-easy-c6-m1
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
id: project-management-12-steps-easy-c6-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: evidence-match
tier: Easy
anchor:
  heading: floating-tasks-explained
  position: after
concepts:
  - Critical Path
  - Floating Tasks
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: project-management-12-steps-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-12-steps-easy-c6-m1:public
privateValidatorRef: project-management-12-steps-easy-c6-m1:private
rewardIdentity: project-management-12-steps-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c7-m1
version: 1
scenario: >-
  Your software project is 3 weeks behind the client's desired deadline. You
  need to choose an approach to shorten the timeline while keeping the plan
  realistic.
options:
  - id: a
    content: Add more developers and resources to the longest critical path tasks
    pros:
      - directly shortens the tasks that drive the end date
      - preserves product quality and reliability
    cons:
      - significantly increases project cost
  - id: b
    content: Cut testing time and reduce quality assurance depth
    pros:
      - no additional cost required
    cons:
      - risks product reliability and defects
      - may require expensive rework later
      - hurts team morale and pride in work
  - id: c
    content: Run development and testing phases in parallel instead of sequentially
    pros:
      - no extra cost
      - shortens the timeline without reducing quality
    cons:
      - requires careful coordination
      - may expose hidden dependencies between tasks
:::

:::mechanic-private
id: project-management-12-steps-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 4
  c: 2
  b: 1
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c7-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: how-to-shorten-time
  position: after
concepts:
  - time-money tradeoff
  - critical path shortening
  - plan compression strategies
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: project-management-12-steps-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: project-management-12-steps-easy-c7-m1:public
privateValidatorRef: project-management-12-steps-easy-c7-m1:private
rewardIdentity: project-management-12-steps-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c8-m1
version: 1
items:
  - id: i1
    content: Set the timeline (or budget baseline)
  - id: i2
    content: Mark the critical path and establish scaling
  - id: i3
    content: Plot floating tasks according to their flexibility
:::

:::mechanic-private
id: project-management-12-steps-easy-c8-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c8-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: sequence-builder
tier: Easy
anchor:
  heading: drawing-the-gantt-chart
  position: after
concepts:
  - Gantt Chart construction steps
skills:
  - recall
domain: project-management-studies
prompt: How drawing a Gantt Chart unfolds from start to finish
validator:
  kind: sequence
  ref: project-management-12-steps-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: project-management-12-steps-easy-c8-m1:public
privateValidatorRef: project-management-12-steps-easy-c8-m1:private
rewardIdentity: project-management-12-steps-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c9-m1
version: 1
scenario: >-
  You are building a resource baseline for a project while drafting its Gantt
  chart.
outputs:
  - id: out1
    label: Cost Coverage ($k)
    baseValue: 10
    targetMin: 40
    targetMax: 80
  - id: out2
    label: Person-Hours Allocated
    baseValue: 15
    targetMin: 30
    targetMax: 70
  - id: out3
    label: Resource Coverage (%)
    baseValue: 20
    targetMin: 40
    targetMax: 90
sliders:
  - id: s1
    label: Task Budgeting
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 5
      - outputId: out3
        multiplier: 3
  - id: s2
    label: Team Sizing
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 5
  - id: s3
    label: Schedule Planning
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out3
        multiplier: 4
      - outputId: out1
        multiplier: 2
cards:
  - id: c1
    label: Hire Contractor
    effects:
      - outputId: out2
        multiplier: 10
      - outputId: out3
        multiplier: 5
  - id: c2
    label: Add Buffer Time
    effects:
      - outputId: out3
        multiplier: 8
      - outputId: out2
        multiplier: 4
  - id: c3
    label: Bulk Discount
    effects:
      - outputId: out1
        multiplier: 12
:::

:::mechanic-private
id: project-management-12-steps-easy-c9-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c9-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: step-7-calculate-necessary-resources
  position: after
concepts:
  - cost estimation
  - person-hour allocation
  - resource baseline planning
skills:
  - recall
domain: project-management-studies
prompt: >-
  Adjust the planning controls and apply resource boosts so every metric lands
  inside its target range.
validator:
  kind: invariants
  ref: project-management-12-steps-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: project-management-12-steps-easy-c9-m1:public
privateValidatorRef: project-management-12-steps-easy-c9-m1:private
rewardIdentity: project-management-12-steps-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c10-m1
version: 1
categories:
  - id: high
    label: High Risk
  - id: low
    label: Low Risk
items:
  - id: i1
    content: Risk Factor 15
  - id: i2
    content: Risk Factor 3
  - id: i3
    content: Risk Factor 22
  - id: i4
    content: Risk Factor 7
  - id: i5
    content: Risk Factor 12
  - id: i6
    content: Risk Factor 8
:::

:::mechanic-private
id: project-management-12-steps-easy-c10-m1
version: 1
kind: mapping
matches:
  i1: high
  i2: low
  i3: high
  i4: low
  i5: high
  i6: low
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c10-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-risk-plan
  position: after
concepts:
  - risk prioritization
  - risk factor interpretation
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the risk factors: High Risk or Low Risk'
validator:
  kind: mapping
  ref: project-management-12-steps-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-12-steps-easy-c10-m1:public
privateValidatorRef: project-management-12-steps-easy-c10-m1:private
rewardIdentity: project-management-12-steps-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c11-m1
version: 1
scenario: >-
  You are monitoring a project on a Gantt Chart. Mark completed sections to
  raise actual progress, and adjust the plan to close the gap between actual and
  planned progress.
maxTurns: 8
variables:
  - id: v1
    name: Actual Progress
    initialValue: 20
    targetValue: 80
    min: 0
    max: 100
  - id: v2
    name: Schedule Variance
    initialValue: -30
    targetValue: 0
    min: -50
    max: 20
controls:
  - id: c1
    type: button
    label: Mark Section Complete
    effects:
      - variableId: v1
        delta: 15
  - id: c2
    type: button
    label: Update Progress Log
    effects:
      - variableId: v1
        delta: 10
  - id: c3
    type: switch
    label: Enable Visual Tracking
    activeEffects:
      - variableId: v1
        delta: 3
  - id: c4
    type: slider
    label: Adjust Plan
    bindsTo: v2
    min: -50
    max: 20
    step: 5
:::

:::mechanic-private
id: project-management-12-steps-easy-c11-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c11-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: system-simulation
tier: Easy
anchor:
  heading: step-9-monitor-progress
  position: after
concepts:
  - Gantt chart progress tracking
  - Actual vs planned progress comparison
  - Visual status updates
skills:
  - recall
domain: project-management-studies
prompt: Reach the target progress and close the schedule gap.
validator:
  kind: invariants
  ref: project-management-12-steps-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 3
publicPayloadRef: project-management-12-steps-easy-c11-m1:public
privateValidatorRef: project-management-12-steps-easy-c11-m1:private
rewardIdentity: project-management-12-steps-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c12-m1
version: 1
scenario: >-
  A project manager is monitoring project costs and progress using the traffic
  light system. The project has a linear budget where spending is even, current
  progress is Yellow, and current budget status is Green. The PM needs to
  determine the project's overall health and what action to take.
startNodeId: n1
nodes:
  - id: n1
    question: >-
      First, how should the PM evaluate a project with a linear budget where
      spending is relatively even?
    options:
      - id: o1
        content: Use the rule of three to compare progress against budget
        nextNodeId: n2
      - id: o2
        content: Use limits with bars because the budget is uneven
        nextNodeId: null
      - id: o3
        content: Skip evaluation since the budget is linear
        nextNodeId: null
  - id: n2
    question: >-
      Progress is Yellow and Budget is Green. What is the project's overall
      status?
    options:
      - id: o4
        content: Green — everything is on track
        nextNodeId: null
      - id: o5
        content: Yellow — adjustments can still recover the situation
        nextNodeId: n3
      - id: o6
        content: Red — the project is irrecoverable
        nextNodeId: null
  - id: n3
    question: The status is Yellow. What action should the PM take?
    options:
      - id: o7
        content: Do nothing — everything is on track
        nextNodeId: null
      - id: o8
        content: Make adjustments to recover progress and spending
        nextNodeId: null
      - id: o9
        content: Abandon the project immediately
        nextNodeId: null
      - id: o10
        content: Request more money to improve progress
        nextNodeId: null
:::

:::mechanic-private
id: project-management-12-steps-easy-c12-m1
version: 1
kind: exact
correctAnswer: o1,o5,o8
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c12-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: prediction
tier: Easy
anchor:
  heading: evaluation-method
  position: after
concepts:
  - traffic light system
  - rule of three
  - linear budget evaluation
  - project health status
skills:
  - recall
domain: project-management-studies
prompt: How does the cost monitoring scenario play out?
validator:
  kind: exact
  ref: project-management-12-steps-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: project-management-12-steps-easy-c12-m1:public
privateValidatorRef: project-management-12-steps-easy-c12-m1:private
rewardIdentity: project-management-12-steps-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c13-m1
version: 1
attributes:
  - id: daysRecovered
    label: Days Recovered
  - id: costAdded
    label: Additional Cost ($K)
components:
  - id: c1
    content: Add overtime shifts — work extra hours daily to compress the schedule
    metrics:
      daysRecovered: 15
      costAdded: 22
  - id: c2
    content: Reduce project scope — cut non-essential features from the plan
    metrics:
      daysRecovered: 10
      costAdded: 6
  - id: c3
    content: Hire contract workers — bring in temporary specialists for the project
    metrics:
      daysRecovered: 14
      costAdded: 25
  - id: c4
    content: Negotiate deadline extension — request more time from the client
    metrics:
      daysRecovered: 4
      costAdded: 1
requirements:
  - attributeId: daysRecovered
    operator: '>='
    value: 12
  - attributeId: costAdded
    operator: <=
    value: 15
:::

:::mechanic-private
id: project-management-12-steps-easy-c13-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c13-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: constraint-construction
tier: Easy
anchor:
  heading: the-overlap-strategy
  position: after
concepts:
  - project recovery trade-offs
  - time-cost trade-offs
skills:
  - recall
domain: project-management-studies
prompt: Recover time and stay within budget.
validator:
  kind: invariants
  ref: project-management-12-steps-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: project-management-12-steps-easy-c13-m1:public
privateValidatorRef: project-management-12-steps-easy-c13-m1:private
rewardIdentity: project-management-12-steps-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c14-m1
version: 1
categories:
  - id: cat-a
    label: Wins
  - id: cat-b
    label: Lessons
items:
  - id: i1
    content: Exceptional individual work
  - id: i2
    content: Thank outstanding contributors
  - id: i3
    content: Repeat successful actions
  - id: i4
    content: Problems that occurred
  - id: i5
    content: Missed opportunities
  - id: i6
    content: What to do differently
:::

:::mechanic-private
id: project-management-12-steps-easy-c14-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-a
  i3: cat-a
  i4: cat-b
  i5: cat-b
  i6: cat-b
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c14-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-improvable
  position: after
concepts:
  - project review
  - organizational learning
  - retrospective categories
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the project review questions: Wins or Lessons'
validator:
  kind: mapping
  ref: project-management-12-steps-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-12-steps-easy-c14-m1:public
privateValidatorRef: project-management-12-steps-easy-c14-m1:private
rewardIdentity: project-management-12-steps-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: project-management-12-steps-easy-c15-m1
version: 1
question: What does the Iron Triangle mean?
options:
  - id: a
    content: Choose one to maximize
  - id: b
    content: All three can be equal
  - id: c
    content: Only cost matters
:::

:::mechanic-private
id: project-management-12-steps-easy-c15-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: project-management-12-steps-easy-c15-m1
version: 1
lessonSlug: project-management-12-steps-easy
type: multiple-choice
tier: Easy
anchor:
  heading: misconception-6-estimates-should-be-our-best-case-scenario
  position: after
concepts:
  - Iron Triangle trade-offs
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: project-management-12-steps-easy-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-12-steps-easy-c15-m1:public
privateValidatorRef: project-management-12-steps-easy-c15-m1:private
rewardIdentity: project-management-12-steps-easy-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[3,4,5,6,7,8,9,10,11,12,13,14,15],"sectionMechanics":[{"mechanicType":"tradeoff-decision","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"the-two-meeting-approach"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"granularity-finding-the-right-level-of-detail"},{"mechanicType":"multiple-choice","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"the-75-contingency-margin"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"floating-tasks-explained"},{"mechanicType":"tradeoff-decision","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"how-to-shorten-time"},{"mechanicType":"sequence-builder","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"drawing-the-gantt-chart"},{"mechanicType":"parameter-tuner","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"step-7-calculate-necessary-resources"},{"mechanicType":"quick-classification","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"the-risk-plan"},{"mechanicType":"system-simulation","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"step-9-monitor-progress"},{"mechanicType":"prediction","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"evaluation-method"},{"mechanicType":"constraint-construction","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"the-overlap-strategy"},{"mechanicType":"quick-classification","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"the-improvable"},{"mechanicType":"multiple-choice","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"misconception-6-estimates-should-be-our-best-case-scenario"}]}
:::