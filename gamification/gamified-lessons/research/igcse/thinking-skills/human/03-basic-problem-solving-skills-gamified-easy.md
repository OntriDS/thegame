:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c2-m1
version: 1
items:
  - id: i1
    content: Set the fixed meeting time
  - id: i2
    content: Determine the latest feasible train arrival
  - id: i3
    content: Calculate the latest departure and platform times
  - id: i4
    content: Work back to the time to leave home
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c2-m1
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
id: 03-basic-problem-solving-skills-easy-c2-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: sequence-builder
tier: Easy
anchor:
  heading: practical-principles
  position: after
concepts:
  - backward planning
skills:
  - recall
domain: igcse
prompt: How backward planning unfolds from the desired outcome to the present
validator:
  kind: sequence
  ref: 03-basic-problem-solving-skills-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c2-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c2-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c3-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Add each listed charge
  - id: s2
    content: Find the correct total
  - id: s3
    isMissing: true
  - id: s4
    content: Compare with the stated bill
  - id: s5
    isMissing: true
options:
  - id: o1
    content: Calculate the difference
  - id: o2
    content: Identify one dinner overcharge
  - id: o3
    content: Ignore the listed charges
  - id: o4
    content: Search every room
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c3-m1
version: 1
kind: mapping
matches:
  s3: o1
  s5: o2
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c3-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: missing-step
tier: Easy
anchor:
  heading: using-an-intermediate-result-a-hotel-bill
  position: after
concepts:
  - intermediate results
skills:
  - recall
domain: igcse
prompt: What's missing from the hotel bill process?
validator:
  kind: mapping
  ref: 03-basic-problem-solving-skills-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c3-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c3-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c5-m1
version: 1
categories:
  - id: cat-a
    label: Verify
  - id: cat-b
    label: Interpret
items:
  - id: i1
    content: Add jogging totals
  - id: i2
    content: Recalculate row total
  - id: i3
    content: Find temperature span
  - id: i4
    content: Count knockout matches
  - id: i5
    content: Compare route distances
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c5-m1
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
id: 03-basic-problem-solving-skills-easy-c5-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: quick-classification
tier: Easy
anchor:
  heading: worked-answers
  position: after
concepts:
  - checking and interpreting information
skills:
  - recall
domain: igcse
prompt: 'Sort the information-use tasks: Verify or Interpret'
validator:
  kind: mapping
  ref: 03-basic-problem-solving-skills-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c5-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c5-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c6-m1
version: 1
question: What is average speed?
options:
  - id: a
    content: Total distance ÷ total time
  - id: b
    content: Mean of separate speeds
  - id: c
    content: Fastest speed only
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c6-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: multiple-choice
tier: Easy
anchor:
  heading: examples
  position: after
concepts:
  - average speed
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 03-basic-problem-solving-skills-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c6-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c6-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c7-m1
version: 1
sourceDomain: Mathematical problem solving
targetDomain: Scientific investigation
scenario: >-
  Apply the core principles from mathematical problem solving to planning an
  investigation with unclear methods.
options:
  - id: a
    content: >-
      Organize relevant information, remove distractions, work from known
      evidence toward the result, test alternatives, and verify the conclusion
      against all conditions.
  - id: b
    content: >-
      Begin with every available detail, follow the first approach indefinitely,
      and accept the conclusion without checking it against the conditions.
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c7-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: railway-interval-method
  position: after
concepts:
  - method selection and intermediate results
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 03-basic-problem-solving-skills-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 03-basic-problem-solving-skills-easy-c7-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c7-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c8-m1
version: 1
attributes:
  - id: distance
    label: Distance (km)
  - id: townsVisited
    label: Towns visited
components:
  - id: route1
    content: Route candidate — 59 km through all towns and back
    metrics:
      distance: 59
      townsVisited: 4
  - id: route2
    content: Route candidate — 62 km through all towns and back
    metrics:
      distance: 62
      townsVisited: 4
  - id: route3
    content: Route candidate — 67 km through all towns and back
    metrics:
      distance: 67
      townsVisited: 4
requirements:
  - attributeId: distance
    operator: <=
    value: 59
  - attributeId: townsVisited
    operator: '=='
    value: 4
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c8-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c8-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: constraint-construction
tier: Easy
anchor:
  heading: shortest-route-search
  position: after
concepts:
  - systematic search
  - shortest-route optimization
skills:
  - recall
domain: igcse
prompt: Select a route that meets all constraints.
validator:
  kind: invariants
  ref: 03-basic-problem-solving-skills-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 03-basic-problem-solving-skills-easy-c8-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c8-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c9-m1
version: 1
scenario: Match each clue to the data-comparison theory it supports.
theories:
  - id: th-a
    content: Compare relative sizes and match data across different formats.
  - id: th-b
    content: Normalize values and infer only what the data supports.
clues:
  - id: c1
    content: >-
      Match bar lengths to ownership percentages even when category order
      changes.
  - id: c2
    content: Convert incorrectly averaged four-college percentages using 5/4.
  - id: c3
    content: Identify Idani from a largest pie segment just below half.
  - id: c4
    content: >-
      A ratio trend does not necessarily prove the same trend in absolute
      quantities.
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c9-m1
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
id: 03-basic-problem-solving-skills-easy-c9-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: evidence-match
tier: Easy
anchor:
  heading: missing-college-average
  position: after
concepts:
  - comparing data and recognizing patterns
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 03-basic-problem-solving-skills-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c9-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c9-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c10-m1
version: 1
scenario: >-
  A tram driver meets six opposing trams during a one-hour trip. The services
  run at regular intervals, and a round trip plus turnaround takes 130 minutes.
