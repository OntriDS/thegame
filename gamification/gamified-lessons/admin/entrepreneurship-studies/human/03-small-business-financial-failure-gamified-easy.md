:::mechanic-data
id: 03-small-business-financial-failure-easy-c2-m1
version: 1
question: What do these five errors form?
options:
  - id: a
    content: A connected system
  - id: b
    content: Isolated problems
  - id: c
    content: A simple checklist
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c2-m1
version: 1
lessonSlug: small-business-errors-easy
type: multiple-choice
tier: Easy
anchor:
  heading: introduction-the-interconnection-principle
  position: after
concepts:
  - interconnection principle
skills:
  - recall
domain: entrepreneurship-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: small-business-errors-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: small-business-errors-easy-c2-m1:public
privateValidatorRef: small-business-errors-easy-c2-m1:private
rewardIdentity: small-business-errors-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c3-m1
version: 1
items:
  - id: i1
    content: Invest your own personal savings into the business
  - id: i2
    content: Apply for a bank loan after showing your own commitment
  - id: i3
    content: Seek outside investors as a later source of funding
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c3-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c3-m1
version: 1
lessonSlug: small-business-errors-easy
type: sequence-builder
tier: Easy
anchor:
  heading: the-financing-hierarchy
  position: after
concepts:
  - financing hierarchy
  - funding source order
  - skin in the game
skills:
  - recall
domain: entrepreneurship-studies
prompt: >-
  How the financing hierarchy unfolds from personal commitment to outside
  capital
validator:
  kind: sequence
  ref: small-business-errors-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: small-business-errors-easy-c3-m1:public
privateValidatorRef: small-business-errors-easy-c3-m1:private
rewardIdentity: small-business-errors-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c4-m1
version: 1
categories:
  - id: fixed
    label: Fixed Cost
  - id: variable
    label: Variable Cost
items:
  - id: i1
    content: Rent and lease payments
  - id: i2
    content: Raw materials and components
  - id: i3
    content: Salaried employee positions
  - id: i4
    content: Sales commissions
  - id: i5
    content: Insurance premiums
  - id: i6
    content: Shipping and delivery fees
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c4-m1
version: 1
kind: mapping
matches:
  i1: fixed
  i2: variable
  i3: fixed
  i4: variable
  i5: fixed
  i6: variable
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c4-m1
version: 1
lessonSlug: small-business-errors-easy
type: quick-classification
tier: Easy
anchor:
  heading: fixed-versus-variable-costs
  position: after
concepts:
  - cost structure
  - fixed costs
  - variable costs
skills:
  - recall
domain: entrepreneurship-studies
prompt: 'Sort the business expenses: Fixed Cost or Variable Cost'
validator:
  kind: mapping
  ref: small-business-errors-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: small-business-errors-easy-c4-m1:public
privateValidatorRef: small-business-errors-easy-c4-m1:private
rewardIdentity: small-business-errors-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c5-m1
version: 1
scenario: >-
  Tune your small business operations to hit sustainable monthly cash flow
  targets.
outputs:
  - id: out1
    label: Monthly Cash Balance
    baseValue: 4800
    targetMin: 4000
    targetMax: 12000
  - id: out2
    label: Forecast Accuracy
    baseValue: 55
    targetMin: 65
    targetMax: 100
  - id: out3
    label: Cash Reserve Growth
    baseValue: 1500
    targetMin: 2000
    targetMax: 10000
sliders:
  - id: s1
    label: Pricing Level
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 600
  - id: s2
    label: Marketing Spend
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: -400
      - outputId: out2
        multiplier: 3
  - id: s3
    label: Inventory Investment
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: -250
      - outputId: out3
        multiplier: 350
cards:
  - id: c1
    label: Competitor Analysis Report
    effects:
      - outputId: out2
        multiplier: 18
  - id: c2
    label: Demographic Data Study
    effects:
      - outputId: out2
        multiplier: 12
      - outputId: out3
        multiplier: 600
  - id: c3
    label: Market Research Survey
    effects:
      - outputId: out2
        multiplier: 15
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c5-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c5-m1
version: 1
lessonSlug: small-business-errors-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: the-monthly-cash-flow-forecast
  position: after
concepts:
  - cash flow forecasting
  - data collection for forecasting
  - monthly cash budget components
skills:
  - recall
