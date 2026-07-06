---
type: gamified-lesson-mechanics
lesson_slug: business-plan-easy
domain: business-systems-studies
---




:::mechanic-data
id: business-plan-easy-c3-m1
version: 1
categories:
  - id: cat-sizing
    label: Sizing
  - id: cat-customer
    label: Customers
items:
  - id: i1
    content: Market research reports
  - id: i2
    content: Industry growth rates
  - id: i3
    content: Competitor revenue data
  - id: i4
    content: Customer demographics
  - id: i5
    content: Customer pain points
  - id: i6
    content: Buying habits
:::

:::mechanic-private
id: business-plan-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-sizing
  i2: cat-sizing
  i3: cat-sizing
  i4: cat-customer
  i5: cat-customer
  i6: cat-customer
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c3-m1
version: 1
lessonSlug: business-plan-easy
type: quick-classification
tier: Easy
anchor:
  heading: customer-characteristics
  position: after
concepts:
  - market sizing
  - customer characteristics
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort the market research concepts: Sizing the Market or Knowing the Customer'
validator:
  kind: mapping
  ref: business-plan-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-plan-easy-c3-m1:public
privateValidatorRef: business-plan-easy-c3-m1:private
rewardIdentity: business-plan-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c4-m1
version: 1
scenario: >-
  A founder is describing their training offering. Decide whether each clue
  matches a bad description (jargon-heavy, vague, feature-focused) or a good
  description (plain language, benefit-focused, concrete result).
theories:
  - id: th-a
    content: Bad description
  - id: th-b
    content: Good description
clues:
  - id: c1
    content: Uses the phrase 'best-in-class immersive learning experience'.
  - id: c2
    content: >-
      States a concrete outcome like 'shorter presentations and faster
      approval.'
  - id: c3
    content: Packs in jargon such as 'bi-directional communication strategies.'
  - id: c4
    content: Explains in plain language what the customer actually gains.
:::

:::mechanic-private
id: business-plan-easy-c4-m1
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
id: business-plan-easy-c4-m1
version: 1
lessonSlug: business-plan-easy
type: evidence-match
tier: Easy
anchor:
  heading: the-bad-example-vs-the-good-example
  position: after
concepts:
  - clear product/service description
skills:
  - recall
domain: business-systems-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: business-plan-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-plan-easy-c4-m1:public
privateValidatorRef: business-plan-easy-c4-m1:private
rewardIdentity: business-plan-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c5-m1
version: 1
scenario: >-
  Your SaaS startup is finalizing its pricing strategy. Two approaches are on
  the table, each with clear tradeoffs.
options:
  - id: a
    content: >-
      Cost-Based Pricing: calculate total costs (including your time valued per
      day) and add a fixed profit margin
    pros:
      - ensures costs are covered
      - simple to calculate and justify
      - predictable margin
    cons:
      - may undervalue the offer
      - ignores customer perceived worth
      - can limit profit potential
  - id: b
    content: >-
      Value-Based Pricing: determine the value your product delivers to the
      customer and price according to that benefit
    pros:
      - aligns price with customer benefit
      - better margins possible
      - captures market share potential
    cons:
      - harder to calculate and defend
      - requires deep customer research
      - risk of overpricing without market validation
:::

:::mechanic-private
id: business-plan-easy-c5-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c5-m1
version: 1
lessonSlug: business-plan-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: pricing-strategy
  position: after
concepts:
  - pricing strategy
  - cost-based pricing
  - value-based pricing
skills:
  - recall
domain: business-systems-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: business-plan-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: business-plan-easy-c5-m1:public
privateValidatorRef: business-plan-easy-c5-m1:private
rewardIdentity: business-plan-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c6-m1
version: 1
scenario: >-
  A growing startup is missing deliveries and losing customers. Diagnose the
  operational issue and tune the controls to fix it.
symptoms:
  - >-
    Average delivery time has stretched from 3 days to 9 days over the last
    quarter
  - Customer support tickets about unfulfilled orders have doubled
diagnoses:
  - id: d1
    content: An operational bottleneck in fulfillment that was never scaled with demand
  - id: d2
    content: A flaw in the core product design
  - id: d3
    content: Pricing that is too high for the market
parameters:
  - id: p1
    label: Fulfillment Capacity
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Process Automation Level
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Inventory Buffer
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: business-plan-easy-c6-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: '>='
    targetValue: 75
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c6-m1
version: 1
lessonSlug: business-plan-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: operational-bottlenecks
  position: after
