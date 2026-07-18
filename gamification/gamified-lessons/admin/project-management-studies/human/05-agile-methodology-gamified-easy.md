:::mechanic-data
id: 05-agile-methodology-easy-c2-m1
version: 1
items:
  - id: i1
    content: Envision — define the 'why' and 'what' of the project
  - id: i2
    content: Plan — break the work into manageable pieces and schedule them
  - id: i3
    content: Explore/Create — execute the actual work day by day
  - id: i4
    content: Close — finish the project cleanly and capture final learnings
:::

:::mechanic-private
id: 05-agile-methodology-easy-c2-m1
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
id: 05-agile-methodology-easy-c2-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: sequence-builder
tier: Easy
anchor:
  heading: what-is-the-agile-5-stages-methodology
  position: after
concepts:
  - Agile 5-Stages Methodology
  - project lifecycle phases
skills:
  - recall
domain: project-management-studies
prompt: How the Agile 5-Stages Methodology unfolds from kickoff to completion
validator:
  kind: sequence
  ref: agile-5-stages-methodology-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-5-stages-methodology-easy-c2-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c2-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-agile-methodology-easy-c3-m1
version: 1
question: When does the Envision stage occur?
options:
  - id: a
    content: Once, at the start
  - id: b
    content: Each sprint
  - id: c
    content: At project end
:::

:::mechanic-private
id: 05-agile-methodology-easy-c3-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-agile-methodology-easy-c3-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: multiple-choice
tier: Easy
anchor:
  heading: stage-1-envision-one-time-execution
  position: after
concepts:
  - Envision stage timing
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-5-stages-methodology-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-5-stages-methodology-easy-c3-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c3-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-agile-methodology-easy-c4-m1
version: 1
categories:
  - id: cat-a
    label: Activity
  - id: cat-b
    label: Output
items:
  - id: i1
    content: Prioritize Item list
  - id: i2
    content: Estimate time and cost per Item
  - id: i3
    content: Group Items into Sprints
  - id: i4
    content: Sprint requirements
  - id: i5
    content: Acceptance criteria
  - id: i6
    content: Risk logs
:::

:::mechanic-private
id: 05-agile-methodology-easy-c4-m1
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
id: 05-agile-methodology-easy-c4-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: quick-classification
tier: Easy
anchor:
  heading: stage-2-plan
  position: after
concepts:
  - Plan stage activities
  - Plan stage outputs
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Plan stage elements: Activity or Output'
validator:
  kind: mapping
  ref: agile-5-stages-methodology-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-5-stages-methodology-easy-c4-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c4-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-agile-methodology-easy-c5-m1
version: 1
question: How long do stand-up meetings last?
options:
  - id: a
    content: 15–30 minutes
  - id: b
    content: 1–2 hours
  - id: c
    content: 5–10 minutes
:::

:::mechanic-private
id: 05-agile-methodology-easy-c5-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-agile-methodology-easy-c5-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: multiple-choice
tier: Easy
anchor:
  heading: stage-3-explore-create-production
  position: after
concepts:
  - stand-up meeting duration
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-5-stages-methodology-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-5-stages-methodology-easy-c5-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c5-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-agile-methodology-easy-c6-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Test the product against the plan
  - id: s2
    isMissing: true
  - id: s3
    content: Provide updates to stakeholders
  - id: s4
    isMissing: true
  - id: s5
    content: Agree on changes for future Sprints
options:
  - id: o1
    content: Hold team meetings to discuss lessons
  - id: o2
    content: Analyze what is working and failing
  - id: o3
    content: Skip reflection and start next Sprint
  - id: o4
    content: Hire new team members immediately
:::

:::mechanic-private
id: 05-agile-methodology-easy-c6-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 05-agile-methodology-easy-c6-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: missing-step
tier: Easy
anchor:
  heading: stage-4-adapt-reflection
  position: after
concepts:
  - Adapt stage activities
  - Sprint reflection process
skills:
  - recall
domain: project-management-studies
prompt: What's missing from the Adapt stage process?
validator:
  kind: mapping
  ref: agile-5-stages-methodology-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-5-stages-methodology-easy-c6-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c6-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-agile-methodology-easy-c7-m1
version: 1
scenario: >-
  A project manager is sorting clues about which project lifecycle stage they
  describe.
theories:
  - id: th-a
    content: Close Stage (Project Finale)
  - id: th-b
    content: Project Kickoff (Project Start)
clues:
  - id: c1
    content: Triggered when the last Sprint has been completed
  - id: c2
    content: Stakeholders formally approve the project charter and vision
  - id: c3
    content: Team members are released and reassigned to new work
  - id: c4
    content: The team is assembled and aligned on goals for the first time
:::

:::mechanic-private
id: 05-agile-methodology-easy-c7-m1
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
id: 05-agile-methodology-easy-c7-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: evidence-match
tier: Easy
anchor:
  heading: stage-5-close-retrospective
  position: after
concepts:
  - Close stage triggers and activities
  - Project lifecycle stages
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: agile-5-stages-methodology-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-5-stages-methodology-easy-c7-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c7-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-agile-methodology-easy-c8-m1
version: 1
question: Daily stand-ups are for?
options:
  - id: a
    content: Communication and visibility
  - id: b
    content: Solving problems together
  - id: c
    content: Assigning new tasks
:::

:::mechanic-private
id: 05-agile-methodology-easy-c8-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-agile-methodology-easy-c8-m1
version: 1
lessonSlug: agile-5-stages-methodology-easy
type: multiple-choice
tier: Easy
anchor:
  heading: misconception-5-the-close-stage-is-just-a-celebration
  position: after
concepts:
  - daily stand-up purpose
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-5-stages-methodology-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-5-stages-methodology-easy-c8-m1:public
privateValidatorRef: agile-5-stages-methodology-easy-c8-m1:private
rewardIdentity: agile-5-stages-methodology-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8],"sectionMechanics":[{"mechanicType":"sequence-builder","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"what-is-the-agile-5-stages-methodology"},{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"stage-1-envision-one-time-execution"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"stage-2-plan"},{"mechanicType":"multiple-choice","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"stage-3-explore-create-production"},{"mechanicType":"missing-step","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"stage-4-adapt-reflection"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"stage-5-close-retrospective"},{"mechanicType":"multiple-choice","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-the-close-stage-is-just-a-celebration"}]}
:::