domain: entrepreneurship-studies
prompt: >-
  Adjust your small business levers and pick a data source to hit sustainable
  cash flow targets.
validator:
  kind: invariants
  ref: small-business-errors-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: small-business-errors-easy-c5-m1:public
privateValidatorRef: small-business-errors-easy-c5-m1:private
rewardIdentity: small-business-errors-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c6-m1
version: 1
scenario: Sort each accounting term to the correct category.
theories:
  - id: th-a
    content: Four Categories of the Minimum Accounting System
  - id: th-b
    content: Three Critical Functions of Accounting Records
clues:
  - id: c1
    content: Income
  - id: c2
    content: Tax Compliance
  - id: c3
    content: Accounts Receivable
  - id: c4
    content: Access to External Funding
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c6-m1
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
id: 03-small-business-financial-failure-easy-c6-m1
version: 1
lessonSlug: small-business-errors-easy
type: evidence-match
tier: Easy
anchor:
  heading: why-accounting-records-are-critical
  position: after
concepts:
  - minimum accounting categories
  - critical functions of accounting records
skills:
  - recall
domain: entrepreneurship-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: small-business-errors-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: small-business-errors-easy-c6-m1:public
privateValidatorRef: small-business-errors-easy-c6-m1:private
rewardIdentity: small-business-errors-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c7-m1
version: 1
scenario: >-
  A solo consultant needs to set the price for a one-day training engagement.
  She is deciding which pricing approach to use. Each approach has clear
  tradeoffs.
options:
  - id: a
    content: >-
      Price based on variable costs (delivery time + materials) plus a small
      margin
    pros:
      - Quick and simple to calculate
      - Feels competitive against other trainers
    cons:
      - Ignores the 10+ days of curriculum design time
      - Excludes travel, marketing, and admin time
      - Does not cover your share of fixed costs (rent, insurance, equipment)
      - Frequently produces negative real margin
  - id: b
    content: Set a very high price to maximize margin on every sale
    pros:
      - Higher revenue per engagement
      - Can signal premium quality to buyers
    cons:
      - Drives away price-sensitive customers
      - Sales volume can fall below the level needed to cover fixed costs
      - Pipeline becomes harder to fill consistently
  - id: c
    content: >-
      Price based on full cost (all time invested + fixed costs) plus a
      sustainable margin
    pros:
      - Accounts for curriculum design, travel, marketing, and admin time
      - Recovers your share of fixed costs
      - Produces a sustainable real margin on every engagement
    cons:
      - Requires tracking true time and overhead
      - Price may feel high compared to competitors who ignore hidden costs
      - Takes more effort to calculate and justify to clients
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 1
  c: 4
hints:
  a: >-
    The lesson's $500 example shows that variable-cost-only pricing turns a
    healthy-looking margin into a net loss once prep, travel, and overhead are
    included.
  b: >-
    Higher per-sale revenue helps only if enough sales close; chasing maximum
    price can push volume below the break-even point.
  c: >-
    Full-cost pricing is the approach the lesson recommends: include all time
    and a share of fixed costs, then add a margin on top.
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c7-m1
version: 1
lessonSlug: small-business-errors-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: the-trap-of-both-extremes
  position: after
concepts:
  - pricing based on variable costs vs. full costs
  - consequences of pricing too high or too low
  - importance of including fixed costs and preparation time in pricing
skills:
  - recall
domain: entrepreneurship-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: small-business-errors-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: small-business-errors-easy-c7-m1:public
privateValidatorRef: small-business-errors-easy-c7-m1:private
rewardIdentity: small-business-errors-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c8-m1
version: 1
scenario: >-
  A business with 40 customers paying $400 each reports a net loss of $3,000.
  Diagnose the cause.
symptoms:
  - 40 customers × $400 = $16,000 gross profit, but a net loss of $3,000
  - Combined variable and fixed costs exceed gross profit
diagnoses:
  - id: d1
    content: Total costs (variable + fixed) exceed gross profit
  - id: d2
    content: The $400 price per order is too low
  - id: d3
    content: The business simply needs more customers
parameters:
  - id: p1
    label: Variable Cost Cut (%)
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Fixed Cost Cut (%)
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c8-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: '>='
    targetValue: 25
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c8-m1
version: 1
lessonSlug: small-business-errors-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: validation-questions-for-pricing
  position: after
