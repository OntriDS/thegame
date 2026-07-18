:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c4-m1
version: 1
categories:
  - id: cat-a
    label: Mass Mkt
  - id: cat-b
    label: Niche Mkt
items:
  - id: i1
    content: Basic smartphones
  - id: i2
    content: Gear for left-handers
  - id: i3
    content: Everyday soap bars
  - id: i4
    content: Software for rare book fans
  - id: i5
    content: Generic email service
  - id: i6
    content: Custom racing wheelchairs
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c4-m1
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
id: 03-business-model-canvas-strategy-easy-c4-m1
version: 1
lessonSlug: business-model-canvas-easy
type: quick-classification
tier: Easy
anchor:
  heading: block-1-customer-segments
  position: after
concepts:
  - customer segments
  - mass market
  - niche market
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort the customer segment examples: Mass Market or Niche Market'
validator:
  kind: mapping
  ref: business-model-canvas-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c4-m1:public
privateValidatorRef: business-model-canvas-easy-c4-m1:private
rewardIdentity: business-model-canvas-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c5-m1
version: 1
scenario: >-
  A startup is refining its value proposition. Match each customer benefit to
  the type of value it delivers.
theories:
  - id: th-functional
    content: Functional value (solves a practical problem)
  - id: th-emotional
    content: Emotional value (makes the customer feel something)
clues:
  - id: c1
    content: Faster delivery service that saves time
  - id: c2
    content: A sense of belonging and pride
  - id: c3
    content: Helps busy professionals eat healthy meals in under 10 minutes
  - id: c4
    content: Boosts the customer's confidence
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c5-m1
version: 1
kind: mapping
matches:
  c1: th-functional
  c2: th-emotional
  c3: th-functional
  c4: th-emotional
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c5-m1
version: 1
lessonSlug: business-model-canvas-easy
type: evidence-match
tier: Easy
anchor:
  heading: block-2-value-propositions
  position: after
concepts:
  - value proposition types
  - functional vs emotional value
skills:
  - recall
domain: business-systems-studies
prompt: Which value proposition type do these clues support?
validator:
  kind: mapping
  ref: business-model-canvas-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c5-m1:public
privateValidatorRef: business-model-canvas-easy-c5-m1:private
rewardIdentity: business-model-canvas-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c6-m1
version: 1
items:
  - id: i1
    content: >-
      Communicate the value proposition so potential customers become aware of
      the offering
  - id: i2
    content: >-
      Distribute the product or service so it physically or digitally reaches
      the customer
  - id: i3
    content: Close the sale by completing the transaction and receiving payment
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c6-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c6-m1
version: 1
lessonSlug: business-model-canvas-easy
type: sequence-builder
tier: Easy
anchor:
  heading: block-3-channels
  position: after
concepts:
  - channel functions
  - customer journey through channels
skills:
  - recall
domain: business-systems-studies
prompt: >-
  How channels move a customer from first hearing about a product to completing
  a purchase
validator:
  kind: sequence
  ref: business-model-canvas-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: business-model-canvas-easy-c6-m1:public
privateValidatorRef: business-model-canvas-easy-c6-m1:private
rewardIdentity: business-model-canvas-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c7-m1
version: 1
scenario: >-
  A new video streaming platform is preparing to launch and must decide how to
  build ongoing relationships with millions of subscribers.
options:
  - id: a
    content: Personal Assistance — staff human support agents for every subscriber
    pros:
      - builds deep trust with each customer
      - handles complex billing and technical issues with empathy
    cons:
      - very expensive to scale
      - response times slow as the user base grows
      - unsustainable for millions of subscribers
  - id: b
    content: Self-Service Only — provide a comprehensive help center and FAQs
    pros:
      - very low cost to operate
      - scales easily with subscriber growth
    cons:
      - frustrating for users with unique problems
      - no personalization
      - weak loyalty compared to richer relationship types
  - id: c
    content: Automated Services — AI-driven recommendations and chatbot support
    pros:
      - personalized experience at scale
      - cost-effective over the long term
      - matches what subscribers expect from a streaming service
    cons:
      - requires significant upfront technology investment
      - less human warmth for sensitive issues
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 1
  c: 4
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c7-m1
version: 1
lessonSlug: business-model-canvas-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: block-4-customer-relationships
  position: after
concepts:
  - customer relationships
  - matching relationship style to customer expectations
  - scalability of relationship types
skills:
  - recall
