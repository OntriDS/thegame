---
type: gamified-lesson-mechanics
lesson_slug: entrepreneurship-foundations-easy
domain: entrepreneurship-studies
---

:::mechanic-data
id: entrepreneurship-foundations-easy-c2-m1
version: 1
categories:
  - id: cat-a
    label: List It
  - id: cat-b
    label: Skip It
items:
  - id: i1
    content: Business concept dream
  - id: i2
    content: Problem worth solving
  - id: i3
    content: Customer need observed
  - id: i4
    content: Inspiration from a startup
  - id: i5
    content: Weekly grocery shopping list
  - id: i6
    content: TV show viewing schedule
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-a
  i3: cat-a
  i4: cat-a
  i5: cat-b
  i6: cat-b
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c2-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: quick-classification
tier: Easy
anchor:
  heading: ideas-lists-where-all-business-begins
  position: after
concepts:
  - ideas lists
  - idea capture
  - entrepreneurship basics
skills:
  - recall
domain: entrepreneurship-studies
prompt: 'Sort the examples: belongs on an Ideas List or skip it?'
validator:
  kind: mapping
  ref: entrepreneurship-foundations-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: entrepreneurship-foundations-easy-c2-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c2-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c3-m1
version: 1
scenario: >-
  After researching three potential markets, a founder must choose where to
  launch her new product. Market A is dominated by well-funded incumbents.
  Market B has clear competitors but a group of underserved customers no one is
  serving well. Market C has very little public data and no obvious competitors.
  Which market should she enter?
options:
  - id: a
    content: Enter Market A and compete directly against the well-funded incumbents
    pros:
      - >-
        Existing competitors validate that customers exist and are willing to
        pay
      - Clear competitors provide benchmarks and learning opportunities
    cons:
      - Requires a strong differentiation strategy to stand out
      - Tends to compress profit margins
      - Demands significant marketing and capital to displace incumbents
  - id: b
    content: Enter Market B and focus on the underserved 'white space' customers
    pros:
      - Lower direct competition increases probability of success
      - Underserved customers are often the most promising early adopters
      - Higher potential profit margins with less price pressure
    cons:
      - Requires careful research to confirm the niche is real and reachable
      - Total addressable market may be smaller than crowded spaces
  - id: c
    content: Enter Market C where little information and few competitors exist
    pros:
      - Potential first-mover advantage if the market turns out to be real
    cons:
      - Lack of data may mean the market does not actually exist
      - High uncertainty makes forecasting revenue and costs difficult
      - Riskiest use of time and capital of the three options
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c3-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
  c: 0
hints:
  a: >-
    Competing head-on with well-funded incumbents is possible, but the lesson
    warns that dominated markets require a clear differentiation strategy and
    tend to squeeze margins.
  b: >-
    The lesson highlights underserved 'white space' customers as the most
    promising—and notes that less competition improves both success probability
    and profit margins.
  c: >-
    The lesson flags markets with little available data as a warning sign: it
    may indicate an unknown opportunity, or a market that simply does not exist.
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c3-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: competitive-risk-evaluating-your-market-opportunity
  position: after
concepts:
  - competitive risk
  - market opportunity
  - white space
  - differentiation strategy
skills:
  - recall
domain: entrepreneurship-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: entrepreneurship-foundations-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: entrepreneurship-foundations-easy-c3-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c3-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c4-m1
version: 1
scenario: Match each entrepreneur's action to the personal strategy it supports.
theories:
  - id: th-a
    content: Play to Your Strengths
  - id: th-b
    content: Know Your Market Value
clues:
  - id: c1
    content: Hire a partner to handle tasks where you are weak
  - id: c2
    content: Set your price after researching what customers will pay
  - id: c3
    content: Focus on work that naturally energizes and motivates you
  - id: c4
    content: Decide whether to position your product as premium or budget
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c4-m1
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
id: entrepreneurship-foundations-easy-c4-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: evidence-match
tier: Easy
anchor:
  heading: personal-strategy-knowing-yourself
  position: after
