---
type: gamified-lesson-mechanics
lesson_slug: ecommerce-strategic-theory-easy
domain: finances-studies
---

:::mechanic-data
id: ecommerce-strategic-theory-easy-c2-m1
version: 1
categories:
  - id: cat-physical
    label: Physical
  - id: cat-digital
    label: Digital
items:
  - id: i1
    content: Track stock levels
  - id: i2
    content: Calculate shipping costs
  - id: i3
    content: Manage storage locations
  - id: i4
    content: Set up copyright protection
  - id: i5
    content: Define download limits
  - id: i6
    content: Set license duration
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-physical
  i2: cat-physical
  i3: cat-physical
  i4: cat-digital
  i5: cat-digital
  i6: cat-digital
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c2-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: quick-classification
tier: Easy
anchor:
  heading: 1-product-architecture
  position: after
concepts:
  - product architecture
  - physical products
  - digital products
skills:
  - recall
domain: finances-studies
prompt: 'Sort the e-commerce operations: Physical or Digital'
validator:
  kind: mapping
  ref: ecommerce-strategic-theory-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c2-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c2-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c3-m1
version: 1
question: Which supports tiered pricing?
options:
  - id: a
    content: Multiple-edition products
  - id: b
    content: Single-edition products
  - id: c
    content: Persistent cart systems
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c3-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c3-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 2-customer-definition
  position: after
concepts:
  - 'catalog strategy: multi-edition vs single-edition'
skills:
  - recall
domain: finances-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: ecommerce-strategic-theory-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c3-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c3-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c4-m1
version: 1
scenario: >-
  Your handmade goods business is gaining traction with individual buyers. You
  need to decide how to scale distribution and reach more customers.
options:
  - id: distributors
    content: Sell through third-party distributors and online marketplace platforms
    pros:
      - faster access to wider audiences
      - less operational burden on your team
    cons:
      - lower margin per sale
      - less control over brand experience
      - dependency on partner relationships
  - id: inhouse
    content: Handle distribution in-house through your own channels
    pros:
      - retain higher margin per sale
      - maintain control over customer experience
      - build direct relationships with buyers
    cons:
      - limited geographic reach
      - higher operational burden
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c4-m1
version: 1
kind: rubric
scoring:
  inhouse: 4
  distributors: 1
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c4-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: 3-operating-model
  position: after
concepts:
  - distribution strategy
  - operating model tradeoffs
  - margin vs reach
skills:
  - recall
domain: finances-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: ecommerce-strategic-theory-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: ecommerce-strategic-theory-easy-c4-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c4-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c5-m1
version: 1
categories:
  - id: cat-pricing
    label: Pricing
  - id: cat-content
    label: Content
items:
  - id: i1
    content: Break-even point
  - id: i2
    content: Payment ceiling
  - id: i3
    content: Price equilibrium
  - id: i4
    content: What problem does this solve?
  - id: i5
    content: How does it improve life?
  - id: i6
    content: Search traffic keywords
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c5-m1
version: 1
kind: mapping
matches:
  i1: cat-pricing
  i2: cat-pricing
  i3: cat-pricing
  i4: cat-content
  i5: cat-content
  i6: cat-content
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c5-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: quick-classification
tier: Easy
anchor:
  heading: 4-positioning-and-value
  position: after
concepts:
  - pricing strategy
  - content strategy
skills:
  - recall
domain: finances-studies
prompt: 'Sort the e-commerce strategy concepts: Pricing or Content'
validator:
  kind: mapping
  ref: ecommerce-strategic-theory-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c5-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c5-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c6-m1
version: 1
question: 'Cross-pollination shares strategies between:'
options:
  - id: a
    content: Online and physical stores
  - id: b
    content: Two online stores
  - id: c
    content: Two physical stores
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c6-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 5-competition
  position: after
concepts:
  - cross-pollination between channels
skills:
  - recall
domain: finances-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: ecommerce-strategic-theory-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c6-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c6-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c7-m1
version: 1
scenario: >-
  Match each marketing claim to either the passive 'build it and they will come'
  myth or the active, aggressive marketing approach.
theories:
  - id: th-a
    content: The 'build it and they will come' myth (passive marketing)
  - id: th-b
    content: An active, aggressive marketing strategy
clues:
  - id: c1
    content: Assume a quality product will automatically attract customers.
  - id: c2
    content: >-
      Launch a YouTube channel to demonstrate products and build a searchable
      content library.
  - id: c3
    content: Wait for organic discovery instead of running promotional campaigns.
  - id: c4
    content: >-
      Post consistent visual content on Instagram and Pinterest to drive
      high-intent traffic.
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c7-m1
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
id: ecommerce-strategic-theory-easy-c7-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: evidence-match
tier: Easy
anchor:
  heading: 6-online-marketing-myths-and-execution
  position: after
concepts:
  - online marketing strategy
  - content marketing
  - social media optimization
skills:
  - recall
