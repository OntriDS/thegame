---
type: gamified-lesson-mechanics
lesson_slug: agile-core-framework-easy
domain: project-management-studies
---

:::mechanic-data
id: agile-core-framework-easy-c2-m1
version: 1
categories:
  - id: cat-a
    label: Agile
  - id: cat-b
    label: Waterfall
items:
  - id: i1
    content: Iterative Sprints
  - id: i2
    content: Sequential phases
  - id: i3
    content: Welcomes change
  - id: i4
    content: Value deferred
  - id: i5
    content: Continuous feedback
  - id: i6
    content: Rigid structure
:::

:::mechanic-private
id: agile-core-framework-easy-c2-m1
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
id: agile-core-framework-easy-c2-m1
version: 1
lessonSlug: agile-core-framework-easy
type: quick-classification
tier: Easy
anchor:
  heading: agile-versus-traditional-project-management
  position: after
concepts:
  - Agile vs Traditional PM
  - Iterative approach
  - Waterfall methodology
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the project management concepts: Agile or Waterfall'
validator:
  kind: mapping
  ref: agile-core-framework-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-core-framework-easy-c2-m1:public
privateValidatorRef: agile-core-framework-easy-c2-m1:private
rewardIdentity: agile-core-framework-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c3-m1
version: 1
scenario: >-
  Determine whether each clue points to a project that thrives with Agile or a
  project where Agile may not be appropriate.
theories:
  - id: th-a
    content: Project is a good Agile candidate
  - id: th-b
    content: Project is NOT a good Agile candidate (warning signs)
clues:
  - id: c1
    content: Short to medium duration (a few weeks to several months)
  - id: c2
    content: Team lacks the autonomy or expertise to self-organize
  - id: c3
    content: >-
      Requirements are likely to evolve or are not fully understood at the
      outset
  - id: c4
    content: The project has already proven successful with traditional methods
:::

:::mechanic-private
id: agile-core-framework-easy-c3-m1
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
id: agile-core-framework-easy-c3-m1
version: 1
lessonSlug: agile-core-framework-easy
type: evidence-match
tier: Easy
anchor:
  heading: selecting-the-right-projects-ideal-agile-candidates
  position: after
concepts:
  - agile project suitability
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: agile-core-framework-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-core-framework-easy-c3-m1:public
privateValidatorRef: agile-core-framework-easy-c3-m1:private
rewardIdentity: agile-core-framework-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c4-m1
version: 1
scenario: >-
  A mid-sized company is deciding how to manage its upcoming initiatives, which
  include a marketing campaign refresh, a structural reorganization, regulatory
  compliance updates, and a new user experience prototype. Leadership wants to
  choose one standardized approach.
options:
  - id: a
    content: Adopt Agile as the single methodology for every initiative
    pros:
      - consistent process across the organization
      - faster iteration on creative work
      - stronger cross-functional collaboration
    cons:
      - documentation gaps hurt regulatory compliance work
      - no formal approval chains for structural decisions
      - poor fit for staffing and role assignment work
  - id: b
    content: Keep traditional waterfall as the single methodology for every initiative
    pros:
      - clear documentation and audit trails
      - defined approval chains for compliance
      - predictable plans for structural reorganizations
    cons:
      - slows down marketing campaign testing
      - too rigid for rapid prototyping
      - delays user experience iteration
  - id: c
    content: Use a hybrid approach that matches methodology to each initiative's nature
    pros:
      - right fit for creative and prototyping work
      - supports mandatory compliance documentation
      - enables rapid campaign experimentation
      - preserves formal approval where it is required
    cons:
      - requires training in both methodologies
      - more complex cross-team coordination
      - harder to standardize executive reporting
:::

:::mechanic-private
id: agile-core-framework-easy-c4-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 1
  c: 4
hints:
  a: >-
    Agile struggles with the compliance documentation and structural decisions
    the lesson highlights as poor fits.
  b: >-
    Traditional methods slow down the rapid iteration and prototyping the lesson
    calls out as good Agile fits.
  c: >-
    The lesson's main thesis is matching the methodology to the nature of the
    work rather than forcing one standard.
:::

:::mechanic
schemaVersion: 1
id: agile-core-framework-easy-c4-m1
version: 1
lessonSlug: agile-core-framework-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: the-hybrid-approach-best-of-both-worlds
  position: after
concepts:
  - hybrid methodology selection
  - matching approach to work type
  - Agile vs traditional tradeoffs
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-core-framework-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-core-framework-easy-c4-m1:public
privateValidatorRef: agile-core-framework-easy-c4-m1:private
rewardIdentity: agile-core-framework-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c5-m1
version: 1
question: When is the PDS created?
options:
  - id: a
    content: After the Envision phase
  - id: b
    content: Before the Envision phase
  - id: c
    content: During Sprint 1
:::

:::mechanic-private
id: agile-core-framework-easy-c5-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: agile-core-framework-easy-c5-m1
version: 1
lessonSlug: agile-core-framework-easy
type: multiple-choice
tier: Easy
anchor:
  heading: what-the-pds-contains
  position: after
concepts:
  - PDS timing in Agile phases
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: agile-core-framework-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-core-framework-easy-c5-m1:public
privateValidatorRef: agile-core-framework-easy-c5-m1:private
rewardIdentity: agile-core-framework-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c6-m1
version: 1
categories:
  - id: cat-type
    label: Type
  - id: cat-pds
    label: PDS Req
items:
  - id: i1
    content: Budget limitations
  - id: i2
    content: Data protection
  - id: i3
    content: Technology stack limits
  - id: i4
    content: Hard deadlines
  - id: i5
    content: Team availability
  - id: i6
    content: Safety regulations
:::