concepts:
  - self-awareness strategy
  - strengths vs market value
skills:
  - recall
domain: entrepreneurship-studies
prompt: Which strategy do these clues support?
validator:
  kind: mapping
  ref: entrepreneurship-foundations-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: entrepreneurship-foundations-easy-c4-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c4-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c5-m1
version: 1
items:
  - id: i1
    content: Obtain all necessary licenses
  - id: i2
    content: Open a dedicated business bank account
  - id: i3
    content: Create and distribute business cards
  - id: i4
    content: Maintain a consistent marketing budget
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c5-m1
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
id: entrepreneurship-foundations-easy-c5-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: sequence-builder
tier: Easy
anchor:
  heading: professionalism-building-credibility-from-day-one
  position: after
concepts:
  - professionalism
  - business setup
skills:
  - recall
domain: entrepreneurship-studies
prompt: How the foundations of business professionalism unfold in order
validator:
  kind: sequence
  ref: entrepreneurship-foundations-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: entrepreneurship-foundations-easy-c5-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c5-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c6-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Define your concept clearly
  - id: s2
    isMissing: true
  - id: s3
    content: Calculate potential costs and revenues
  - id: s4
    isMissing: true
options:
  - id: o1
    content: Build an MVP and test with customers
  - id: o2
    content: Decide to proceed, pivot, or abandon
  - id: o3
    content: Hire a large full-time team
  - id: o4
    content: Skip customer feedback entirely
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c6-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c6-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: missing-step
tier: Easy
anchor:
  heading: viability-testing-your-business-concept
  position: after
concepts:
  - viability research process
  - business concept testing
skills:
  - recall
domain: entrepreneurship-studies
prompt: What's missing from the viability testing process?
validator:
  kind: mapping
  ref: entrepreneurship-foundations-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: entrepreneurship-foundations-easy-c6-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c6-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c7-m1
version: 1
categories:
  - id: cat-a
    label: Customers
  - id: cat-b
    label: Operations
items:
  - id: i1
    content: Who is your target buyer?
  - id: i2
    content: Who are your competitors?
  - id: i3
    content: Why choose you over them?
  - id: i4
    content: What will you sell?
  - id: i5
    content: How will production work?
  - id: i6
    content: When will you launch?
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c7-m1
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
id: entrepreneurship-foundations-easy-c7-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: quick-classification
tier: Easy
anchor:
  heading: business-plans-defining-your-path-forward
  position: after
concepts:
  - business checklist
  - target market
  - production planning
skills:
  - recall
domain: entrepreneurship-studies
prompt: 'Sort the business checklist questions: Customer focus or Operations focus'
validator:
  kind: mapping
  ref: entrepreneurship-foundations-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: entrepreneurship-foundations-easy-c7-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c7-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c8-m1
version: 1
scenario: A small business is choosing between two well-known pricing methods.
theories:
  - id: th-value
    content: Value-Based Pricing
  - id: th-profit
    content: Profit-Based Pricing
clues:
  - id: c1
    content: Charge 30% to 35% of the value the customer receives
  - id: c2
    content: Add a margin on top of the minimum cost needed to cover expenses
  - id: c3
    content: If your service saves a client $10,000 per year, charge $3,000-$3,500
  - id: c4
    content: Establishes a floor price you should rarely go below
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c8-m1
version: 1
kind: mapping
matches:
  c1: th-value
  c2: th-profit
  c3: th-value
  c4: th-profit
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c8-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: evidence-match
tier: Easy
anchor:
  heading: pricing-finding-the-right-balance
  position: after
concepts:
  - value-based pricing
  - profit-based pricing
skills:
  - recall
domain: entrepreneurship-studies
prompt: Which pricing method do these clues support?
validator:
  kind: mapping
  ref: entrepreneurship-foundations-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: entrepreneurship-foundations-easy-c8-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c8-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c9-m1
version: 1
attributes:
  - id: cost
    label: Initial Cost
  - id: risk
    label: Risk Level
