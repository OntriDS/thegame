:::mechanic-data
id: 01-blitzscaling-growth-strategy-principles-easy-c3-m1
version: 1
categories:
  - id: cat-a
    label: Scale
  - id: cat-b
    label: Learning
items:
  - id: i1
    content: winner-take-most market
  - id: i2
    content: distribution advantages
  - id: i3
    content: ship unfinished products
  - id: i4
    content: adapt to market changes
:::

:::mechanic-private
id: 01-blitzscaling-growth-strategy-principles-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-a
  i3: cat-b
  i4: cat-b
:::

:::mechanic
schemaVersion: 1
id: 01-blitzscaling-growth-strategy-principles-easy-c3-m1
version: 1
lessonSlug: blitzscaling-easy
type: quick-classification
tier: Easy
anchor:
  heading: principle-5-learn-quickly-the-world-is-constantly-changing
  position: after
concepts:
  - blitzscaling principles
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort the blitzscaling ideas: Scale or Learning'
validator:
  kind: mapping
  ref: blitzscaling-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: blitzscaling-easy-c3-m1:public
privateValidatorRef: blitzscaling-easy-c3-m1:private
rewardIdentity: blitzscaling-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-blitzscaling-growth-strategy-principles-easy-c4-m1
version: 1
attributes:
  - id: focus
    label: Focus
  - id: plan
    label: Scale Plan
components:
  - id: c1
    content: >-
      Define a specific target market and customer group to guide resource
      allocation and progress measurement.
    metrics:
      focus: 9
      plan: 4
  - id: c2
    content: >-
      Compare the company’s growth pace with the primary competitor’s growth
      pace.
    metrics:
      focus: 5
      plan: 3
  - id: c3
    content: >-
      Identify a source of competitive advantage such as proprietary technology,
      partnerships, brand, network effects, data, or talent.
    metrics:
      focus: 6
      plan: 5
  - id: c4
    content: >-
      Set decisions for funding, hiring, infrastructure, geography, and
      priorities to support rapid growth.
    metrics:
      focus: 7
      plan: 9
requirements:
  - attributeId: focus
    operator: '>='
    value: 7
  - attributeId: plan
    operator: '>='
    value: 4
:::

:::mechanic-private
id: 01-blitzscaling-growth-strategy-principles-easy-c4-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 01-blitzscaling-growth-strategy-principles-easy-c4-m1
version: 1
lessonSlug: blitzscaling-easy
type: constraint-construction
tier: Easy
anchor:
  heading: question-4-what-is-our-scale-strategy
  position: after
concepts:
  - blitzscaling readiness questions
skills:
  - recall
domain: business-systems-studies
prompt: Select components that meet all constraints.
validator:
  kind: invariants
  ref: blitzscaling-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: blitzscaling-easy-c4-m1:public
privateValidatorRef: blitzscaling-easy-c4-m1:private
rewardIdentity: blitzscaling-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-blitzscaling-growth-strategy-principles-easy-c5-m1
version: 1
items:
  - id: i1
    content: 'Family: informal, direct communication'
  - id: i2
    content: 'Tribe: teams and departments begin to form'
  - id: i3
    content: 'Village: processes and policies become necessary'
  - id: i4
    content: 'City: culture becomes the main alignment tool'
:::

:::mechanic-private
id: 01-blitzscaling-growth-strategy-principles-easy-c5-m1
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
id: 01-blitzscaling-growth-strategy-principles-easy-c5-m1
version: 1
lessonSlug: blitzscaling-easy
type: sequence-builder
tier: Easy
anchor:
  heading: level-5-nation-10-000-employees
  position: after
concepts:
  - company growth levels
skills:
  - recall
domain: business-systems-studies
prompt: How company growth levels unfold from smallest team to large organization
validator:
  kind: sequence
  ref: blitzscaling-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: blitzscaling-easy-c5-m1:public
privateValidatorRef: blitzscaling-easy-c5-m1:private
rewardIdentity: blitzscaling-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-blitzscaling-growth-strategy-principles-easy-c6-m1
version: 1
scenario: Match each clue to the theory it supports.
theories:
  - id: th-a
    content: >-
      Blitzscaling is strategic growth, not reckless spending, and it only fits
      certain markets.
  - id: th-b
    content: >-
      Blitzscaling still needs balance and flexibility, so speed and growth
      levels are not rigid rules.
clues:
  - id: c1
    content: Accepting short-term losses does not mean wasting money.
  - id: c2
    content: >-
      A social network may benefit more from blitzscaling than a local
      restaurant.
  - id: c3
    content: Fast growth must still protect product quality, advantage, and culture.
  - id: c4
    content: >-
      A company can skip or revisit growth levels instead of following a fixed
      order.
:::

:::mechanic-private
id: 01-blitzscaling-growth-strategy-principles-easy-c6-m1
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
id: 01-blitzscaling-growth-strategy-principles-easy-c6-m1
version: 1
lessonSlug: blitzscaling-easy
type: evidence-match
tier: Easy
anchor:
  heading: misconception-4-the-five-growth-levels-are-strict-and-linear
  position: after
concepts:
  - common misconceptions about blitzscaling
skills:
  - recall
domain: business-systems-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: blitzscaling-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: blitzscaling-easy-c6-m1:public
privateValidatorRef: blitzscaling-easy-c6-m1:private
rewardIdentity: blitzscaling-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-blitzscaling-growth-strategy-principles-easy-c2-m1
version: 1
question: What does blitzscaling favor?
options:
  - id: a
    content: Speed of growth
  - id: b
    content: High efficiency first
  - id: c
    content: Stable margins now
:::

:::mechanic-private
id: 01-blitzscaling-growth-strategy-principles-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-blitzscaling-growth-strategy-principles-easy-c2-m1
version: 1
lessonSlug: blitzscaling-easy
type: multiple-choice
tier: Easy
anchor:
  heading: what-is-blitzscaling
  position: after
concepts:
  - blitzscaling goal
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: blitzscaling-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: blitzscaling-easy-c2-m1:public
privateValidatorRef: blitzscaling-easy-c2-m1:private
rewardIdentity: blitzscaling-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"principle-5-learn-quickly-the-world-is-constantly-changing"},{"mechanicType":"constraint-construction","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"question-4-what-is-our-scale-strategy"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"level-5-nation-10-000-employees"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"misconception-4-the-five-growth-levels-are-strict-and-linear"},{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"what-is-blitzscaling"}]}
:::
