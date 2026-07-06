---
type: gamified-lesson-mechanics
lesson_slug: agile-meets-design-thinking-easy
domain: project-management-studies
---

:::mechanic-data
id: agile-meets-design-thinking-easy-c2-m1
version: 1
question: How many words are in the Agile Manifesto?
options:
  - id: a
    content: 68 words
  - id: b
    content: 120 words
  - id: c
    content: 42 words
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c2-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: multiple-choice
tier: Easy
anchor:
  heading: core-philosophy
  position: after
concepts:
  - Agile Manifesto word count
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-meets-design-thinking-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c2-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c2-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c3-m1
version: 1
categories:
  - id: cat-a
    label: Persona
  - id: cat-b
    label: Benefit
items:
  - id: i1
    content: As a busy professional
  - id: i2
    content: As a project manager
  - id: i3
    content: As a new parent
  - id: i4
    content: So I can save time
  - id: i5
    content: So I can grow my business
  - id: i6
    content: So I can focus on family
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c3-m1
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
id: agile-meets-design-thinking-easy-c3-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: quick-classification
tier: Easy
anchor:
  heading: purpose
  position: after
concepts:
  - user story structure
  - persona
  - user benefit
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the user story parts: Persona or Benefit'
validator:
  kind: mapping
  ref: agile-meets-design-thinking-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c3-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c3-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c4-m1
version: 1
items:
  - id: i1
    content: Stories — what users tell you about their experiences
  - id: i2
    content: Discussions — conversations that reveal needs and pain points
  - id: i3
    content: Development — observations during actual use
  - id: i4
    content: Validation — confirmation that the solution works
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c4-m1
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
id: agile-meets-design-thinking-easy-c4-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: sequence-builder
tier: Easy
anchor:
  heading: releases
  position: after
concepts:
  - agile feedback loop
  - iteration process
skills:
  - recall
domain: project-management-studies
prompt: How user feedback flows through an Agile iteration from start to finish
validator:
  kind: sequence
  ref: agile-meets-design-thinking-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-meets-design-thinking-easy-c4-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c4-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c5-m1
version: 1
question: What does instrumenting observation capture?
options:
  - id: a
    content: What users actually do
  - id: b
    content: What users say they do
  - id: c
    content: What users want to buy
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c5-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c5-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: multiple-choice
tier: Easy
anchor:
  heading: purpose
  position: after
concepts:
  - observation purpose
  - user behavior
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-meets-design-thinking-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c5-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c5-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c6-m1
version: 1
items:
  - id: i1
    content: 'Step 1: Personas — Define and understand the target user'
  - id: i2
    content: >-
      Step 2: Problem, Scenario & Alternatives — Identify the problems users
      face
  - id: i3
    content: 'Step 4: User Discovery & Experimentation — Test ideas with real users'
  - id: i4
    content: 'Step 6: Product & Promotion — Develop and scale the product for launch'
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c6-m1
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
id: agile-meets-design-thinking-easy-c6-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: sequence-builder
tier: Easy
anchor:
  heading: the-6-step-process
  position: after
concepts:
  - venture design process
  - product development framework
skills:
  - recall
domain: project-management-studies
prompt: >-
  How the Venture Design Process unfolds from initial user research to product
  launch
validator:
  kind: sequence
  ref: agile-meets-design-thinking-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-meets-design-thinking-easy-c6-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c6-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c7-m1
version: 1
categories:
  - id: cat-thinks
    label: Thinks
  - id: cat-feels
    label: Feels
items:
  - id: i1
    content: Worried about deadlines
  - id: i2
    content: Frustrated by slow tools
  - id: i3
    content: Considers market risks
  - id: i4
    content: Excited by new features
  - id: i5
    content: Questions the strategy
  - id: i6
    content: Disappointed by results
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c7-m1
version: 1
kind: mapping
matches:
  i1: cat-thinks
  i2: cat-feels
  i3: cat-thinks
  i4: cat-feels
  i5: cat-thinks
  i6: cat-feels
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c7-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: quick-classification
tier: Easy
anchor:
  heading: usage
  position: after
