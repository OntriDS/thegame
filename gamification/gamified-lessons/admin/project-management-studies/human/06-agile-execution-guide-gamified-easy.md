:::mechanic-data
id: 06-agile-execution-guide-easy-c2-m1
version: 1
question: How long is a Medium work item?
options:
  - id: a
    content: 2 Weeks
  - id: b
    content: 1 Week
  - id: c
    content: 1 Month
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c2-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: multiple-choice
tier: Easy
anchor:
  heading: optimization-insight
  position: after
concepts:
  - item sizing durations
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-framework-execution-guide-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-framework-execution-guide-easy-c2-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c2-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c3-m1
version: 1
categories:
  - id: multi
    label: Multi-Item
  - id: single
    label: Single Item
items:
  - id: i1
    content: Anticipated Analyst
  - id: i2
    content: Use Cases
  - id: i3
    content: Performance Cards
  - id: i4
    content: Prerequisites Map
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: single
  i2: single
  i3: multi
  i4: multi
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c3-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: quick-classification
tier: Easy
anchor:
  heading: four-documentation-methods
  position: after
concepts:
  - documentation techniques
  - cross-cutting requirements
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Agile documentation methods: Multi-Item or Single Item'
validator:
  kind: mapping
  ref: agile-framework-execution-guide-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-framework-execution-guide-easy-c3-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c3-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c4-m1
version: 1
scenario: >-
  During today's stand-up, a developer raises a complex production database
  issue that clearly needs deeper discussion. Several teammates start leaning
  in, ready to troubleshoot on the spot. The stand-up is already 12 minutes in.
options:
  - id: a
    content: Address the problem now in the stand-up
    pros:
      - saves scheduling time
      - preserves current momentum
    cons:
      - blows past the 15–30 minute timebox
      - violates the zero-problem-solving rule
      - derails the stand-up for uninvolved members
  - id: b
    content: >-
      Acknowledge the blocker briefly and schedule a separate session with the
      relevant members
    pros:
      - respects the zero-problem-solving rule
      - keeps the stand-up brief for everyone
      - allows a focused setting with the right people
    cons:
      - introduces a scheduling delay
      - interrupts momentum on the issue
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c4-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c4-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: when-to-adapt
  position: after
concepts:
  - zero-problem-solving rule
  - stand-up timeboxing
  - effective stand-up facilitation
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-framework-execution-guide-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-framework-execution-guide-easy-c4-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c4-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c5-m1
version: 1
scenario: Match each clue to the visual tracking tool it describes.
theories:
  - id: th-a
    content: Burndown Chart
  - id: th-b
    content: Backlog Chart
clues:
  - id: c1
    content: X-axis shows calendar days or weeks.
  - id: c2
    content: Y-axis shows remaining work in story points.
  - id: c3
    content: Maps item quantity against remaining time.
  - id: c4
    content: Enables cross-project comparison of production efficiency.
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c5-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-a
  c3: th-b
  c4: th-b
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c5-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: evidence-match
tier: Easy
anchor:
  heading: visual-tracking-tools
  position: after
concepts:
  - burndown chart
  - backlog chart
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: agile-framework-execution-guide-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-framework-execution-guide-easy-c5-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c5-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c6-m1
version: 1
scenario: >-
  Team velocity has dropped 30% over the last two sprints. Stand-ups run on
  time, but the team seems disengaged. Diagnose the root cause and dial in your
  management parameters.
symptoms:
  - Velocity dropped 30% across the last two sprints
  - Team members are quiet in stand-ups and rarely volunteer to help
diagnoses:
  - id: d1
    content: The PM is taking over tasks and micromanaging instead of coaching the team
  - id: d2
    content: The product backlog is poorly prioritized
  - id: d3
    content: External stakeholders are blocking the team's dependencies
parameters:
  - id: p1
    label: PM task involvement
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Team autonomy
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Coaching & mentoring
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c6-m1
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
id: 06-agile-execution-guide-easy-c6-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: core-responsibilities
  position: after
concepts:
  - PM role shift from executor to coach
  - Avoiding micromanagement and task takeover
skills:
  - recall
domain: project-management-studies
prompt: Diagnose why team velocity is falling and adjust your management parameters.
validator:
  kind: invariants
  ref: agile-framework-execution-guide-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: agile-framework-execution-guide-easy-c6-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c6-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c7-m1
