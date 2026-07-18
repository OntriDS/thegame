:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c2-m1
version: 1
question: What is the key mechanism for growing wealth?
options:
  - id: a
    content: Collateralized borrowing
  - id: b
    content: Higher labor income
  - id: c
    content: Selling assets for profit
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c2-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: multiple-choice
tier: Easy
anchor:
  heading: core-concepts
  position: after
concepts:
  - collateralized borrowing as wealth mechanism
skills:
  - recall
domain: financial-freedom-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: how-rich-make-money-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c2-m1:public
privateValidatorRef: how-rich-make-money-easy-c2-m1:private
rewardIdentity: how-rich-make-money-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c3-m1
version: 1
categories:
  - id: cat-asset
    label: Assets
  - id: cat-nonasset
    label: Non-asset
items:
  - id: i1
    content: Houses
  - id: i2
    content: Gold
  - id: i3
    content: Stocks
  - id: i4
    content: Cars
  - id: i5
    content: Food
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-asset
  i2: cat-asset
  i3: cat-asset
  i4: cat-nonasset
  i5: cat-nonasset
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c3-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: quick-classification
tier: Easy
anchor:
  heading: asset-model
  position: after
concepts:
  - asset definition
  - consumable definition
skills:
  - recall
domain: financial-freedom-studies
prompt: 'Sort the holdings: Assets or Non-asset'
validator:
  kind: mapping
  ref: how-rich-make-money-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c3-m1:public
privateValidatorRef: how-rich-make-money-easy-c3-m1:private
rewardIdentity: how-rich-make-money-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c4-m1
version: 1
scenario: >-
  Three borrow-against-asset tools share a common pattern: keep the asset,
  borrow cash against it, and use the loan proceeds. Match each clue to the
  specific tool it describes.
theories:
  - id: th-a
    content: SBLOC (securities-backed line of credit)
  - id: th-b
    content: MELOC (materials equity line of credit)
clues:
  - id: c1
    content: Collateral is securities or other investment assets.
  - id: c2
    content: Collateral could be gold, silver, or platinum.
  - id: c3
    content: Claimed use is to replace salary with loan proceeds to avoid income tax.
  - id: c4
    content: Uses precious metals as collateral instead of securities.
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c4-m1
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
id: 03-borrow-against-assets-wealth-strategy-easy-c4-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: evidence-match
tier: Easy
anchor:
  heading: borrow-against-assets-framework
  position: after
concepts:
  - SBLOC
  - MELOC
  - borrow-against-assets pattern
skills:
  - recall
domain: financial-freedom-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: how-rich-make-money-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c4-m1:public
privateValidatorRef: how-rich-make-money-easy-c4-m1:private
rewardIdentity: how-rich-make-money-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c5-m1
version: 1
items:
  - id: i1
    content: Acquire or hold assets that appreciate in value
  - id: i2
    content: Use those assets as collateral to take out low-interest loans
  - id: i3
    content: >-
      Spend the loan proceeds while letting assets appreciate faster than the
      loan interest
  - id: i4
    content: Repeat the cycle with a larger collateral base to borrow even more
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c5-m1
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
id: 03-borrow-against-assets-wealth-strategy-easy-c5-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: sequence-builder
tier: Easy
anchor:
  heading: claimed-wealth-formula
  position: after
concepts:
  - claimed wealth formula
  - asset-backed borrowing cycle
skills:
  - recall
domain: financial-freedom-studies
prompt: How the claimed wealth formula unfolds from start to finish
validator:
  kind: sequence
  ref: how-rich-make-money-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: how-rich-make-money-easy-c5-m1:public
privateValidatorRef: how-rich-make-money-easy-c5-m1:private
rewardIdentity: how-rich-make-money-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c6-m1
version: 1
question: What rate do wealthy borrowers get?
options:
  - id: a
    content: 3-4%
  - id: b
    content: 11-18%
  - id: c
    content: 24%
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c6-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: multiple-choice
tier: Easy
anchor:
  heading: numbers-mentioned
  position: after
concepts:
  - wealthy borrower loan rates
skills:
  - recall
domain: financial-freedom-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: how-rich-make-money-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c6-m1:public
privateValidatorRef: how-rich-make-money-easy-c6-m1:private
rewardIdentity: how-rich-make-money-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c7-m1
version: 1
categories:
  - id: cat-asset
    label: Asset
  - id: cat-loan
    label: Loan
items:
  - id: i1
    content: 401(k)
  - id: i2
    content: Savings account
  - id: i3
    content: CD (Certificate of Deposit)
  - id: i4
    content: Passbook loan
  - id: i5
    content: Savings-secured loan
  - id: i6
    content: Share-secured loan
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c7-m1
version: 1
kind: mapping
matches:
  i1: cat-asset
  i2: cat-asset
  i3: cat-asset
  i4: cat-loan
  i5: cat-loan
  i6: cat-loan
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c7-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: quick-classification
tier: Easy
anchor:
  heading: everyday-asset-based-alternatives
  position: after
concepts:
  - asset-backed borrowing
  - collateral sources
  - secured loan types
skills:
  - recall
domain: financial-freedom-studies
prompt: 'Sort the asset-backed borrowing items: Asset or Loan'
validator:
  kind: mapping
  ref: how-rich-make-money-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c7-m1:public
