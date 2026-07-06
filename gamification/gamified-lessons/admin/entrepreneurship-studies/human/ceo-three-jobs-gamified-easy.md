---
type: gamified-lesson-mechanics
lesson_slug: ceo-three-jobs-easy
domain: entrepreneurship-studies
---

:::mechanic-data
id: ceo-three-jobs-easy-c2-m1
version: 1
question: What is the founder's job?
options:
  - id: a
    content: Run and grow the business
  - id: b
    content: Execute every task
  - id: c
    content: Handle all client work
:::

:::mechanic-private
id: ceo-three-jobs-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: ceo-three-jobs-easy-c2-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-founder-s-common-trap
  position: after
concepts:
  - founder's role vs execution
skills:
  - recall
domain: entrepreneurship-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: ceo-three-jobs-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ceo-three-jobs-easy-c2-m1:public
privateValidatorRef: ceo-three-jobs-easy-c2-m1:private
rewardIdentity: ceo-three-jobs-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ceo-three-jobs-easy-c3-m1
version: 1
sourceDomain: Business team-building and delegation
targetDomain: Economics (division of labor and specialization)
scenario: >-
  A government is debating national economic policy. Some advisors recommend
  that each worker personally execute every stage of production. Others
  recommend that workers and regions specialize in distinct tasks and trade with
  one another. Applying the core lesson from team-building, which policy best
  captures the structural logic of how the restaurant scaled?
options:
  - id: a
    content: >-
      Let workers and regions specialize in distinct roles and trade outputs,
      because focused expertise combined with exchange multiplies total
      productivity and allows the economy to scale.
  - id: b
    content: >-
      Require each worker to personally perform every production task, mirroring
      the chef who cooked, served, cleaned, and did the books all at once.
  - id: c
    content: >-
      Place a single central authority in charge of personally running every
      business operation, treating the national economy like one large
      restaurant kitchen with one head chef.
:::

:::mechanic-private
id: ceo-three-jobs-easy-c3-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 0
  c: 1
hints:
  - id: hint-1
    matcher:
      optionId: b
    hint: >-
      The lesson's restaurant analogy treated the chef-doing-everything scenario
      as the failure case that prevented growth, not the model to copy.
  - id: hint-2
    matcher:
      optionId: c
    hint: >-
      This mirrors the surface imagery (one chef / one authority) but skips the
      core principle: delegation to specialists is what unlocks scaling.
:::

:::mechanic
schemaVersion: 1
id: ceo-three-jobs-easy-c3-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: the-restaurant-analogy
  position: after
concepts:
  - delegation effect
  - specialization
  - scaling through division of labor
skills:
  - recall
domain: entrepreneurship-studies
prompt: Transfer the team-building principle from the lesson into economics.
validator:
  kind: rubric
  ref: ceo-three-jobs-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: ceo-three-jobs-easy-c3-m1:public
privateValidatorRef: ceo-three-jobs-easy-c3-m1:private
rewardIdentity: ceo-three-jobs-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ceo-three-jobs-easy-c4-m1
version: 1
items:
  - id: i1
    content: Map the business systems to understand how the business actually works
  - id: i2
    content: Document the key processes so work steps are clearly written down
  - id: i3
    content: Hire for the first role that removes the most owner drag
  - id: i4
    content: Use the documented systems to onboard and train the new hire
:::

:::mechanic-private
id: ceo-three-jobs-easy-c4-m1
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
id: ceo-three-jobs-easy-c4-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: sequence-builder
tier: Easy
anchor:
  heading: a-critical-hiring-insight
  position: after
concepts:
  - team-building method
  - delegation sequence
skills:
  - recall
domain: entrepreneurship-studies
prompt: How the team-building method unfolds from start to finish
validator:
  kind: sequence
  ref: ceo-three-jobs-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: ceo-three-jobs-easy-c4-m1:public
privateValidatorRef: ceo-three-jobs-easy-c4-m1:private
rewardIdentity: ceo-three-jobs-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ceo-three-jobs-easy-c5-m1
version: 1
categories:
  - id: cat-timed
    label: Timed
  - id: cat-ongoing
    label: Ongoing
items:
  - id: i1
    content: Long-term goal (5-10 yrs)
  - id: i2
    content: 1-year goal (12 months)
  - id: i3
    content: Quarterly rocks
  - id: i4
    content: Core values
:::

:::mechanic-private
id: ceo-three-jobs-easy-c5-m1
version: 1
kind: mapping
matches:
  i1: cat-timed
  i2: cat-timed
  i3: cat-timed
  i4: cat-ongoing
:::

:::mechanic
schemaVersion: 1
id: ceo-three-jobs-easy-c5-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-direction-setting-framework
  position: after
concepts:
  - direction-setting framework
  - time horizons of goals
skills:
  - recall
domain: entrepreneurship-studies
prompt: 'Sort the direction-setting layers: Timed goal or Ongoing guide'
validator:
  kind: mapping
  ref: ceo-three-jobs-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ceo-three-jobs-easy-c5-m1:public