domain: finances-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: ecommerce-strategic-theory-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c7-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c7-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c8-m1
version: 1
items:
  - id: i1
    content: Customer clicks 'Buy' and submits their shipping and contact details
  - id: i2
    content: >-
      Customer is redirected to the secure payment gateway to enter card
      information
  - id: i3
    content: >-
      Gateway verifies the card and checks that funds or credit are available
      with the issuing bank
  - id: i4
    content: Merchant confirms the order and sends a confirmation email to the customer
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c8-m1
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
id: ecommerce-strategic-theory-easy-c8-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: sequence-builder
tier: Easy
anchor:
  heading: 7-payment-gateways-flow-and-risks
  position: after
concepts:
  - payment gateway flow
  - checkout process
skills:
  - recall
domain: finances-studies
prompt: How the payment gateway checkout flow unfolds from start to finish
validator:
  kind: sequence
  ref: ecommerce-strategic-theory-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c8-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c8-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c9-m1
version: 1
scenario: Match each clue to the type of hosting it describes.
theories:
  - id: th-a
    content: Shared Hosting
  - id: th-b
    content: VPS / Private Hosting
clues:
  - id: c1
    content: >-
      Budget-friendly option that shares server resources with hundreds of other
      sites
  - id: c2
    content: Premium cost provides dedicated resources and higher security
  - id: c3
    content: The most economical hosting choice available
  - id: c4
    content: Warranted when handling sensitive data where a breach would be costly
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c9-m1
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
id: ecommerce-strategic-theory-easy-c9-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: evidence-match
tier: Easy
anchor:
  heading: 8-security-principles
  position: after
concepts:
  - Hosting Infrastructure
skills:
  - recall
domain: finances-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: ecommerce-strategic-theory-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c9-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c9-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c10-m1
version: 1
scenario: >-
  Your online store has slow-moving inventory taking up valuable warehouse
  space. You need to clear it out. Which stock clearance approach do you take?
options:
  - id: a
    content: Advertise discounts publicly across all marketing channels
    pros:
      - reaches the widest audience
      - clears inventory faster
      - attracts new one-time buyers
    cons:
      - devalues the brand in the broader market
      - trains shoppers to wait for future sales
      - erodes long-term profit margins
  - id: b
    content: >-
      Offer discounts exclusively through a targeted mailing list of retained
      customers
    pros:
      - rewards loyal customers
      - protects brand value
      - preserves profit margins
    cons:
      - slower inventory turnover
      - smaller reach for the promotion
      - may leave some stock unsold
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c10-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c10-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: 9-user-experience-ux-and-retention
  position: after
concepts:
  - stock clearance strategy
  - brand value preservation
  - customer retention
skills:
  - recall
domain: finances-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: ecommerce-strategic-theory-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: ecommerce-strategic-theory-easy-c10-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c10-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c11-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Define pricing rules & discounts
  - id: s2
    isMissing: true
  - id: s3
    content: Specify payment methods & checkout
  - id: s4
    isMissing: true
  - id: s5
    content: Outline fulfillment & shipping
options:
  - id: o1
    content: Determine inventory processes
  - id: o2
    content: Document customer service protocols
  - id: o3
    content: Start coding the website
  - id: o4
    content: Hire new employees
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c11-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c11-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: missing-step
tier: Easy
anchor:
  heading: 10-strategic-planning
  position: after
concepts:
  - strategic planning sequence
  - pre-development requirements
skills:
  - recall
domain: finances-studies
prompt: What's missing from the strategic planning process?
validator:
  kind: mapping
  ref: ecommerce-strategic-theory-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c11-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c11-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: ecommerce-strategic-theory-easy-c12-m1
version: 1
question: Compete on price to win customers?
options:
  - id: a
    content: Compete on value instead
  - id: b
    content: Yes, lower price wins
  - id: c
    content: Just match competitors
:::

:::mechanic-private
id: ecommerce-strategic-theory-easy-c12-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: ecommerce-strategic-theory-easy-c12-m1
version: 1
lessonSlug: ecommerce-strategic-theory-easy
type: multiple-choice
tier: Easy
anchor:
  heading: common-misconceptions
  position: after
concepts:
  - price competition misconception
skills:
  - recall
domain: finances-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: ecommerce-strategic-theory-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: ecommerce-strategic-theory-easy-c12-m1:public
privateValidatorRef: ecommerce-strategic-theory-easy-c12-m1:private
rewardIdentity: ecommerce-strategic-theory-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"1-product-architecture"},{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"2-customer-definition"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"3-operating-model"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"4-positioning-and-value"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"5-competition"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"6-online-marketing-myths-and-execution"},{"mechanicType":"sequence-builder","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"7-payment-gateways-flow-and-risks"},{"mechanicType":"evidence-match","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"8-security-principles"},{"mechanicType":"tradeoff-decision","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"9-user-experience-ux-and-retention"},{"mechanicType":"missing-step","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"10-strategic-planning"},{"mechanicType":"multiple-choice","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"common-misconceptions"}]}
:::