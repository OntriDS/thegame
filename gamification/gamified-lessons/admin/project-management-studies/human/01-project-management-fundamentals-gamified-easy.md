:::mechanic-data
id: 01-project-management-fundamentals-easy-c2-m1
version: 1
categories:
  - id: cat-a
    label: Set Up
  - id: cat-b
    label: Do & Done
items:
  - id: i1
    content: Initiating
  - id: i2
    content: Planning
  - id: i3
    content: Executing
  - id: i4
    content: Monitoring & Controlling
  - id: i5
    content: Closing
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-a
  i3: cat-b
  i4: cat-b
  i5: cat-b
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c2-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: quick-classification
tier: Easy
anchor:
  heading: 1-6-core-planning-elements
  position: after
concepts:
  - PMBOK process flow
  - project lifecycle phases
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the PMBOK phases: Set Up or Do & Done'
validator:
  kind: mapping
  ref: project-management-fundamentals-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-fundamentals-easy-c2-m1:public
privateValidatorRef: project-management-fundamentals-easy-c2-m1:private
rewardIdentity: project-management-fundamentals-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-project-management-fundamentals-easy-c3-m1
version: 1
scenario: >-
  A project manager is trying to understand two often-confused concepts: one is
  a formal right granted by the organization, and the other is an informal
  ability earned through expertise and relationships.
theories:
  - id: th-auth
    content: Authority
  - id: th-inf
    content: Influence
clues:
  - id: c1
    content: The formal right to allocate resources and expend funds
  - id: c2
    content: The informal ability to persuade others and drive deadlines
  - id: c3
    content: Granted through the project charter or organizational hierarchy
  - id: c4
    content: Comes from expertise, relationships, and organizational credibility
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c3-m1
version: 1
kind: mapping
matches:
  c1: th-auth
  c2: th-inf
  c3: th-auth
  c4: th-inf
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c3-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: evidence-match
tier: Easy
anchor:
  heading: 2-3-conflict-dynamics
  position: after
concepts:
  - authority vs. influence
skills:
  - recall
domain: project-management-studies
prompt: Which concept do these clues support?
validator:
  kind: mapping
  ref: project-management-fundamentals-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-fundamentals-easy-c3-m1:public
privateValidatorRef: project-management-fundamentals-easy-c3-m1:private
rewardIdentity: project-management-fundamentals-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-project-management-fundamentals-easy-c4-m1
version: 1
question: What's the minimum hours for a work package?
options:
  - id: a
    content: 8 hours
  - id: b
    content: 1 hour
  - id: c
    content: 100 hours
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c4-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c4-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 3-4-estimation-framework
  position: after
concepts:
  - WBS 8-80 hour rule
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: project-management-fundamentals-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-fundamentals-easy-c4-m1:public
privateValidatorRef: project-management-fundamentals-easy-c4-m1:private
rewardIdentity: project-management-fundamentals-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-project-management-fundamentals-easy-c5-m1
version: 1
question: PV in EVM means?
options:
  - id: a
    content: Planned Value
  - id: b
    content: Project Value
  - id: c
    content: Performance Value
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c5-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c5-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 4-3-communications-plan
  position: after
concepts:
  - Earned Value Management metrics
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: project-management-fundamentals-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-fundamentals-easy-c5-m1:public
privateValidatorRef: project-management-fundamentals-easy-c5-m1:private
rewardIdentity: project-management-fundamentals-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-project-management-fundamentals-easy-c6-m1
version: 1
question: What format is recommended for risk statements?
options:
  - id: a
    content: If-Then statements
  - id: b
    content: Vague summaries
  - id: c
    content: Bullet point lists
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c6-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 5-6-risk-register
  position: after
concepts:
  - risk communication format
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: project-management-fundamentals-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-fundamentals-easy-c6-m1:public
privateValidatorRef: project-management-fundamentals-easy-c6-m1:private
rewardIdentity: project-management-fundamentals-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-project-management-fundamentals-easy-c7-m1
version: 1
categories:
  - id: cause
    label: Cause
  - id: effect
    label: Effect
items:
  - id: i1
    content: Poor initial planning
  - id: i2
    content: Vague scope boundaries
  - id: i3
    content: No formal change process
  - id: i4
    content: Budget overruns
  - id: i5
    content: Schedule delays
  - id: i6
    content: Data inaccuracy
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c7-m1
version: 1
kind: mapping
matches:
  i1: cause
  i2: cause
  i3: cause
  i4: effect
  i5: effect
  i6: effect
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c7-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: quick-classification
tier: Easy
anchor:
  heading: 6-5-benefits-of-change-control
  position: after
concepts:
  - scope creep causes
  - scope creep consequences
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the scope creep items: Cause or Effect'
validator:
  kind: mapping
  ref: project-management-fundamentals-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: project-management-fundamentals-easy-c7-m1:public
privateValidatorRef: project-management-fundamentals-easy-c7-m1:private
rewardIdentity: project-management-fundamentals-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-project-management-fundamentals-easy-c8-m1
version: 1
scenario: >-
  Your project is kicking off next week. You must choose the dominant approach
  that will shape your project plan.
options:
  - id: a
    content: >-
      Run the phases in strict sequence: finish planning before any execution
      begins.
    pros:
      - clear stage gates
      - easy progress tracking
    cons:
      - delays later-stage planning
      - misses opportunities for parallel work
      - rigid when conditions change
  - id: b
    content: Overlap phases and tailor communication to each stakeholder group.
    pros:
      - matches how real projects run
      - delivers the right detail to each audience
      - keeps later planning active during early execution
      - builds stronger engagement
    cons:
      - requires more upfront communication planning
  - id: c
    content: Rely on your formal authority to direct the team and stakeholders.
    pros:
      - decisions can be issued quickly
    cons:
      - ignores how most organizations actually work
      - reduces team buy-in
      - creates resistance from stakeholders
:::

:::mechanic-private
id: 01-project-management-fundamentals-easy-c8-m1
version: 1
kind: rubric
scoring:
  a: 2
  b: 4
  c: 1
:::

:::mechanic
schemaVersion: 1
id: 01-project-management-fundamentals-easy-c8-m1
version: 1
lessonSlug: project-management-fundamentals-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: misconception-3-the-project-manager-has-authority-over-everything
  position: after
concepts:
  - phase overlap vs strict sequence
  - tailored stakeholder communication
  - PM influence vs formal authority
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: project-management-fundamentals-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: project-management-fundamentals-easy-c8-m1:public
privateValidatorRef: project-management-fundamentals-easy-c8-m1:private
rewardIdentity: project-management-fundamentals-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"1-6-core-planning-elements"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"2-3-conflict-dynamics"},{"mechanicType":"multiple-choice","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"3-4-estimation-framework"},{"mechanicType":"multiple-choice","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"4-3-communications-plan"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"5-6-risk-register"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"6-5-benefits-of-change-control"},{"mechanicType":"tradeoff-decision","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"misconception-3-the-project-manager-has-authority-over-everything"}]}
:::