domain: business-systems-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: business-model-canvas-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: business-model-canvas-easy-c7-m1:public
privateValidatorRef: business-model-canvas-easy-c7-m1:private
rewardIdentity: business-model-canvas-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c8-m1
version: 1
categories:
  - id: cat-a
    label: Recurring
  - id: cat-b
    label: One-time
items:
  - id: i1
    content: Netflix monthly plan
  - id: i2
    content: Buying a new car
  - id: i3
    content: Gym annual membership
  - id: i4
    content: Purchasing a book
  - id: i5
    content: Monthly software access
  - id: i6
    content: Buying a phone
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c8-m1
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
id: 03-business-model-canvas-strategy-easy-c8-m1
version: 1
lessonSlug: business-model-canvas-easy
type: quick-classification
tier: Easy
anchor:
  heading: block-5-revenue-streams
  position: after
concepts:
  - revenue streams
  - subscription model
  - asset sale
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort these business examples: Recurring revenue or One-time payment'
validator:
  kind: mapping
  ref: business-model-canvas-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c8-m1:public
privateValidatorRef: business-model-canvas-easy-c8-m1:private
rewardIdentity: business-model-canvas-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c9-m1
version: 1
scenario: Match each clue to the type of Key Resource it describes.
theories:
  - id: th-a
    content: >-
      Physical Resources — tangible assets like buildings, equipment, vehicles,
      machinery, and inventory.
  - id: th-b
    content: >-
      Intellectual Resources — intangible assets like patents, copyrights, brand
      reputation, data, and proprietary knowledge.
clues:
  - id: c1
    content: A delivery company needs trucks and warehouses to move packages.
  - id: c2
    content: >-
      A pharmaceutical company relies on patented research to protect its
      discoveries.
  - id: c3
    content: >-
      A factory cannot operate without machinery and equipment on the production
      floor.
  - id: c4
    content: >-
      A software firm guards its copyrights, brand reputation, and proprietary
      data.
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c9-m1
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
id: 03-business-model-canvas-strategy-easy-c9-m1
version: 1
lessonSlug: business-model-canvas-easy
type: evidence-match
tier: Easy
anchor:
  heading: block-6-key-resources
  position: after
concepts:
  - Physical Resources
  - Intellectual Resources
skills:
  - recall
domain: business-systems-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: business-model-canvas-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c9-m1:public
privateValidatorRef: business-model-canvas-easy-c9-m1:private
rewardIdentity: business-model-canvas-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c10-m1
version: 1
scenario: >-
  An online retailer promises 24-hour delivery, but orders routinely arrive 3-5
  days late and complaints are climbing.
symptoms:
  - Orders arriving 3-5 days late despite the 24-hour delivery promise
  - Customer complaint volume has more than doubled in the past month
diagnoses:
  - id: d1
    content: >-
      Operations and logistics are under-resourced relative to the delivery
      promise
  - id: d2
    content: Sales and marketing are over-promising in their advertising
  - id: d3
    content: Finance administration is mishandling payroll and invoicing
parameters:
  - id: p1
    label: Operations & Logistics Capacity
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Sales & Marketing Spend
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c10-m1
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
id: 03-business-model-canvas-strategy-easy-c10-m1
version: 1
lessonSlug: business-model-canvas-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: block-7-key-activities
  position: after
concepts:
  - key activities
  - value proposition alignment
  - operations
skills:
  - recall
domain: business-systems-studies
prompt: Diagnose why this business is failing to deliver on its value proposition.
validator:
  kind: invariants
  ref: business-model-canvas-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: business-model-canvas-easy-c10-m1:public
privateValidatorRef: business-model-canvas-easy-c10-m1:private
rewardIdentity: business-model-canvas-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c11-m1
version: 1
scenario: >-
  Your food delivery startup has great software but needs restaurant listings
  and delivery capacity fast. You must launch before competitors lock up the
  market. Which partnership approach fits your need for speed?
options:
  - id: a
    content: Form non-equity alliances with established restaurant chains
    pros:
      - immediate access to recognizable brands and customers
      - no equity given up, so you keep full ownership
      - faster to launch since no new legal entity is needed
      - low upfront cost compared to building your own
    cons:
      - less control over which restaurants join
      - compete with other delivery apps for the same chains
  - id: b
    content: Create a joint venture with a logistics company for delivery
    pros:
      - dedicated delivery infrastructure built for your service
      - shared setup costs and shared risk
    cons:
      - slower to launch because a new legal entity must be formed
      - profits and key decisions are split with the partner
      - delays market entry while competitors move first
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c11-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
hints:
  b: >-
    Re-read the scenario: speed to market is the priority. Forming a new legal
    entity usually takes weeks or months of negotiation.
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c11-m1
version: 1
lessonSlug: business-model-canvas-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: block-8-key-partnerships
  position: after
