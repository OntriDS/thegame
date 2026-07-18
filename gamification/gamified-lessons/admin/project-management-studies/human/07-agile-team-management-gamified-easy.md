:::mechanic-data
id: 07-agile-team-management-easy-c2-m1
version: 1
categories:
  - id: outcome
    label: Outcome
  - id: activity
    label: Activity
items:
  - id: i1
    content: Release frequency
  - id: i2
    content: Feature delivery volume
  - id: i3
    content: High-engagement features
  - id: i4
    content: Hours worked
  - id: i5
    content: Lines of code written
  - id: i6
    content: Meetings attended
:::

:::mechanic-private
id: 07-agile-team-management-easy-c2-m1
version: 1
kind: mapping
matches:
  i1: outcome
  i2: outcome
  i3: outcome
  i4: activity
  i5: activity
  i6: activity
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c2-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: quick-classification
tier: Easy
anchor:
  heading: outcome-focus-vs-activity-focus
  position: after
concepts:
  - outcome-based metrics
  - activity-based metrics
  - Agile mindset
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Agile metrics: Outcome or Activity'
validator:
  kind: mapping
  ref: agile-team-frameworks-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-team-frameworks-easy-c2-m1:public
privateValidatorRef: agile-team-frameworks-easy-c2-m1:private
rewardIdentity: agile-team-frameworks-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c3-m1
version: 1
items:
  - id: i1
    content: Fail Fast — run small experiments and surface problems early
  - id: i2
    content: Learn Fast — analyze what happened and identify root causes
  - id: i3
    content: Improve Fast — apply the lessons in the next iteration
:::

:::mechanic-private
id: 07-agile-team-management-easy-c3-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c3-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: sequence-builder
tier: Easy
anchor:
  heading: release-strategy
  position: after
concepts:
  - Agile learning cycle
  - Fail Fast / Learn Fast / Improve Fast
skills:
  - recall
domain: project-management-studies
prompt: How the Agile learning cycle unfolds from experiment to improvement
validator:
  kind: sequence
  ref: agile-team-frameworks-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-team-frameworks-easy-c3-m1:public
privateValidatorRef: agile-team-frameworks-easy-c3-m1:private
rewardIdentity: agile-team-frameworks-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c4-m1
version: 1
scenario: >-
  A Scrum team just finished a sprint demo and stakeholders were visibly
  surprised by what was built.
symptoms:
  - >-
    Stakeholders were surprised by the features demonstrated at the Sprint
    Review
  - >-
    Several completed user stories did not match what stakeholders expected to
    see
diagnoses:
  - id: d1
    content: Failed narrative collaboration and intent alignment during the sprint
  - id: d2
    content: The Development Team lacked the technical skills to build what was planned
  - id: d3
    content: The sprint time-box was too short for the amount of work committed
parameters:
  - id: p1
    label: Daily Standup Communication Quality
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Acceptance Criteria Clarity
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Stakeholder Engagement During Planning
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 07-agile-team-management-easy-c4-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: '>='
    targetValue: 50
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c4-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: tracking-burndown-charts
  position: after
concepts:
  - scrum events
  - demo surprise
  - narrative collaboration
skills:
  - recall
domain: project-management-studies
prompt: Diagnose why stakeholders were surprised at the sprint demo.
validator:
  kind: invariants
  ref: agile-team-frameworks-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: agile-team-frameworks-easy-c4-m1:public
privateValidatorRef: agile-team-frameworks-easy-c4-m1:private
rewardIdentity: agile-team-frameworks-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c5-m1
version: 1
scenario: Match each XP practice to the area of XP it belongs to.
theories:
  - id: th-a
    content: XP Engineering Practice
  - id: th-b
    content: XP Planning Practice
clues:
  - id: c1
    content: Write the test before writing the code
  - id: c2
    content: Entire build must complete in under ten minutes
  - id: c3
    content: An on-site customer is available to answer questions
  - id: c4
    content: 'Planning game: continuous negotiation on what to build next'
:::

:::mechanic-private
id: 07-agile-team-management-easy-c5-m1
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
id: 07-agile-team-management-easy-c5-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: evidence-match
tier: Easy
anchor:
  heading: planning-philosophy
  position: after