components:
  - id: c1
    content: E-commerce only — sell through an online store with no physical location
    metrics:
      cost: 2
      risk: 2
  - id: c2
    content: >-
      Pop-up retail — operate temporary physical spaces at events or short-term
      leases
    metrics:
      cost: 5
      risk: 4
  - id: c3
    content: >-
      Brick-and-mortar store — open a permanent physical retail location from
      the start
    metrics:
      cost: 9
      risk: 8
  - id: c4
    content: >-
      Phased launch — start online, then add a physical location once revenue
      stabilizes
    metrics:
      cost: 3
      risk: 3
requirements:
  - attributeId: cost
    operator: <=
    value: 4
  - attributeId: risk
    operator: <=
    value: 4
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c9-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c9-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: constraint-construction
tier: Easy
anchor:
  heading: clicks-or-bricks-online-vs-physical-presence
  position: after
concepts:
  - online-first strategy
  - cost minimization
  - risk reduction
skills:
  - recall
domain: entrepreneurship-studies
prompt: Select the launch strategies that meet both constraints.
validator:
  kind: invariants
  ref: entrepreneurship-foundations-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: entrepreneurship-foundations-easy-c9-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c9-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c10-m1
version: 1
scenario: >-
  A small coffee shop is tuning its financial model to reach profitability
  within one quarter.
outputs:
  - id: out1
    label: Monthly Revenue
    baseValue: 50
    targetMin: 250
    targetMax: 550
  - id: out2
    label: Profit Margin %
    baseValue: 5
    targetMin: 25
    targetMax: 55
  - id: out3
    label: Customers Reached
    baseValue: 10
    targetMin: 40
    targetMax: 80
sliders:
  - id: s1
    label: Price Point
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 30
      - outputId: out2
        multiplier: 3
  - id: s2
    label: Units Sold
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 20
      - outputId: out3
        multiplier: 4
  - id: s3
    label: Marketing Spend
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out3
        multiplier: 5
      - outputId: out1
        multiplier: 10
cards:
  - id: c1
    label: Premium Branding
    effects:
      - outputId: out1
        multiplier: 100
  - id: c2
    label: Efficiency Boost
    effects:
      - outputId: out2
        multiplier: 15
  - id: c3
    label: Viral Campaign
    effects:
      - outputId: out3
        multiplier: 25
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c10-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      outputId: out1
      belowTarget: true
    hint: >-
      Revenue = Price × Volume. Raise the Price Point or Units Sold sliders, or
      apply the Premium Branding card.
  - id: hint-2
    matcher:
      outputId: out2
      belowTarget: true
    hint: >-
      Profit margin grows with price. Increase the Price Point slider or apply
      the Efficiency Boost card to cut costs.
  - id: hint-3
    matcher:
      outputId: out3
      belowTarget: true
    hint: >-
      Customer reach depends on Units Sold and Marketing Spend. Push those
      sliders up or apply the Viral Campaign card.
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c10-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: financial-model-the-business-in-mathematics
  position: after
concepts:
  - financial model basics
  - price × volume = revenue
  - profit margin drivers
  - cost vs revenue balance
skills:
  - recall
domain: entrepreneurship-studies
prompt: >-
  Adjust the levers and apply the right cards so every business metric lands
  inside its target range.
validator:
  kind: invariants
  ref: entrepreneurship-foundations-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: entrepreneurship-foundations-easy-c10-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c10-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c11-m1
version: 1
scenario: >-
  A startup has $30,000 in the bank and $5,000 in monthly expenses, with no
  guaranteed incoming revenue yet.
startNodeId: n1
nodes:
  - id: n1
    question: What is the first thing this founder should determine?
    options:
      - id: a1
        content: Calculate the runway to see how many months the business can survive
        nextNodeId: n2
      - id: b1
        content: Hire more staff right away to accelerate growth
        nextNodeId: null
      - id: c1
        content: Assume revenue will arrive soon and keep spending as planned
        nextNodeId: null
  - id: n2
    question: The runway comes out to 6 months. What is the smart next step?
    options:
      - id: a2
        content: Cut expenses to extend the runway and survive longer without revenue
        nextNodeId: null
      - id: b2
        content: Spend the remaining cash on a big marketing push to grow fast
        nextNodeId: null
      - id: c2
        content: Sign a long-term office lease to look more established
        nextNodeId: null
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c11-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c11-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: prediction
tier: Easy
anchor:
  heading: burn-rate-knowing-your-runway
  position: after