version: 1
items:
  - id: i1
    content: 'Plan: define what you''ll accomplish and how'
  - id: i2
    content: 'Do: execute the work'
  - id: i3
    content: 'Check: review progress and outcomes'
  - id: i4
    content: 'Adjust: make corrections for the next iteration'
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c7-m1
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
id: 06-agile-execution-guide-easy-c7-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: sequence-builder
tier: Easy
anchor:
  heading: decision-making-framework
  position: after
concepts:
  - Plan-Do-Check-Adjust cycle
skills:
  - recall
domain: project-management-studies
prompt: How the Agile work cycle unfolds from start to finish
validator:
  kind: sequence
  ref: agile-framework-execution-guide-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-framework-execution-guide-easy-c7-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c7-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c8-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Team conflict emerges
  - id: s2
    isMissing: true
  - id: s3
    content: Team attacks the problem, not the person
  - id: s4
    isMissing: true
  - id: s5
    content: PM steps in if a deadlock remains
options:
  - id: o1
    content: Team attempts to resolve directly
  - id: o2
    content: Team performs a pros/cons analysis
  - id: o3
    content: Team hires an outside mediator
  - id: o4
    content: Manager publicly shames both sides
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c8-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c8-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: missing-step
tier: Easy
anchor:
  heading: creating-the-right-environment
  position: after
concepts:
  - conflict resolution process
  - rules of engagement
skills:
  - recall
domain: project-management-studies
prompt: What's missing from the conflict resolution process?
validator:
  kind: mapping
  ref: agile-framework-execution-guide-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-framework-execution-guide-easy-c8-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c8-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c9-m1
version: 1
scenario: >-
  An Agile team must tune its adaptation process so feedback, prioritization,
  resolution, and client trust all land in healthy ranges.
outputs:
  - id: out1
    label: Team Consensus
    baseValue: 20
    targetMin: 50
    targetMax: 90
  - id: out2
    label: Prioritization Quality
    baseValue: 15
    targetMin: 40
    targetMax: 80
  - id: out3
    label: Issue Resolution Rate
    baseValue: 25
    targetMin: 50
    targetMax: 95
  - id: out4
    label: Client Trust
    baseValue: 10
    targetMin: 30
    targetMax: 70
sliders:
  - id: s1
    label: Document Suggestions
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 2
      - outputId: out2
        multiplier: 1
  - id: s2
    label: Prioritization Rigor
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 3
      - outputId: out3
        multiplier: 2
  - id: s3
    label: Root-Cause Analysis Depth
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out3
        multiplier: 3
      - outputId: out1
        multiplier: 1
  - id: s4
    label: Brainstorm Cadence
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 2
      - outputId: out4
        multiplier: 2
cards:
  - id: c1
    label: Fist-of-Five Poll
    effects:
      - outputId: out1
        multiplier: 15
  - id: c2
    label: Transparent Client Comms
    effects:
      - outputId: out4
        multiplier: 20
  - id: c3
    label: Refactor Pass
    effects:
      - outputId: out2
        multiplier: 15
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c9-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c9-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: core-principles-to-uphold
  position: after
concepts:
  - feedback loop
  - honest prioritization
  - root-cause analysis
  - Fist of Five consensus
  - transparent communication
skills:
  - recall
domain: project-management-studies
prompt: >-
  Adjust the adaptation process controls and apply support cards to bring every
  metric into its target range.
validator:
  kind: invariants
  ref: agile-framework-execution-guide-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-framework-execution-guide-easy-c9-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c9-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c10-m1
version: 1
scenario: >-
  A project manager's team has just completed the final item in the product
  backlog. The project is ready to close out. Walk through the proper sequence
  of closure activities.
startNodeId: n1
nodes:
  - id: n1
    question: The backlog is complete. What is the first closure activity to perform?
    options:
      - id: a1
        content: >-
          Hold a project retrospective to review the entire project, what
          worked, and what to improve
        nextNodeId: n2
      - id: b1
        content: >-
          Immediately reassign all team members to other projects with no
          handoff
        nextNodeId: null
      - id: c1
        content: Cancel all remaining meetings and shut down communication channels
        nextNodeId: null
  - id: n2
    question: After the retrospective, what should the team do next?
    options:
      - id: a2
        content: >-
          Hold a final exhibition to demonstrate the completed work to
          stakeholders and gather feedback
        nextNodeId: n3
      - id: b2
        content: Begin sprint planning for the next unrelated project right away
        nextNodeId: null
      - id: c2
        content: Delete all project files to free up storage space
        nextNodeId: null
  - id: n3
    question: Before the team transitions, what critical knowledge must be captured?
    options:
      - id: a3
        content: >-
          Document the project rationale, outcomes, lessons learned, and
          benefits delivered
        nextNodeId: null
      - id: b3
        content: Keep all notes in a personal notebook so only you remember them
        nextNodeId: null
      - id: c3
        content: Skip documentation since the work is already finished and obvious
        nextNodeId: null
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c10-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c10-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: prediction
tier: Easy
anchor:
  heading: closure-activities
  position: after