privateValidatorRef: how-rich-make-money-easy-c7-m1:private
rewardIdentity: how-rich-make-money-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c8-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Parent transfers $10,000
  - id: s2
    isMissing: true
  - id: s3
    content: Document labels it as capital
  - id: s4
    isMissing: true
  - id: s5
    content: May clarify tax/accounting
options:
  - id: o1
    content: Document the transfer in writing
  - id: o2
    content: Set repayment + 3-4% interest
  - id: o3
    content: Invest funds in stocks immediately
  - id: o4
    content: Sell the family business outright
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c8-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c8-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: missing-step
tier: Easy
anchor:
  heading: friends-family-capital-method
  position: after
concepts:
  - documenting family transfers
  - capital transfer terms
skills:
  - recall
domain: financial-freedom-studies
prompt: What's missing from the family capital transfer process?
validator:
  kind: mapping
  ref: how-rich-make-money-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c8-m1:public
privateValidatorRef: how-rich-make-money-easy-c8-m1:private
rewardIdentity: how-rich-make-money-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c9-m1
version: 1
scenario: >-
  A borrower with appreciating collateral can access lower interest rates and
  larger loans. Push each lever until the system reaches the target state.
maxTurns: 8
variables:
  - id: v1
    name: Asset Value
    initialValue: 60
    targetValue: 80
    min: 0
    max: 100
  - id: v2
    name: Borrowing Capacity
    initialValue: 35
    targetValue: 70
  - id: v3
    name: Interest Rate
    initialValue: 13
    targetValue: 5
controls:
  - id: c1
    type: button
    label: Acquire Asset
    effects:
      - variableId: v1
        delta: 15
  - id: c2
    type: button
    label: Borrow Against Assets
    effects:
      - variableId: v2
        delta: 15
  - id: c3
    type: button
    label: Refinance Loan
    effects:
      - variableId: v3
        delta: -2
  - id: c4
    type: switch
    label: Enable Appreciation
    activeEffects:
      - variableId: v1
        delta: 3
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c9-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c9-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: system-simulation
tier: Easy
anchor:
  heading: strategic-insight
  position: after
concepts:
  - collateralized borrowing
  - asset appreciation
  - leverage feedback loop
skills:
  - recall
domain: financial-freedom-studies
prompt: Build the wealth feedback loop.
validator:
  kind: invariants
  ref: how-rich-make-money-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 3
publicPayloadRef: how-rich-make-money-easy-c9-m1:public
privateValidatorRef: how-rich-make-money-easy-c9-m1:private
rewardIdentity: how-rich-make-money-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c10-m1
version: 1
scenario: >-
  Your business owns a high-value asset that has appreciated significantly. You
  need cash for a new investment, but selling would trigger a large capital
  gains tax bill. Two paths are available, each with clear tradeoffs.
options:
  - id: a
    content: Borrow against the asset to access cash
    pros:
      - preserves ownership of the asset
      - avoids triggering capital gains tax
      - maintains potential for future appreciation
    cons:
      - creates a new debt obligation that must be repaid
      - risk of margin call if the asset value drops
  - id: b
    content: Sell the asset outright to generate cash
    pros:
      - eliminates any future debt or margin-call risk
      - provides immediate cash with no interest costs
    cons:
      - triggers a capital gains tax on the appreciation
      - you lose any future appreciation of the asset
      - you give up ownership of the asset entirely
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c10-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c10-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: caution
  position: after
concepts:
  - caution with asset-backed borrowing
  - tradeoffs of debt versus sale
  - risk awareness in financial strategy
skills:
  - recall
domain: financial-freedom-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: how-rich-make-money-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: how-rich-make-money-easy-c10-m1:public
privateValidatorRef: how-rich-make-money-easy-c10-m1:private
rewardIdentity: how-rich-make-money-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-borrow-against-assets-wealth-strategy-easy-c11-m1
version: 1
question: Why aren't loan proceeds free money?
options:
  - id: a
    content: They must be repaid
  - id: b
    content: They are illegal
  - id: c
    content: They reduce your taxes
:::

:::mechanic-private
id: 03-borrow-against-assets-wealth-strategy-easy-c11-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-borrow-against-assets-wealth-strategy-easy-c11-m1
version: 1
lessonSlug: how-rich-make-money-easy
type: multiple-choice
tier: Easy
anchor:
  heading: >-
    misconception-6-this-strategy-is-automatically-legal-and-beneficial-everywhere
  position: after
concepts:
  - loans must be repaid
skills:
  - recall
domain: financial-freedom-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: how-rich-make-money-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: how-rich-make-money-easy-c11-m1:public
privateValidatorRef: how-rich-make-money-easy-c11-m1:private
rewardIdentity: how-rich-make-money-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"core-concepts"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"asset-model"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"borrow-against-assets-framework"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"claimed-wealth-formula"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"numbers-mentioned"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"everyday-asset-based-alternatives"},{"mechanicType":"missing-step","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"friends-family-capital-method"},{"mechanicType":"system-simulation","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"strategic-insight"},{"mechanicType":"tradeoff-decision","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"caution"},{"mechanicType":"multiple-choice","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"misconception-6-this-strategy-is-automatically-legal-and-beneficial-everywhere"}]}
:::