concepts:
  - Think-See-Feel-Do framework
  - persona attributes
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the persona insights: cognitive ideas or emotions experienced'
validator:
  kind: mapping
  ref: agile-meets-design-thinking-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c7-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c7-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c8-m1
version: 1
scenario: >-
  Your team has finished interviewing customers about a pain point. Now you must
  choose how to design the value proposition. Each approach carries clear
  tradeoffs.
options:
  - id: a
    content: Build exactly what customers explicitly request in their feedback
    pros:
      - directly addresses the needs stated by customers
      - reduces the risk of misinterpreting what was said
      - shortens alignment discussions with stakeholders
    cons:
      - may miss underlying needs customers cannot articulate
      - scope tends to drift toward narrow features instead of a product
      - ignores the alternative solutions the user already relies on
  - id: b
    content: >-
      Assume you know what is best and build your own vision without further
      listening
    pros:
      - leverages your own expertise and judgment
      - enables innovation beyond what customers currently imagine
      - faster decision-making without waiting for consensus
    cons:
      - may solve a problem that nobody actually has
      - ignores the evidence gathered from the customer
      - higher risk of building something the market does not want
  - id: c
    content: >-
      Map alternative solutions, define the problem at the right scope, then
      design a value proposition that is cost-efficient against existing options
    pros:
      - targets the underlying need, not only the stated request
      - lands at a scope suited for a product, not just a feature
      - compares directly with the alternative solutions already in use
    cons:
      - requires more upfront research and synthesis
      - demands ongoing iteration as evidence accumulates
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c8-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 1
  c: 4
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c8-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: problem-scope
  position: after
concepts:
  - problem scenarios
  - finding the right balance
  - problem scope
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-meets-design-thinking-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-meets-design-thinking-easy-c8-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c8-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c9-m1
version: 1
question: Which tests if your solution works?
options:
  - id: a
    content: Functional Hypothesis
  - id: b
    content: Demand/Value Hypothesis
  - id: c
    content: Usability Hypothesis
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c9-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c9-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: multiple-choice
tier: Easy
anchor:
  heading: types-of-hypotheses
  position: after
concepts:
  - types of hypotheses
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-meets-design-thinking-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c9-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c9-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c10-m1
version: 1
question: How should interview questions be ordered?
options:
  - id: a
    content: General to specific
  - id: b
    content: Specific to general
  - id: c
    content: Random order
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c10-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c10-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: multiple-choice
tier: Easy
anchor:
  heading: interview-best-practices
  position: after
concepts:
  - interview question ordering
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-meets-design-thinking-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c10-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c10-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c11-m1
version: 1
categories:
  - id: setup
    label: Setup
  - id: after
    label: After
items:
  - id: i1
    content: Make the objective clear
  - id: i2
    content: Set an appropriate duration
  - id: i3
    content: Share results with the team
  - id: i4
    content: Vote to prioritize next steps
  - id: i5
    content: Keep transcripts of interviews
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c11-m1
version: 1
kind: mapping
matches:
  i1: setup
  i2: setup
  i3: after
  i4: after
  i5: after
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c11-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: quick-classification
tier: Easy
anchor:
  heading: best-practices
  position: after
concepts:
  - timeboxing best practices
  - workflow phases
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the TimeBoxing practices: Setup or After'
validator:
  kind: mapping
  ref: agile-meets-design-thinking-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c11-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c11-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c12-m1
version: 1
question: What's needed before usability testing?
options:
  - id: a
    content: Stories, scenarios, hypothesis
  - id: b
    content: Finished product and launch plan
  - id: c
    content: Marketing strategy and pricing
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c12-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c12-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: multiple-choice
tier: Easy
anchor:
  heading: foundation
  position: after
concepts:
  - usability hypothesis foundation
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-meets-design-thinking-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c12-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c12-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c13-m1
version: 1
items:
  - id: i1
    content: Goal — what the user wants to do
  - id: i2
    content: Plan — select one of the alternative solutions
  - id: i3
    content: Specify — identify the steps needed for the chosen solution
  - id: i4
    content: Perform — start doing the actions needed
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c13-m1
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
id: agile-meets-design-thinking-easy-c13-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: sequence-builder
tier: Easy
anchor:
  heading: key-design-concepts
  position: after
