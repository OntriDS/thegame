:::mechanic-data
id: 05-financial-freedom-strategy-easy-c2-m1
version: 1
scenario: >-
  Tune your spending and savings so your financial freedom number fits your
  lifestyle.
outputs:
  - id: out1
    label: Annual Expenses
    baseValue: 50000
    targetMin: 25000
    targetMax: 70000
  - id: out2
    label: Freedom Number (25× Expenses)
    baseValue: 1250000
    targetMin: 600000
    targetMax: 1750000
  - id: out3
    label: Progress Score
    baseValue: 0
    targetMin: 30
    targetMax: 100
sliders:
  - id: s1
    label: Spending Adjustment
    min: -30000
    max: 30000
    step: 5000
    effects:
      - outputId: out1
        multiplier: 1
      - outputId: out2
        multiplier: 25
  - id: s2
    label: Monthly Investment
    min: 0
    max: 5000
    step: 250
    effects:
      - outputId: out3
        multiplier: 0.02
  - id: s3
    label: Years Invested
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out3
        multiplier: 5
cards:
  - id: c1
    label: Trim Discretionary Spending
    effects:
      - outputId: out1
        multiplier: -10000
      - outputId: out2
        multiplier: -250000
  - id: c2
    label: Employer Match Boost
    effects:
      - outputId: out3
        multiplier: 15
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c2-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c2-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: 1-calculate-your-financial-freedom-number
  position: after
concepts:
  - 25x financial freedom rule
  - Impact of annual spending on freedom number
  - Role of consistent investing in reaching the goal
skills:
  - recall
domain: financial-freedom-studies
prompt: >-
  Tune the sliders and apply boost cards to bring every metric into its target
  range.
validator:
  kind: invariants
  ref: road-to-financial-freedom-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: road-to-financial-freedom-easy-c2-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c2-m1:private
rewardIdentity: road-to-financial-freedom-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c3-m1
version: 1
categories:
  - id: cat-big
    label: Big Cuts
  - id: cat-small
    label: Small Cuts
items:
  - id: i1
    content: Move to cheaper housing
  - id: i2
    content: Drop a car payment
  - id: i3
    content: Cook meals at home
  - id: i4
    content: Skip daily coffee
  - id: i5
    content: Cancel streaming sub
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-big
  i2: cat-big
  i3: cat-big
  i4: cat-small
  i5: cat-small
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c3-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: quick-classification
tier: Easy
anchor:
  heading: 2-cut-1-to-reduce-the-target-by-25
  position: after
concepts:
  - 25x rule impact
  - major vs minor expense categories
skills:
  - recall
domain: financial-freedom-studies
prompt: 'Sort the spending changes: Big Cuts or Small Cuts'
validator:
  kind: mapping
  ref: road-to-financial-freedom-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: road-to-financial-freedom-easy-c3-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c3-m1:private
rewardIdentity: road-to-financial-freedom-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c4-m1
version: 1
scenario: >-
  Two people with very different incomes show whether wealth is built by earning
  more or by saving more.
theories:
  - id: th-a
    content: Savings rate (not income) determines financial progress.
  - id: th-b
    content: Higher income is what creates wealth and freedom.
clues:
  - id: c1
    content: Dave earns $10,000 but saves $0 and is stuck.
  - id: c2
    content: James earns $3,000, saves $1,000 a month, and moves forward.
  - id: c3
    content: A bigger paycheck is the path to financial freedom.
  - id: c4
    content: Earning more money is what builds wealth over time.
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c4-m1
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
id: 05-financial-freedom-strategy-easy-c4-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: evidence-match
tier: Easy
anchor:
  heading: 3-protect-the-gap
  position: after
concepts:
  - savings rate vs income
  - lifestyle inflation
skills:
  - recall
domain: financial-freedom-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: road-to-financial-freedom-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: road-to-financial-freedom-easy-c4-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c4-m1:private
rewardIdentity: road-to-financial-freedom-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c5-m1
version: 1
items:
  - id: i1
    content: Save a $1,000 emergency buffer to handle small unexpected expenses
  - id: i2
    content: >-
      Eliminate high-interest debt, since paying it off can outperform uncertain
      investment returns
  - id: i3
    content: Build a 3-6 month opportunity fund for flexibility and optionality
  - id: i4
    content: Begin investing for financial freedom as the main focus
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c5-m1
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
id: 05-financial-freedom-strategy-easy-c5-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: sequence-builder
tier: Easy
anchor:
  heading: 4-build-the-foundation-before-investing
  position: after