concepts:
  - burn rate
  - runway
  - cash management
skills:
  - recall
domain: entrepreneurship-studies
prompt: How does the startup runway scenario play out?
validator:
  kind: exact
  ref: entrepreneurship-foundations-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: entrepreneurship-foundations-easy-c11-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c11-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c12-m1
version: 1
scenario: >-
  You are a solo founder launching a small consulting practice. Which legal
  structure should you start with?
options:
  - id: a
    content: Sole Proprietorship
    pros:
      - Total control over every decision
      - No setup cost to get started
      - Low tax burden initially
    cons:
      - Personal liability for all business debts
  - id: b
    content: LLC (Limited Liability Company)
    pros:
      - Debts stay with the company, not you personally
      - Flexible tax treatment
      - Personal assets are protected
    cons:
      - Medium setup cost
  - id: c
    content: C Corp
    pros:
      - Designed for public offerings and raising capital
      - Can issue multiple classes of stock
    cons:
      - High overall tax burden
      - Double taxation on dividends
      - Excessive overhead for a solo startup
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c12-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 4
  c: 0
hints:
  a: >-
    Sole proprietorships are the simplest starting structure for a solo founder
    with low risk exposure.
  b: >-
    LLCs balance personal liability protection with manageable setup costs for
    early-stage businesses.
  c: >-
    C Corps are built for IPOs and large capital raises, not solo startups just
    getting off the ground.
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c12-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: legal-structure-choosing-your-business-form
  position: after
concepts:
  - legal structure
  - sole proprietorship
  - LLC
  - C Corp
  - business formation tradeoffs
skills:
  - recall
domain: entrepreneurship-studies
prompt: Choose the legal structure for your new solo business and weigh the tradeoffs.
validator:
  kind: rubric
  ref: entrepreneurship-foundations-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: entrepreneurship-foundations-easy-c12-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c12-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: entrepreneurship-foundations-easy-c13-m1
version: 1
question: Which protects trade secrets?
options:
  - id: a
    content: NDAs
  - id: b
    content: Patents
  - id: c
    content: Trademarks
:::

:::mechanic-private
id: entrepreneurship-foundations-easy-c13-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: entrepreneurship-foundations-easy-c13-m1
version: 1
lessonSlug: entrepreneurship-foundations-easy
type: multiple-choice
tier: Easy
anchor:
  heading: intellectual-property-protecting-your-creations
  position: after
concepts:
  - trade secret protection
skills:
  - recall
domain: entrepreneurship-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: entrepreneurship-foundations-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: entrepreneurship-foundations-easy-c13-m1:public
privateValidatorRef: entrepreneurship-foundations-easy-c13-m1:private
rewardIdentity: entrepreneurship-foundations-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"ideas-lists-where-all-business-begins"},{"mechanicType":"tradeoff-decision","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"competitive-risk-evaluating-your-market-opportunity"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"personal-strategy-knowing-yourself"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"professionalism-building-credibility-from-day-one"},{"mechanicType":"missing-step","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"viability-testing-your-business-concept"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"business-plans-defining-your-path-forward"},{"mechanicType":"evidence-match","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"pricing-finding-the-right-balance"},{"mechanicType":"constraint-construction","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"clicks-or-bricks-online-vs-physical-presence"},{"mechanicType":"parameter-tuner","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"financial-model-the-business-in-mathematics"},{"mechanicType":"prediction","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"burn-rate-knowing-your-runway"},{"mechanicType":"tradeoff-decision","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"legal-structure-choosing-your-business-form"},{"mechanicType":"multiple-choice","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"intellectual-property-protecting-your-creations"}]}
:::