startNodeId: n1
nodes:
  - id: n1
    question: >-
      What departure interval fits six opposing trams in the two-hour departure
      window?
    options:
      - id: a1
        content: Every 20 minutes
        nextNodeId: n2
      - id: b1
        content: Every 5 minutes
        nextNodeId: null
      - id: c1
        content: Every 60 minutes
        nextNodeId: null
  - id: n2
    question: >-
      How many vehicles are needed for a 130-minute round trip with departures
      every 20 minutes?
    options:
      - id: a2
        content: Seven vehicles
        nextNodeId: null
      - id: b2
        content: Two vehicles
        nextNodeId: null
      - id: c2
        content: Twenty vehicles
        nextNodeId: null
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c10-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c10-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: prediction
tier: Easy
anchor:
  heading: tram-derivation
  position: after
concepts:
  - departure intervals
  - vehicle requirements
skills:
  - recall
domain: igcse
prompt: How does the tram-service scenario play out?
validator:
  kind: exact
  ref: 03-basic-problem-solving-skills-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 03-basic-problem-solving-skills-easy-c10-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c10-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c11-m1
version: 1
question: How many white tiles per black circle?
options:
  - id: a
    content: One white tile
  - id: b
    content: Two white tiles
  - id: c
    content: Three white tiles
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c11-m1
version: 1
kind: exact
correctAnswer: b
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c11-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: multiple-choice
tier: Easy
anchor:
  heading: general-practice-principles
  position: after
concepts:
  - tessellation unit
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 03-basic-problem-solving-skills-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c11-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c11-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c12-m1
version: 1
attributes:
  - id: coverage
    label: Arrival-time information
  - id: unrelated
    label: Unrelated information
components:
  - id: departure-time
    content: Departure time — records when the journey begins
    metrics:
      coverage: 1
      unrelated: 0
  - id: average-speed
    content: Average speed — represents the journey's average rate
    metrics:
      coverage: 1
      unrelated: 0
  - id: journey-distance
    content: Journey distance — measures the distance travelled
    metrics:
      coverage: 1
      unrelated: 0
  - id: trip-meter-reading
    content: Trip-meter reading — records distance driven since the last service
    metrics:
      coverage: 0
      unrelated: 1
requirements:
  - attributeId: coverage
    operator: '>='
    value: 3
  - attributeId: unrelated
    operator: <=
    value: 0
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c12-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c12-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: constraint-construction
tier: Easy
anchor:
  heading: examples
  position: after
concepts:
  - necessary and sufficient data
skills:
  - recall
domain: igcse
prompt: Select data that are necessary and sufficient to determine arrival time.
validator:
  kind: invariants
  ref: 03-basic-problem-solving-skills-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 03-basic-problem-solving-skills-easy-c12-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c12-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c13-m1
version: 1
scenario: >-
  Decide whether each clue shows how models help or why their conclusions are
  limited.
theories:
  - id: th-a
    content: >-
      Models support understanding, simulation, prediction, and what-if
      calculations.
  - id: th-b
    content: Model conclusions are limited by available data and omitted variables.
clues:
  - id: c1
    content: A graph makes the effects of different tax structures clear.
  - id: c2
    content: >-
      Economic models predict policy effects imperfectly because real economies
      contain too many variables.
  - id: c3
    content: A virtual walk-through helps architects understand a building design.
  - id: c4
    content: The taxi data cannot separate distance, hire, and time components.
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c13-m1
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
id: 03-basic-problem-solving-skills-easy-c13-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: evidence-match
tier: Easy
anchor:
  heading: inferring-a-taxi-pricing-model
  position: after
concepts:
  - uses and limits of models
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 03-basic-problem-solving-skills-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-basic-problem-solving-skills-easy-c13-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c13-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-basic-problem-solving-skills-easy-c14-m1
version: 1
scenario: >-
  You need to choose the best-value coffee offer from packages with different
  weights and prices.
options:
  - id: a
    content: Convert every offer to a 300 g equivalent before comparing prices
    pros:
      - uses a common comparison basis
      - reduces calculation errors
      - reveals the best value
    cons:
      - requires an extra calculation
  - id: b
    content: Compare the listed package prices directly
    pros:
      - is quick
      - uses the prices as displayed
    cons:
      - does not account for different package weights
      - can lead to an incorrect value comparison
:::

:::mechanic-private
id: 03-basic-problem-solving-skills-easy-c14-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 03-basic-problem-solving-skills-easy-c14-m1
version: 1
lessonSlug: 03-basic-problem-solving-skills-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: core-methods
  position: after
concepts:
  - common-basis comparison
  - best-value decisions
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 03-basic-problem-solving-skills-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 03-basic-problem-solving-skills-easy-c14-m1:public
privateValidatorRef: 03-basic-problem-solving-skills-easy-c14-m1:private
rewardIdentity: 03-basic-problem-solving-skills-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,5,6,7,8,9,10,11,12,13,14],"sectionMechanics":[{"mechanicType":"sequence-builder","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"practical-principles"},{"mechanicType":"missing-step","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"using-an-intermediate-result-a-hotel-bill"},{"mechanicType":"constraint-construction","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"practice-applications"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"worked-answers"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"examples"},{"mechanicType":"abstract-transfer","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"railway-interval-method"},{"mechanicType":"constraint-construction","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"shortest-route-search"},{"mechanicType":"evidence-match","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"missing-college-average"},{"mechanicType":"prediction","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"tram-derivation"},{"mechanicType":"multiple-choice","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"general-practice-principles"},{"mechanicType":"constraint-construction","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"examples"},{"mechanicType":"evidence-match","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"inferring-a-taxi-pricing-model"},{"mechanicType":"tradeoff-decision","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"core-methods"}]}
:::