concepts:
  - financial foundation sequence
  - pre-investment priorities
skills:
  - recall
domain: financial-freedom-studies
prompt: >-
  How the financial foundation sequence unfolds before investing for financial
  freedom
validator:
  kind: sequence
  ref: road-to-financial-freedom-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: road-to-financial-freedom-easy-c5-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c5-m1:private
rewardIdentity: road-to-financial-freedom-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c6-m1
version: 1
scenario: >-
  You notice several old financial commitments — a large mortgage, a premium car
  lease, and a country club membership — are draining your monthly cash flow and
  slowing your path to financial freedom. How do you respond?
options:
  - id: a
    content: >-
      Apply the 'starting fresh today' filter to each commitment and exit the
      ones that no longer support your goals
    pros:
      - applies the sunk-cost decision filter directly from the lesson
      - redirects monthly cash toward your financial freedom target
      - removes ongoing anchors tied to past choices
    cons:
      - emotionally difficult to give up familiar things
      - short-term lifestyle downgrade while you reset
      - takes time and effort to sell assets and move
  - id: b
    content: >-
      Keep every commitment unchanged and increase your working hours to cover
      the costs
    pros:
      - no disruption to your current lifestyle
      - keeps your existing social standing and routines intact
      - no painful decisions about what to give up
    cons:
      - past spending still dictates future choices
      - delays financial freedom indefinitely
      - increases stress and reduces free time for what matters
  - id: c
    content: >-
      Refinance the mortgage and renegotiate the car lease to lower monthly
      payments
    pros:
      - quick cash flow relief without selling any assets
      - relatively easy to arrange with lenders
      - preserves the commitments you are attached to
    cons:
      - extends the time you are locked into each commitment
      - does not address the underlying anchor weighing you down
      - may increase the total interest paid over the life of the loans
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c6-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 0
  c: 1
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c6-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: 5-stop-dragging-dead-weight
  position: after
concepts:
  - sunk cost fallacy
  - decision filter for old commitments
  - financial freedom tradeoffs
skills:
  - recall
domain: financial-freedom-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: road-to-financial-freedom-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: road-to-financial-freedom-easy-c6-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c6-m1:private
rewardIdentity: road-to-financial-freedom-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c7-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: 'Ask: how to reach financial freedom?'
  - id: s2
    isMissing: true
  - id: s3
    content: Identify failure behaviors
  - id: s4
    isMissing: true
options:
  - id: o1
    content: 'Ask the inverse: how to fail?'
  - id: o2
    content: Avoid those behaviors
  - id: o3
    content: Save 50% of income
  - id: o4
    content: Invest in stocks
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c7-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c7-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: missing-step
tier: Easy
anchor:
  heading: 6-invert-the-goal
  position: after
concepts:
  - inversion principle
  - avoiding financial failure
skills:
  - recall
domain: financial-freedom-studies
prompt: What's missing from the inversion process?
validator:
  kind: mapping
  ref: road-to-financial-freedom-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: road-to-financial-freedom-easy-c7-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c7-m1:private
rewardIdentity: road-to-financial-freedom-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c8-m1
version: 1
attributes:
  - id: diversification
    label: Diversification
  - id: competence
    label: Competence Depth
components:
  - id: c1
    content: Pick one income path and master it before adding others
    metrics:
      diversification: 1
      competence: 9
  - id: c2
    content: Run freelancing, e-commerce, and day trading in parallel from day one
    metrics:
      diversification: 4
      competence: 3
  - id: c3
    content: Start three side hustles at once to keep multiple options open
    metrics:
      diversification: 3
      competence: 4
  - id: c4
    content: Commit to one skill until you earn meaningful income, then diversify
    metrics:
      diversification: 1
      competence: 8
requirements:
  - attributeId: diversification
    operator: <=
    value: 1
    description: Keep diversification low during the wealth-building stage
  - attributeId: competence
    operator: '>='
    value: 7
    description: Build deep competence in the chosen path
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c8-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c8-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: constraint-construction
tier: Easy
anchor:
  heading: 7-focus-before-diversifying
  position: after
concepts:
  - focus before diversification
  - wealth-building stage
  - deep competence
skills:
  - recall
domain: financial-freedom-studies
prompt: Select approaches that match the focus-first principle.
validator:
  kind: invariants
  ref: road-to-financial-freedom-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: road-to-financial-freedom-easy-c8-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c8-m1:private