:::mechanic-private
id: agile-core-framework-easy-c6-m1
version: 1
kind: mapping
matches:
  i1: cat-type
  i2: cat-type
  i3: cat-type
  i4: cat-pds
  i5: cat-pds
  i6: cat-pds
:::

:::mechanic
schemaVersion: 1
id: agile-core-framework-easy-c6-m1
version: 1
lessonSlug: agile-core-framework-easy
type: quick-classification
tier: Easy
anchor:
  heading: understanding-constraints
  position: after
concepts:
  - categories of constraints
  - PDS specifications
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the project items: Constraint Type or PDS Requirement'
validator:
  kind: mapping
  ref: agile-core-framework-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-core-framework-easy-c6-m1:public
privateValidatorRef: agile-core-framework-easy-c6-m1:private
rewardIdentity: agile-core-framework-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c7-m1
version: 1
scenario: >-
  Configure a new project's first Sprint to balance pure execution time against
  how often the team gets feedback.
outputs:
  - id: out1
    label: Pure Execution Weeks
    baseValue: -2
    targetMin: 3
    targetMax: 8
  - id: out2
    label: Feedback Cycles / Year
    baseValue: 13
    targetMin: 4
    targetMax: 9
  - id: out3
    label: Total Overhead Weeks
    baseValue: 2
    targetMin: 1
    targetMax: 4
sliders:
  - id: s1
    label: Sprint Length (weeks)
    min: 4
    max: 12
    step: 2
    effects:
      - outputId: out1
        multiplier: 1
      - outputId: out2
        multiplier: -0.75
  - id: s2
    label: Extra Planning Weeks
    min: 0
    max: 2
    step: 1
    effects:
      - outputId: out1
        multiplier: -1
      - outputId: out3
        multiplier: 1
  - id: s3
    label: Extra Adaptation Weeks
    min: 0
    max: 2
    step: 1
    effects:
      - outputId: out1
        multiplier: -1
      - outputId: out3
        multiplier: 1
cards:
  - id: c1
    label: Mid-Sprint Review
    effects:
      - outputId: out2
        multiplier: 1.5
  - id: c2
    label: Lightweight Docs
    effects:
      - outputId: out3
        multiplier: -0.5
:::

:::mechanic-private
id: agile-core-framework-easy-c7-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: agile-core-framework-easy-c7-m1
version: 1
lessonSlug: agile-core-framework-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: initial-baseline-configuration
  position: after
concepts:
  - Sprint duration tradeoffs
  - Baseline planning and adaptation allocation
  - Feedback frequency vs. execution time
skills:
  - recall
domain: project-management-studies
prompt: >-
  Tune the Sprint length and planning/adaptation weeks so all three metrics land
  in their target ranges.
validator:
  kind: invariants
  ref: agile-core-framework-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: agile-core-framework-easy-c7-m1:public
privateValidatorRef: agile-core-framework-easy-c7-m1:private
rewardIdentity: agile-core-framework-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c8-m1
version: 1
sourceDomain: Agile project management
targetDomain: Academic research project management
scenario: >-
  A university research lab wants to apply Agile's success parameters and shared
  traits to its work. Which approach best transfers the core structural logic of
  Agile — its sprint duration range, team-size limit, sponsor commitment,
  requirement flexibility, and shared foundation with traditional management?
options:
  - id: a
    content: >-
      Structure lab work into 4–12 week investigation cycles with
      cross-functional teams of 10–15, require the principal investigator to be
      fully present at every review, and let research questions be repositioned
      between cycles as new evidence emerges.
  - id: b
    content: >-
      Set fixed annual research milestones with large collaborative teams of 30+
      researchers, require only occasional check-ins from the principal
      investigator, and lock the original research questions before any
      experiments begin.
:::

:::mechanic-private
id: agile-core-framework-easy-c8-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: agile-core-framework-easy-c8-m1
version: 1
lessonSlug: agile-core-framework-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: what-agile-shares-with-traditional-project-management
  position: after
concepts:
  - Agile success parameters
  - Shared traits with traditional project management
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: agile-core-framework-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: agile-core-framework-easy-c8-m1:public
privateValidatorRef: agile-core-framework-easy-c8-m1:private
rewardIdentity: agile-core-framework-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: agile-core-framework-easy-c9-m1
version: 1
scenario: Match each clue to the team belief it most obviously supports.
theories:
  - id: th-a
    content: Agile means no planning
  - id: th-b
    content: Constraints are obstacles to creativity
clues:
  - id: c1
    content: Team skips Sprint planning to save time
  - id: c2
    content: No upfront specs are written before work begins
  - id: c3
    content: Strict budget limited the range of design options
  - id: c4
    content: A tight deadline blocked creative exploration
:::

:::mechanic-private
id: agile-core-framework-easy-c9-m1
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
id: agile-core-framework-easy-c9-m1
version: 1
lessonSlug: agile-core-framework-easy
type: evidence-match
tier: Easy
anchor:
  heading: misconception-5-hybrid-means-inconsistent
  position: after
concepts:
  - Agile misconceptions
  - Constraints and creativity
skills:
  - recall
domain: project-management-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: agile-core-framework-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: agile-core-framework-easy-c9-m1:public
privateValidatorRef: agile-core-framework-easy-c9-m1:private
rewardIdentity: agile-core-framework-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"agile-versus-traditional-project-management"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"selecting-the-right-projects-ideal-agile-candidates"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"the-hybrid-approach-best-of-both-worlds"},{"mechanicType":"multiple-choice","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"what-the-pds-contains"},{"mechanicType":"quick-classification","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"understanding-constraints"},{"mechanicType":"parameter-tuner","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"initial-baseline-configuration"},{"mechanicType":"abstract-transfer","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"what-agile-shares-with-traditional-project-management"},{"mechanicType":"evidence-match","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-hybrid-means-inconsistent"}]}
:::