concepts:
  - operational scalability
  - bottleneck identification
skills:
  - recall
domain: business-systems-studies
prompt: Diagnose the operational breakdown and apply the right fix.
validator:
  kind: invariants
  ref: business-plan-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: business-plan-easy-c6-m1:public
privateValidatorRef: business-plan-easy-c6-m1:private
rewardIdentity: business-plan-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c7-m1
version: 1
question: Which describes a good org structure?
options:
  - id: a
    content: Clear roles and SOPs
  - id: b
    content: One founder does all tasks
  - id: c
    content: No external advisors
:::

:::mechanic-private
id: business-plan-easy-c7-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c7-m1
version: 1
lessonSlug: business-plan-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-bad-example-vs-the-good-example
  position: after
concepts:
  - good organizational structure
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: business-plan-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-plan-easy-c7-m1:public
privateValidatorRef: business-plan-easy-c7-m1:private
rewardIdentity: business-plan-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c8-m1
version: 1
attributes:
  - id: cac
    label: Customer Acquisition Cost ($)
  - id: ltv
    label: Customer Lifetime Value ($)
components:
  - id: c1
    content: >-
      Content marketing — publish thought leadership articles and educational
      materials to attract organic search traffic
    metrics:
      cac: 50
      ltv: 800
  - id: c2
    content: >-
      Paid digital advertising — run targeted social media ad campaigns to drive
      immediate sign-ups
    metrics:
      cac: 150
      ltv: 500
  - id: c3
    content: >-
      Referral program — offer existing customers a reward for bringing in new
      buyers
    metrics:
      cac: 80
      ltv: 1200
  - id: c4
    content: >-
      Trade show presence — exhibit at industry conferences to secure enterprise
      contracts
    metrics:
      cac: 300
      ltv: 2000
requirements:
  - attributeId: cac
    operator: <=
    value: 100
    description: Keep customer acquisition cost at or below $100
  - attributeId: ltv
    operator: '>='
    value: 600
    description: Maintain customer lifetime value at or above $600
:::

:::mechanic-private
id: business-plan-easy-c8-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c8-m1
version: 1
lessonSlug: business-plan-easy
type: constraint-construction
tier: Easy
anchor:
  heading: funding-requirements
  position: after
concepts:
  - Key Performance Indicators (KPIs)
  - Customer Acquisition Cost (CAC)
  - Customer Lifetime Value (LTV)
skills:
  - recall
domain: business-systems-studies
prompt: Select customer acquisition strategies that satisfy all financial constraints.
validator:
  kind: invariants
  ref: business-plan-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: business-plan-easy-c8-m1:public
privateValidatorRef: business-plan-easy-c8-m1:private
rewardIdentity: business-plan-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c9-m1
version: 1
question: What makes business communication professional?
options:
  - id: a
    content: Clear and accessible language
  - id: b
    content: Heavy use of technical jargon
  - id: c
    content: Long, complex sentences
:::

:::mechanic-private
id: business-plan-easy-c9-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c9-m1
version: 1
lessonSlug: business-plan-easy
type: multiple-choice
tier: Easy
anchor:
  heading: >-
    misconception-5-i-do-not-need-to-worry-about-operations-until-the-business-grows
  position: after
concepts:
  - clear business communication
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: business-plan-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-plan-easy-c9-m1:public
privateValidatorRef: business-plan-easy-c9-m1:private
rewardIdentity: business-plan-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: business-plan-easy-c2-m1
version: 1
question: What should a problem statement name?
options:
  - id: a
    content: Who has the problem
  - id: b
    content: Your future office
  - id: c
    content: Your legal structure
:::

:::mechanic-private
id: business-plan-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: business-plan-easy-c2-m1
version: 1
lessonSlug: business-plan-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-problem-statement
  position: after
concepts:
  - problem statement
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: business-plan-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-plan-easy-c2-m1:public
privateValidatorRef: business-plan-easy-c2-m1:private
rewardIdentity: business-plan-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"customer-characteristics"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"the-bad-example-vs-the-good-example"},{"mechanicType":"tradeoff-decision","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"pricing-strategy"},{"mechanicType":"diagnostic-lab","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"operational-bottlenecks"},{"mechanicType":"multiple-choice","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"the-bad-example-vs-the-good-example"},{"mechanicType":"constraint-construction","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"funding-requirements"},{"mechanicType":"multiple-choice","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-i-do-not-need-to-worry-about-operations-until-the-business-grows"},{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"the-problem-statement"}]}
:::