rewardIdentity: road-to-financial-freedom-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c9-m1
version: 1
scenario: >-
  Alex has $1,000 saved and limited free time. The market is hot and friends are
  bragging about stock picks. Alex is deciding how to use that $1,000 and 10
  hours per week to grow financially.
startNodeId: n1
nodes:
  - id: n1
    question: What should Alex prioritize right now?
    options:
      - id: a1
        content: >-
          Spend the $1,000 on a certification that can raise income, and use the
          10 hours/week to build a high-value skill
        nextNodeId: n2
      - id: b1
        content: >-
          Put the $1,000 in stocks and spend 10 hours/week researching picks to
          maximize portfolio returns
        nextNodeId: null
      - id: c1
        content: >-
          Keep the $1,000 in cash and wait for the 'perfect' investment
          opportunity before doing anything
        nextNodeId: null
  - id: n2
    question: What is the most likely outcome a year later?
    options:
      - id: a2
        content: >-
          Earning power has increased substantially, producing a far larger
          return than the stock market would on $1,000
        nextNodeId: null
      - id: b2
        content: >-
          The $1,000 has grown a little, but the 10 hours/week earned only a few
          dollars per hour in extra return
        nextNodeId: null
      - id: c2
        content: >-
          Nothing has changed because small amounts of money and time cannot
          move the needle
        nextNodeId: null
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c9-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c9-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: prediction
tier: Easy
anchor:
  heading: 8-at-0-you-are-the-investment
  position: after
concepts:
  - investing in self vs. market, earning power as main asset
skills:
  - recall
domain: financial-freedom-studies
prompt: How does the early-career financial scenario play out?
validator:
  kind: exact
  ref: road-to-financial-freedom-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: road-to-financial-freedom-easy-c9-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c9-m1:private
rewardIdentity: road-to-financial-freedom-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c10-m1
version: 1
question: What is the core tradeoff?
options:
  - id: a
    content: Hard 4 yrs now, or 40 later
  - id: b
    content: Hard 40 yrs now, or 4 later
  - id: c
    content: Easy 4 yrs now, or 40 later
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c10-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c10-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 9-create-temporary-imbalance
  position: after
concepts:
  - temporary imbalance tradeoff
skills:
  - recall
domain: financial-freedom-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: road-to-financial-freedom-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: road-to-financial-freedom-easy-c10-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c10-m1:private
rewardIdentity: road-to-financial-freedom-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-financial-freedom-strategy-easy-c11-m1
version: 1
categories:
  - id: myth
    label: Myth
  - id: truth
    label: Truth
items:
  - id: i1
    content: Income alone = freedom
  - id: i2
    content: Spending gap drives progress
  - id: i3
    content: Honor past spending
  - id: i4
    content: Build emergency fund first
  - id: i5
    content: Diversify early, always
  - id: i6
    content: Earning power beats returns
:::

:::mechanic-private
id: 05-financial-freedom-strategy-easy-c11-m1
version: 1
kind: mapping
matches:
  i1: myth
  i2: truth
  i3: myth
  i4: truth
  i5: myth
  i6: truth
:::

:::mechanic
schemaVersion: 1
id: 05-financial-freedom-strategy-easy-c11-m1
version: 1
lessonSlug: road-to-financial-freedom-easy
type: quick-classification
tier: Easy
anchor:
  heading: balance-should-always-be-maintained
  position: after
concepts:
  - financial misconceptions
  - financial freedom principles
skills:
  - recall
domain: financial-freedom-studies
prompt: 'Sort the financial freedom ideas: Myth or Truth'
validator:
  kind: mapping
  ref: road-to-financial-freedom-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: road-to-financial-freedom-easy-c11-m1:public
privateValidatorRef: road-to-financial-freedom-easy-c11-m1:private
rewardIdentity: road-to-financial-freedom-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11],"sectionMechanics":[{"mechanicType":"parameter-tuner","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"1-calculate-your-financial-freedom-number"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"2-cut-1-to-reduce-the-target-by-25"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"3-protect-the-gap"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"4-build-the-foundation-before-investing"},{"mechanicType":"tradeoff-decision","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"5-stop-dragging-dead-weight"},{"mechanicType":"missing-step","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"6-invert-the-goal"},{"mechanicType":"constraint-construction","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"7-focus-before-diversifying"},{"mechanicType":"prediction","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"8-at-0-you-are-the-investment"},{"mechanicType":"multiple-choice","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"9-create-temporary-imbalance"},{"mechanicType":"quick-classification","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"balance-should-always-be-maintained"}]}
:::