privateValidatorRef: ceo-three-jobs-easy-c5-m1:private
rewardIdentity: ceo-three-jobs-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ceo-three-jobs-easy-c6-m1
version: 1
scenario: >-
  Your service business is racing toward its 1,000-member annual goal while
  customer complaints are climbing. The team is stretched thin and leadership
  must choose how to allocate effort this quarter.
options:
  - id: a
    content: Redirect the entire team to aggressive new-member onboarding
    pros:
      - Faster progress toward the 1,000-member goal
      - Higher short-term revenue
      - Builds market momentum
    cons:
      - Existing members feel neglected
      - Service quality slips under pressure
  - id: b
    content: Pause new acquisition and focus all effort on resolving complaints
    pros:
      - Restores service quality
      - Reinforces the world-class product value
      - Reduces churn risk among current members
    cons:
      - Growth stalls for the quarter
      - Annual goal slips further out of reach
  - id: c
    content: >-
      Set a quarterly rock that dedicates specific time blocks to service
      quality while keeping growth targets on the calendar
    pros:
      - Protects both the growth goal and the quality value
      - Makes the dual priority visible to the whole team
      - Creates compounding progress toward the annual goal
    cons:
      - Requires more upfront planning
      - Neither metric moves as fast as a single-focus push
:::

:::mechanic-private
id: ceo-three-jobs-easy-c6-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 1
  c: 4
:::

:::mechanic
schemaVersion: 1
id: ceo-three-jobs-easy-c6-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: execution-guidance
  position: after
concepts:
  - goal-value alignment
  - quarterly rocks
  - execution discipline
skills:
  - recall
domain: entrepreneurship-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: ceo-three-jobs-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: ceo-three-jobs-easy-c6-m1:public
privateValidatorRef: ceo-three-jobs-easy-c6-m1:private
rewardIdentity: ceo-three-jobs-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ceo-three-jobs-easy-c7-m1
version: 1
scenario: >-
  Match each clue to the idea it supports: the owner being the business's
  ceiling, or the specific capabilities an owner should improve.
theories:
  - id: th-a
    content: The owner's capability is the ceiling of the business.
  - id: th-b
    content: >-
      Improving as an owner means building specific capabilities like focus,
      systems design, and bottleneck-solving.
clues:
  - id: c1
    content: >-
      The future quality of your business depends directly on your skill level
      as an owner.
  - id: c2
    content: >-
      Owners should deliberately work on focus, energy, prioritization, and
      leadership.
  - id: c3
    content: >-
      If you stop growing, you become the constraint and your business stops
      growing.
  - id: c4
    content: Building repeatable processes that scale is a key capability for an owner.
:::

:::mechanic-private
id: ceo-three-jobs-easy-c7-m1
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
id: ceo-three-jobs-easy-c7-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: evidence-match
tier: Easy
anchor:
  heading: what-improving-as-an-owner-means
  position: after
concepts:
  - owner as ceiling
  - owner self-improvement capabilities
skills:
  - recall
domain: entrepreneurship-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: ceo-three-jobs-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ceo-three-jobs-easy-c7-m1:public
privateValidatorRef: ceo-three-jobs-easy-c7-m1:private
rewardIdentity: ceo-three-jobs-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ceo-three-jobs-easy-c8-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Identify the current constraint
  - id: s2
    isMissing: true
  - id: s3
    content: Apply it directly to the business
  - id: s4
    isMissing: true
  - id: s5
    content: Repeat with the next constraint
options:
  - id: o1
    content: Learn the missing capability
  - id: o2
    content: Iterate until constraint removed
  - id: o3
    content: Hire a consultant immediately
  - id: o4
    content: Take a long vacation to reset
:::

:::mechanic-private
id: ceo-three-jobs-easy-c8-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: ceo-three-jobs-easy-c8-m1
version: 1
lessonSlug: ceo-three-jobs-easy
type: missing-step
tier: Easy
anchor:
  heading: examples-of-constraints-to-fix
  position: after
concepts:
  - systematic improvement cycle
  - constraint removal
skills:
  - recall
domain: entrepreneurship-studies
prompt: What's missing from the improvement method cycle?
validator:
  kind: mapping
  ref: ceo-three-jobs-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ceo-three-jobs-easy-c8-m1:public
privateValidatorRef: ceo-three-jobs-easy-c8-m1:private
rewardIdentity: ceo-three-jobs-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"the-founder-s-common-trap"},{"mechanicType":"abstract-transfer","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"the-restaurant-analogy"},{"mechanicType":"sequence-builder","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"a-critical-hiring-insight"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"the-direction-setting-framework"},{"mechanicType":"tradeoff-decision","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"execution-guidance"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"what-improving-as-an-owner-means"},{"mechanicType":"missing-step","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"examples-of-constraints-to-fix"}]}
:::