concepts:
  - cost structure analysis
  - fixed vs variable costs
  - profitability
skills:
  - recall
domain: entrepreneurship-studies
prompt: Diagnose why this business lost money despite strong revenue.
validator:
  kind: invariants
  ref: small-business-errors-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: small-business-errors-easy-c8-m1:public
privateValidatorRef: small-business-errors-easy-c8-m1:private
rewardIdentity: small-business-errors-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c9-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Review current margins
  - id: s2
    isMissing: true
  - id: s3
    content: Confirm systems are scalable
  - id: s4
    isMissing: true
  - id: s5
    content: Begin scaling the business
options:
  - id: o1
    content: Check cash flow for expansion
  - id: o2
    content: Verify team capacity
  - id: o3
    content: Launch a new product line
  - id: o4
    content: Cut operating expenses
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c9-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c9-m1
version: 1
lessonSlug: small-business-errors-easy
type: missing-step
tier: Easy
anchor:
  heading: the-operational-rule
  position: after
concepts:
  - pre-scaling checklist
  - growth management
  - operational readiness
skills:
  - recall
domain: entrepreneurship-studies
prompt: What's missing from the pre-scaling checklist process?
validator:
  kind: mapping
  ref: small-business-errors-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: small-business-errors-easy-c9-m1:public
privateValidatorRef: small-business-errors-easy-c9-m1:private
rewardIdentity: small-business-errors-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c10-m1
version: 1
question: What % close within 5 years?
options:
  - id: a
    content: 50%
  - id: b
    content: 25%
  - id: c
    content: 75%
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c10-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c10-m1
version: 1
lessonSlug: small-business-errors-easy
type: multiple-choice
tier: Easy
anchor:
  heading: statistics-and-causes-of-failure
  position: after
concepts:
  - small business failure statistics
skills:
  - recall
domain: entrepreneurship-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: small-business-errors-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: small-business-errors-easy-c10-m1:public
privateValidatorRef: small-business-errors-easy-c10-m1:private
rewardIdentity: small-business-errors-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-small-business-financial-failure-easy-c11-m1
version: 1
sourceDomain: Small business entrepreneurship
targetDomain: Public administration and government budgeting
scenario: >-
  A new municipal agency is being launched to deliver community services. Apply
  the financial principles from entrepreneurship to avoid the same pitfalls in
  this public-sector context.
options:
  - id: a
    content: >-
      Establish comprehensive budgeting controls and cost-based fee structures
      before launching programs, treating revenue timing and cash availability
      as separate concerns that each require distinct planning.
  - id: b
    content: >-
      Expand services aggressively to meet public demand, reducing fees to
      maximize participation, trusting that high engagement will resolve any
      financial shortfalls.
  - id: c
    content: >-
      Rely on leadership experience and political judgment to guide spending
      decisions, treating formal financial reporting as secondary to mission
      delivery.
:::

:::mechanic-private
id: 03-small-business-financial-failure-easy-c11-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 1
:::

:::mechanic
schemaVersion: 1
id: 03-small-business-financial-failure-easy-c11-m1
version: 1
lessonSlug: small-business-errors-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: misconception-5-if-i-have-good-sales-i-do-not-need-to-worry-about-cash-flow
  position: after
concepts:
  - financial systems before operations
  - cost-based pricing
  - cash flow vs revenue recognition
  - data-driven decision making
skills:
  - recall
domain: entrepreneurship-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: small-business-errors-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: small-business-errors-easy-c11-m1:public
privateValidatorRef: small-business-errors-easy-c11-m1:private
rewardIdentity: small-business-errors-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"introduction-the-interconnection-principle"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"the-financing-hierarchy"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"fixed-versus-variable-costs"},{"mechanicType":"parameter-tuner","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"the-monthly-cash-flow-forecast"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"why-accounting-records-are-critical"},{"mechanicType":"tradeoff-decision","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"the-trap-of-both-extremes"},{"mechanicType":"diagnostic-lab","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"validation-questions-for-pricing"},{"mechanicType":"missing-step","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"the-operational-rule"},{"mechanicType":"multiple-choice","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"statistics-and-causes-of-failure"},{"mechanicType":"abstract-transfer","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-if-i-have-good-sales-i-do-not-need-to-worry-about-cash-flow"}]}
:::