concepts:
  - XP engineering practices
  - XP planning practices
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: agile-team-frameworks-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-team-frameworks-easy-c5-m1:public
privateValidatorRef: agile-team-frameworks-easy-c5-m1:private
rewardIdentity: agile-team-frameworks-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c6-m1
version: 1
question: What does 'Kanban' mean in Japanese?
options:
  - id: a
    content: Signboard or billboard
  - id: b
    content: Workflow board
  - id: c
    content: Production system
:::

:::mechanic-private
id: 07-agile-team-management-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c6-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: multiple-choice
tier: Easy
anchor:
  heading: core-mechanics
  position: after
concepts:
  - Kanban origin and meaning
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-team-frameworks-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-team-frameworks-easy-c6-m1:public
privateValidatorRef: agile-team-frameworks-easy-c6-m1:private
rewardIdentity: agile-team-frameworks-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c7-m1
version: 1
scenario: >-
  Your engineering team needs a new performance metric to report to leadership.
  Two approaches have been proposed, each with clear tradeoffs.
options:
  - id: a
    content: Track individual developer velocity (commits per developer per week)
    pros:
      - easy to measure and report to leadership
      - creates clear individual accountability
    cons:
      - discourages collaboration and pair work
      - ignores code quality and actual outcomes
      - can be gamed by inflating commit counts
  - id: b
    content: Track team cycle time from idea to deployment
    pros:
      - measures real delivery outcomes
      - identifies process bottlenecks
      - encourages flow and efficiency
    cons:
      - harder to attribute to specific contributors
      - requires tool investment to track consistently
:::

:::mechanic-private
id: 07-agile-team-management-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c7-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: measurement-anti-patterns
  position: after
concepts:
  - agile metrics
  - measurement anti-patterns
  - valid performance metrics
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-team-frameworks-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-team-frameworks-easy-c7-m1:public
privateValidatorRef: agile-team-frameworks-easy-c7-m1:private
rewardIdentity: agile-team-frameworks-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c8-m1
version: 1
attributes:
  - id: data-evidence
    label: Data Evidence
  - id: effort
    label: Implementation Effort
components:
  - id: c1
    content: >-
      Explain the rationale behind Agile practices and connect them to business
      outcomes the client tracks
    metrics:
      data-evidence: 3
      effort: 2
  - id: c2
    content: >-
      Measure predictability, quality, and delivery speed before and after Agile
      adoption
    metrics:
      data-evidence: 6
      effort: 4
  - id: c3
    content: >-
      Run user interviews, usability tests, and surveys to anchor solutions in
      observed needs
    metrics:
      data-evidence: 7
      effort: 5
  - id: c4
    content: >-
      Translate Agile terms into familiar business language and project
      metaphors
    metrics:
      data-evidence: 2
      effort: 1
requirements:
  - attributeId: data-evidence
    operator: '>='
    value: 8
  - attributeId: effort
    operator: <=
    value: 6
:::

:::mechanic-private
id: 07-agile-team-management-easy-c8-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c8-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: constraint-construction
tier: Easy
anchor:
  heading: business-model-impact
  position: after
concepts:
  - enterprise mitigation strategies
  - data-driven client alignment
skills:
  - recall
domain: project-management-studies
prompt: Select mitigation strategies that meet all constraints.
validator:
  kind: invariants
  ref: agile-team-frameworks-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: agile-team-frameworks-easy-c8-m1:public
privateValidatorRef: agile-team-frameworks-easy-c8-m1:private
rewardIdentity: agile-team-frameworks-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c9-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Train on principles, not processes
  - id: s2
    isMissing: true
  - id: s3
    content: Enforce retrospectives
  - id: s4
    isMissing: true
  - id: s5
    content: Celebrate wins
options:
  - id: o1
    content: Run pilot projects
  - id: o2
    content: Cap scope
  - id: o3
    content: Buy new tools
  - id: o4
    content: Hire more managers
:::

:::mechanic-private
id: 07-agile-team-management-easy-c9-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c9-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: missing-step
tier: Easy
anchor:
  heading: servant-leadership
  position: after
concepts:
  - new team foundations
  - Agile rollout steps
skills:
  - recall
domain: project-management-studies
prompt: What's missing from the New Teams process?
validator:
  kind: mapping
  ref: agile-team-frameworks-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-team-frameworks-easy-c9-m1:public