concepts:
  - Donald Norman's 7 Steps Model
skills:
  - recall
domain: project-management-studies
prompt: How a user moves from initial goal to action in Donald Norman's 7 Steps Model
validator:
  kind: sequence
  ref: agile-meets-design-thinking-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-meets-design-thinking-easy-c13-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c13-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c14-m1
version: 1
categories:
  - id: cat-a
    label: Defining
  - id: cat-b
    label: Applying
items:
  - id: i1
    content: Brand values & purpose
  - id: i2
    content: Style guide creation
  - id: i3
    content: Colors, logo, typography
  - id: i4
    content: Applying design to products
  - id: i5
    content: Iterating the style guide
  - id: i6
    content: Performance monitoring
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c14-m1
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
id: agile-meets-design-thinking-easy-c14-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-4-stages
  position: after
concepts:
  - Visual Design Program stages
  - Strategy vs Execution phases
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Visual Design Program stages: Defining or Applying'
validator:
  kind: mapping
  ref: agile-meets-design-thinking-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-meets-design-thinking-easy-c14-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c14-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c15-m1
version: 1
scenario: >-
  Your team has a new app concept and needs to validate it with potential users
  before launch. You're planning your user testing sessions and must decide how
  to structure them.
options:
  - id: a
    content: Test motivation and usability in a single combined session with each user
    pros:
      - covers both research questions in one round of recruitment
      - finishes validation faster overall
    cons:
      - produces results that are difficult to interpret
      - leads to false conclusions about what users actually want or can do
      - makes it hard to tell whether feedback is about motivation or usability
  - id: b
    content: 'Run separate sessions: one focused on motivation, another on usability'
    pros:
      - produces clear, distinct insights for each question
      - avoids the false conclusions that come from mixing the two
      - makes it easy to attribute feedback to the right dimension
    cons:
      - requires two separate rounds of user recruitment
      - takes more total time to complete both studies
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c15-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c15-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: testing-principles
  position: after
concepts:
  - prototyping testing principles
  - separating motivation and usability testing
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-meets-design-thinking-easy-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-meets-design-thinking-easy-c15-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c15-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-meets-design-thinking-easy-c16-m1
version: 1
items:
  - id: i1
    content: >-
      Exploratory: investigate approaches and interface patterns to discover a
      direction
  - id: i2
    content: >-
      Assessment: focus on one version, add detail, and refine the chosen
      direction
  - id: i3
    content: >-
      Validation: run formal testing with measurements to confirm the solution
      before release
:::

:::mechanic-private
id: agile-meets-design-thinking-easy-c16-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: agile-meets-design-thinking-easy-c16-m1
version: 1
lessonSlug: agile-meets-design-thinking-easy
type: sequence-builder
tier: Easy
anchor:
  heading: best-time-for-testing
  position: after
concepts:
  - usability test progression
skills:
  - recall
domain: project-management-studies
prompt: How usability testing unfolds from early discovery to final launch
validator:
  kind: sequence
  ref: agile-meets-design-thinking-easy-c16-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-meets-design-thinking-easy-c16-m1:public
privateValidatorRef: agile-meets-design-thinking-easy-c16-m1:private
rewardIdentity: agile-meets-design-thinking-easy-c16-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"core-philosophy"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"purpose"},{"mechanicType":"sequence-builder","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"releases"},{"mechanicType":"multiple-choice","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"purpose"},{"mechanicType":"sequence-builder","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"the-6-step-process"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"usage"},{"mechanicType":"tradeoff-decision","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"problem-scope"},{"mechanicType":"multiple-choice","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"types-of-hypotheses"},{"mechanicType":"multiple-choice","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"interview-best-practices"},{"mechanicType":"quick-classification","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"best-practices"},{"mechanicType":"multiple-choice","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"foundation"},{"mechanicType":"sequence-builder","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"key-design-concepts"},{"mechanicType":"quick-classification","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"the-4-stages"},{"mechanicType":"tradeoff-decision","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"testing-principles"},{"mechanicType":"sequence-builder","__chunkIndex":16,"__version":1,"__tier":"Easy","__anchorId":"best-time-for-testing"}]}
:::