concepts:
  - key partnerships
  - alliances vs joint ventures
  - partnership tradeoffs
skills:
  - recall
domain: business-systems-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: business-model-canvas-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: business-model-canvas-easy-c11-m1:public
privateValidatorRef: business-model-canvas-easy-c11-m1:private
rewardIdentity: business-model-canvas-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c12-m1
version: 1
question: Which cost stays the same regardless of sales?
options:
  - id: a
    content: Fixed costs
  - id: b
    content: Variable costs
  - id: c
    content: Economies of scale
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c12-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c12-m1
version: 1
lessonSlug: business-model-canvas-easy
type: multiple-choice
tier: Easy
anchor:
  heading: block-9-cost-structure
  position: after
concepts:
  - fixed costs
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: business-model-canvas-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c12-m1:public
privateValidatorRef: business-model-canvas-easy-c12-m1:private
rewardIdentity: business-model-canvas-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c14-m1
version: 1
categories:
  - id: cat-a
    label: Market
  - id: cat-b
    label: Industry
items:
  - id: i1
    content: Customer behavior
  - id: i2
    content: Competitors
  - id: i3
    content: Switching costs
  - id: i4
    content: Suppliers
  - id: i5
    content: Market segments
  - id: i6
    content: New entrants
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c14-m1
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
id: 03-business-model-canvas-strategy-easy-c14-m1
version: 1
lessonSlug: business-model-canvas-easy
type: quick-classification
tier: Easy
anchor:
  heading: navigating-your-canvas-the-external-forces
  position: after
concepts:
  - Market Forces
  - Industry Forces
  - external environmental forces
skills:
  - recall
domain: business-systems-studies
prompt: 'Sort the external forces around your canvas: Market or Industry'
validator:
  kind: mapping
  ref: business-model-canvas-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c14-m1:public
privateValidatorRef: business-model-canvas-easy-c14-m1:private
rewardIdentity: business-model-canvas-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c15-m1
version: 1
question: A business model canvas is best described as?
options:
  - id: a
    content: a visual one-page overview
  - id: b
    content: a detailed multi-year plan
  - id: c
    content: a financial projection only
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c15-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c15-m1
version: 1
lessonSlug: business-model-canvas-easy
type: multiple-choice
tier: Easy
anchor:
  heading: misconception-5-the-business-model-canvas-is-a-one-time-exercise
  position: after
concepts:
  - business model canvas vs business plan
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: business-model-canvas-easy-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c15-m1:public
privateValidatorRef: business-model-canvas-easy-c15-m1:private
rewardIdentity: business-model-canvas-easy-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-business-model-canvas-strategy-easy-c2-m1
version: 1
question: What does a business model do?
options:
  - id: a
    content: Creates, delivers, captures
  - id: b
    content: Only sets office rules
  - id: c
    content: Only tracks work hours
:::

:::mechanic-private
id: 03-business-model-canvas-strategy-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-business-model-canvas-strategy-easy-c2-m1
version: 1
lessonSlug: business-model-canvas-easy
type: multiple-choice
tier: Easy
anchor:
  heading: what-is-a-business-model
  position: after
concepts:
  - business model purpose
skills:
  - recall
domain: business-systems-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: business-model-canvas-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: business-model-canvas-easy-c2-m1:public
privateValidatorRef: business-model-canvas-easy-c2-m1:private
rewardIdentity: business-model-canvas-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,4,5,6,7,8,9,10,11,12,14,15],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"block-1-customer-segments"},{"mechanicType":"evidence-match","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"block-2-value-propositions"},{"mechanicType":"sequence-builder","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"block-3-channels"},{"mechanicType":"tradeoff-decision","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"block-4-customer-relationships"},{"mechanicType":"quick-classification","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"block-5-revenue-streams"},{"mechanicType":"evidence-match","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"block-6-key-resources"},{"mechanicType":"diagnostic-lab","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"block-7-key-activities"},{"mechanicType":"tradeoff-decision","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"block-8-key-partnerships"},{"mechanicType":"multiple-choice","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"block-9-cost-structure"},{"mechanicType":"quick-classification","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"navigating-your-canvas-the-external-forces"},{"mechanicType":"multiple-choice","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-the-business-model-canvas-is-a-one-time-exercise"},{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"what-is-a-business-model"}]}
:::