privateValidatorRef: agile-team-frameworks-easy-c9-m1:private
rewardIdentity: agile-team-frameworks-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c10-m1
version: 1
scenario: Match each clue to the Agile framework it most obviously describes.
theories:
  - id: th-scrum
    content: Scrum
  - id: th-kanban
    content: Kanban
clues:
  - id: c1
    content: Uses fixed-length Sprints as its core cadence
  - id: c2
    content: Limits work-in-progress (WIP) to control flow
  - id: c3
    content: 'Holds structured ceremonies: planning, standup, review, and retro'
  - id: c4
    content: Visualizes workflow with continuous flow and no required iterations
:::

:::mechanic-private
id: 07-agile-team-management-easy-c10-m1
version: 1
kind: mapping
matches:
  c1: th-scrum
  c2: th-kanban
  c3: th-scrum
  c4: th-kanban
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c10-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: evidence-match
tier: Easy
anchor:
  heading: framework-comparison-matrix
  position: after
concepts:
  - Scrum framework
  - Kanban framework
skills:
  - recall
domain: project-management-studies
prompt: Which framework do these clues support?
validator:
  kind: mapping
  ref: agile-team-frameworks-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-team-frameworks-easy-c10-m1:public
privateValidatorRef: agile-team-frameworks-easy-c10-m1:private
rewardIdentity: agile-team-frameworks-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-agile-team-management-easy-c11-m1
version: 1
scenario: >-
  A new team is told to 'go Agile' and a manager declares there will be no more
  planning meetings or documentation. The team is confused about what Agile
  really means.
startNodeId: n1
nodes:
  - id: n1
    question: What is the first thing the team should recognize about Agile?
    options:
      - id: a1
        content: >-
          Agile values working software over comprehensive documentation, but
          still requires continuous, adaptive planning and just-enough
          documentation.
        nextNodeId: n2
      - id: b1
        content: Agile really does mean zero planning and no documentation of any kind.
        nextNodeId: null
      - id: c1
        content: Agile only works if the team abandons all structure and processes.
        nextNodeId: null
  - id: n2
    question: What should the team propose as the right approach?
    options:
      - id: a2
        content: >-
          Continuously plan and adapt, and write only the documentation that
          serves a real purpose.
        nextNodeId: n3
      - id: b2
        content: >-
          Stop all ceremonies and rely on informal hallway conversations
          instead.
        nextNodeId: null
      - id: c2
        content: Document everything in detail to compensate for the lack of structure.
        nextNodeId: null
  - id: n3
    question: >-
      Which framework could the team adopt to put Agile principles into
      practice?
    options:
      - id: a3
        content: >-
          Scrum, a specific framework with defined roles, events, and artifacts
          that embodies Agile values.
        nextNodeId: null
      - id: b3
        content: >-
          Scrum and Agile are the same thing, so any Scrum process is
          automatically Agile.
        nextNodeId: null
      - id: c3
        content: Kanban is just a sticky-note board, so it can replace all planning.
        nextNodeId: null
:::

:::mechanic-private
id: 07-agile-team-management-easy-c11-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: 07-agile-team-management-easy-c11-m1
version: 1
lessonSlug: agile-team-frameworks-easy
type: prediction
tier: Easy
anchor:
  heading: misconception-7-once-agile-always-agile
  position: after
concepts:
  - Agile values vs. practices
  - Planning and documentation in Agile
  - Scrum as an Agile framework
skills:
  - recall
domain: project-management-studies
prompt: How does the Agile adoption scenario play out?
validator:
  kind: exact
  ref: agile-team-frameworks-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: agile-team-frameworks-easy-c11-m1:public
privateValidatorRef: agile-team-frameworks-easy-c11-m1:private
rewardIdentity: agile-team-frameworks-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"outcome-focus-vs-activity-focus"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"release-strategy"},{"mechanicType":"diagnostic-lab","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"tracking-burndown-charts"},{"mechanicType":"evidence-match","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"planning-philosophy"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"core-mechanics"},{"mechanicType":"tradeoff-decision","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"measurement-anti-patterns"},{"mechanicType":"constraint-construction","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"business-model-impact"},{"mechanicType":"missing-step","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"servant-leadership"},{"mechanicType":"evidence-match","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"framework-comparison-matrix"},{"mechanicType":"prediction","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"misconception-7-once-agile-always-agile"}]}
:::