concepts:
  - closure activities
  - project retrospective
  - final exhibition
  - documentation
  - team transition
skills:
  - recall
domain: project-management-studies
prompt: How does the project closure scenario play out?
validator:
  kind: exact
  ref: agile-framework-execution-guide-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: agile-framework-execution-guide-easy-c10-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c10-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c11-m1
version: 1
attributes:
  - id: disruption
    label: Workflow disruption
  - id: resultsSpeed
    label: Speed to first results
components:
  - id: retro
    content: Run a team retrospective to surface issues and group-solve them
    metrics:
      disruption: 2
      resultsSpeed: 4
  - id: toolswap
    content: Replace all PM tools with a new Agile suite on day one
    metrics:
      disruption: 5
      resultsSpeed: 1
  - id: cadence
    content: Define a clear delivery cadence with the client for on-time releases
    metrics:
      disruption: 2
      resultsSpeed: 5
  - id: assessment
    content: >-
      Conduct a full management and leadership assessment before any delivery
      work
    metrics:
      disruption: 4
      resultsSpeed: 1
requirements:
  - attributeId: disruption
    operator: <=
    value: 3
  - attributeId: resultsSpeed
    operator: '>='
    value: 3
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c11-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c11-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: constraint-construction
tier: Easy
anchor:
  heading: certification-preparation
  position: after
concepts:
  - first-time Agile implementation
  - minimizing disruption during transition
  - prioritizing quick wins
skills:
  - recall
domain: project-management-studies
prompt: >-
  Pick first-time Agile actions that keep disruption low and produce fast
  results.
validator:
  kind: invariants
  ref: agile-framework-execution-guide-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: agile-framework-execution-guide-easy-c11-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c11-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-agile-execution-guide-easy-c12-m1
version: 1
sourceDomain: Agile project management
targetDomain: Performance measurement in organizational behavior
scenario: >-
  In Agile, a team's velocity is a planning input—not a measure of team worth. A
  team with velocity 20 is not 'better' than a team with velocity 15; the two
  teams simply operate in different conditions. Apply this same reasoning to
  organizational behavior: an organization tracks team-level indicators such as
  output volume, cycle time, and throughput. How should leaders interpret and
  act on these numbers?
options:
  - id: a
    content: >-
      Use the metrics as context-dependent planning inputs, comparing teams only
      when scope, conditions, and definitions are aligned.
  - id: b
    content: >-
      Treat higher metric values as objective proof that one team outperforms
      another, and use the rankings to distribute rewards.
  - id: c
    content: >-
      Discontinue all team-level metrics so no one can draw misleading
      comparisons between groups.
:::

:::mechanic-private
id: 06-agile-execution-guide-easy-c12-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
hints:
  - id: hint-1
    matcher:
      selected:
        - b
        - c
    hint: >-
      Recall how Agile treats velocity: it is a planning tool whose meaning
      depends on context (team size, story sizing, definition of done). The
      correct transfer keeps that 'context-dependent planning input' structure
      rather than ranking teams on raw numbers or abandoning measurement
      altogether.
:::

:::mechanic
schemaVersion: 1
id: 06-agile-execution-guide-easy-c12-m1
version: 1
lessonSlug: agile-framework-execution-guide-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: misconception-6-agile-works-the-same-everywhere
  position: after
concepts:
  - Agile velocity interpretation
  - context-dependent metrics
  - performance measurement
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-framework-execution-guide-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-framework-execution-guide-easy-c12-m1:public
privateValidatorRef: agile-framework-execution-guide-easy-c12-m1:private
rewardIdentity: agile-framework-execution-guide-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"optimization-insight"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"four-documentation-methods"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"when-to-adapt"},{"mechanicType":"evidence-match","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"visual-tracking-tools"},{"mechanicType":"diagnostic-lab","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"core-responsibilities"},{"mechanicType":"sequence-builder","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"decision-making-framework"},{"mechanicType":"missing-step","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"creating-the-right-environment"},{"mechanicType":"parameter-tuner","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"core-principles-to-uphold"},{"mechanicType":"prediction","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"closure-activities"},{"mechanicType":"constraint-construction","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"certification-preparation"},{"mechanicType":"abstract-transfer","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"misconception-6-agile-works-the-same-everywhere"}]}
:::