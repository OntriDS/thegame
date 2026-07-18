:::mechanic-data
id: 04-money-as-social-agreement-easy-c2-m1
version: 1
question: What makes something function as money?
options:
  - id: a
    content: shared community agreement
  - id: b
    content: its physical material
  - id: c
    content: government decree alone
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c2-m1
version: 1
lessonSlug: map-of-money-easy
type: multiple-choice
tier: Easy
anchor:
  heading: money-is-a-social-agreement
  position: after
concepts:
  - money as social agreement
skills:
  - recall
domain: financial-freedom-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: map-of-money-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c2-m1:public
privateValidatorRef: map-of-money-easy-c2-m1:private
rewardIdentity: map-of-money-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c3-m1
version: 1
scenario: >-
  A student is comparing two historical approaches to keeping the monetary unit
  stable.
theories:
  - id: th-a
    content: Hard-Anchored Money (backed by scarce metals like gold or silver)
  - id: th-b
    content: Flexible-Promise Money (modern fiat issued by institutions)
clues:
  - id: c1
    content: Tied to a physical material that is scarce and costly to produce
  - id: c2
    content: Supply can be expanded easily by a central authority's decision
  - id: c3
    content: Hard to counterfeit and not easily created by decree
  - id: c4
    content: Carries a risk of silent dilution and loss of purchasing power
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c3-m1
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
id: 04-money-as-social-agreement-easy-c3-m1
version: 1
lessonSlug: map-of-money-easy
type: evidence-match
tier: Easy
anchor:
  heading: money-as-a-measuring-tool
  position: after
concepts:
  - money as a measuring tool
  - hard anchors vs flexible promises
skills:
  - recall
domain: financial-freedom-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: map-of-money-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c3-m1:public
privateValidatorRef: map-of-money-easy-c3-m1:private
rewardIdentity: map-of-money-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c4-m1
version: 1
categories:
  - id: cat-myth
    label: Barter Myth
  - id: cat-real
    label: Reality
items:
  - id: i1
    content: Traded chickens for grain
  - id: i2
    content: Barter came first, then money
  - id: i3
    content: Memory & obligation-based
  - id: i4
    content: Russia 1990s barter
  - id: i5
    content: No pure barter economy found
  - id: i6
    content: Adam Smith's 1776 model
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c4-m1
version: 1
kind: mapping
matches:
  i1: cat-myth
  i2: cat-myth
  i3: cat-real
  i4: cat-real
  i5: cat-real
  i6: cat-myth
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c4-m1
version: 1
lessonSlug: map-of-money-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-barter-myth
  position: after
concepts:
  - barter myth
  - early economic systems
  - historical evidence
skills:
  - recall
domain: financial-freedom-studies
prompt: 'Sort the origins-of-money claims: Barter Myth or Reality'
validator:
  kind: mapping
  ref: map-of-money-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c4-m1:public
privateValidatorRef: map-of-money-easy-c4-m1:private
rewardIdentity: map-of-money-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c5-m1
version: 1
items:
  - id: i1
    content: Mesopotamia records debts in the oldest known writing
  - id: i2
    content: Cities, trade, and accounting systems develop around recorded promises
  - id: i3
    content: Coins appear in Lydia, long after debt systems were already in use
  - id: i4
    content: Physical coin money becomes the common form people think of as money
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c5-m1
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
id: 04-money-as-social-agreement-easy-c5-m1
version: 1
lessonSlug: map-of-money-easy
type: sequence-builder
tier: Easy
anchor:
  heading: debt-came-before-coins
  position: after
concepts:
  - history of money
  - debt before coins
  - chronological order of monetary systems
skills:
  - recall
domain: financial-freedom-studies
prompt: How the history of money unfolds from the earliest records to coinage
validator:
  kind: sequence
  ref: map-of-money-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: map-of-money-easy-c5-m1:public
privateValidatorRef: map-of-money-easy-c5-m1:private
rewardIdentity: map-of-money-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c6-m1
version: 1
categories:
  - id: cat-a
    label: Progress
  - id: cat-b
    label: Failure
items:
  - id: i1
    content: Collective stone ownership
  - id: i2
    content: Recorded debt promises
  - id: i3
    content: State-backed banknotes
  - id: i4
    content: Value needed social trust
  - id: i5
    content: Government overprinted money
  - id: i6
    content: Excess dollars vs gold
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c6-m1
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
id: 04-money-as-social-agreement-easy-c6-m1
version: 1
lessonSlug: map-of-money-easy
type: quick-classification
tier: Easy
anchor:
  heading: historical-pattern-of-money-systems
  position: after
concepts:
  - Historical money innovations
  - Money system failure modes
skills:
  - recall
domain: financial-freedom-studies
prompt: 'Sort the money history events: Progress or Failure'
validator:
  kind: mapping
  ref: map-of-money-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c6-m1:public
privateValidatorRef: map-of-money-easy-c6-m1:private
rewardIdentity: map-of-money-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c7-m1
version: 1
scenario: >-
  In Song China, iron coins are heavy and risky to transport for large
  purchases. Officials must decide how to reform the money system.
options:
  - id: a
    content: Adopt a government-issued standardized paper currency
    pros:
      - widely accepted across regions
      - creates a single unified medium of exchange
      - makes large transactions far easier to carry out
    cons:
      - government can issue more paper than metal reserves justify
      - trust can collapse quickly if paper becomes overprinted
  - id: b
    content: Continue relying on private merchant deposit receipts
    pros:
      - each receipt is tied to an actual deposit of metal
      - no single authority can expand the supply at will
    cons:
      - only accepted within the issuing shop's network
      - no uniform standard across merchants
      - limited usefulness for long-distance trade
  - id: c
    content: Return to using only physical iron coins
    pros:
      - value is directly backed by the metal itself
      - no risk of overprinting
    cons:
      - very heavy to carry in large amounts
      - risky to transport over long distances
      - makes large transactions impractical
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c7-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c7-m1
version: 1
lessonSlug: map-of-money-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: paper-money-logic
  position: after
concepts:
  - paper money origins
  - convenience vs. trust tradeoff
  - role of government standardization
skills:
  - recall
domain: financial-freedom-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: map-of-money-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: map-of-money-easy-c7-m1:public
privateValidatorRef: map-of-money-easy-c7-m1:private
rewardIdentity: map-of-money-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c8-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Goldsmiths stored gold, issued receipts
  - id: s2
    isMissing: true
  - id: s3
    content: Only a fraction came to redeem
  - id: s4
    isMissing: true
  - id: s5
    content: Goldsmiths issued more receipts than gold
options:
  - id: o1
    content: Receipts began circulating as money
  - id: o2
    content: Goldsmiths lent gold, charged interest
  - id: o3
    content: Depositors paid interest to goldsmiths
  - id: o4
    content: All gold was always redeemed at once
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c8-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c8-m1
version: 1
lessonSlug: map-of-money-easy
type: missing-step
tier: Easy
anchor:
  heading: goldsmith-banking
  position: after
concepts:
  - fractional reserve banking origins
  - evolution of paper money
skills:
  - recall
domain: financial-freedom-studies
prompt: What's missing from the goldsmith banking process?
validator:
  kind: mapping
  ref: map-of-money-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c8-m1:public
privateValidatorRef: map-of-money-easy-c8-m1:private
rewardIdentity: map-of-money-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c9-m1
version: 1
sourceDomain: Central banking — the founding of the Bank of England in 1694
targetDomain: Political science / institutional history
scenario: >-
  The Bank of England emerged when a private credit practice (the goldsmith
  model) was absorbed by the state: money creation became linked to royal
  authority and to public debt, and private note-issuing became an official,
  state-backed institution. Which of the following best transfers that same
  structural pattern — a private function being genuinely absorbed into
  sovereign authority and tied to public debt — into another historical domain?
options:
  - id: a
    content: >-
      Private mercenary companies being absorbed into a national standing army,
      with military service tied to sovereign authority and funded through
      public debt.
  - id: b
    content: >-
      A private merchant guild repainting its logo in national colors while
      continuing to operate under the same private rules and obligations.
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c9-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
hints:
  - id: hint-1
    matcher:
      optionId: b
    hint: >-
      A cosmetic rebranding does not reproduce the Bank of England's core shift.
      Look for cases where a private function is genuinely absorbed into
      sovereign authority and financed through public debt, not merely
      relabeled.
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c9-m1
version: 1
lessonSlug: map-of-money-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: central-banking
  position: after
concepts:
  - institutionalization of credit
  - linkage of money creation to public debt and state authority
skills:
  - recall
domain: financial-freedom-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: map-of-money-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: map-of-money-easy-c9-m1:public
privateValidatorRef: map-of-money-easy-c9-m1:private
rewardIdentity: map-of-money-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c10-m1
version: 1
brokenState:
  - title: Gold Reserves
    iconKeyword: gold-bar
    value: depleted
  - title: Dollar Claims vs. Gold
    iconKeyword: balance-scale
    value: exceeded
  - title: Foreign Redemptions
    iconKeyword: arrows-out
    value: surging
  - title: Convertibility Link
    iconKeyword: broken-link
    value: severed
tools:
  - id: t1
    title: Cut Fiscal Spending
    iconKeyword: wrench
    action: Slows new dollar creation so supply can match gold backing
  - id: t2
    title: Suspend Gold Outflow
    iconKeyword: shield
    action: Halts the foreign gold drain to stabilize reserves
  - id: t3
    title: Restore Gold Parity
    iconKeyword: anchor
    action: Reaffirms the $35 per ounce dollar-gold peg
  - id: t4
    title: Reopen Convertibility
    iconKeyword: key
    action: Allows dollars to once again be exchanged for gold
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c10-m1
version: 1
kind: sequence
correctSequence:
  - t1
  - t2
  - t3
  - t4
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c10-m1
version: 1
lessonSlug: map-of-money-easy
type: complex-system-repair
tier: Easy
anchor:
  heading: bretton-woods-and-the-1971-break
  position: after
concepts:
  - causes of the Bretton Woods collapse
  - relationship between US fiscal policy and gold reserves
  - sequence needed to restore a gold-pegged currency system
skills:
  - recall
domain: financial-freedom-studies
prompt: >-
  The Bretton Woods monetary system is showing critical failure indicators.
  Sequence the repairs in the correct order to restore it.
validator:
  kind: sequence
  ref: map-of-money-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: map-of-money-easy-c10-m1:public
privateValidatorRef: map-of-money-easy-c10-m1:private
rewardIdentity: map-of-money-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c12-m1
version: 1
scenario: >-
  A bank issues a $10,000 loan that the borrower must repay as $11,000 including
  interest. Trace what happens across the economy.
startNodeId: n1
nodes:
  - id: n1
    question: Where does the extra $1,000 of interest come from?
    options:
      - id: a1
        content: The bank simply adds it to the loan when it is created.
        nextNodeId: null
      - id: b1
        content: >-
          It must be pulled from money already circulating, which is often
          itself the result of someone else's loan.
        nextNodeId: n2
      - id: c1
        content: The government prints new currency to cover the interest each year.
        nextNodeId: null
  - id: n2
    question: What does this imply for the system as a whole?
    options:
      - id: a2
        content: >-
          Borrowing can taper off once there is enough money in circulation to
          pay all interest.
        nextNodeId: null
      - id: b2
        content: >-
          The system requires continual borrowing, since new loans are what
          supply the money needed to pay prior principal plus interest.
        nextNodeId: n3
      - id: c2
        content: Interest is waived once total debt reaches a fixed ceiling.
        nextNodeId: null
  - id: n3
    question: >-
      What happens to purchasing power when the money supply expands faster than
      real goods and services?
    options:
      - id: a3
        content: Each currency unit tends to gain purchasing power.
        nextNodeId: null
      - id: b3
        content: Each currency unit tends to lose purchasing power.
        nextNodeId: null
      - id: c3
        content: Purchasing power stays constant regardless of money supply growth.
        nextNodeId: null
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c12-m1
version: 1
kind: exact
correctAnswer: b1,b2,b3
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c12-m1
version: 1
lessonSlug: map-of-money-easy
type: prediction
tier: Easy
anchor:
  heading: debt-and-the-interest-constraint
  position: after
concepts:
  - interest constraint
  - debt expansion pressure
  - purchasing power
skills:
  - recall
domain: financial-freedom-studies
prompt: How does the credit money system play out?
validator:
  kind: exact
  ref: map-of-money-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: map-of-money-easy-c12-m1:public
privateValidatorRef: map-of-money-easy-c12-m1:private
rewardIdentity: map-of-money-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c13-m1
version: 1
scenario: >-
  Adjust the inflation rate and policy levers to show how compounding inflation
  redistributes value from savers to borrowers.
outputs:
  - id: out1
    label: Borrower Relief
    baseValue: 10
    targetMin: 50
    targetMax: 100
  - id: out2
    label: Saver Purchasing Power
    baseValue: 90
    targetMin: 30
    targetMax: 70
  - id: out3
    label: Price Stability Score
    baseValue: 50
    targetMin: 20
    targetMax: 60
sliders:
  - id: s1
    label: Inflation Rate (%)
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 6
      - outputId: out2
        multiplier: -5
      - outputId: out3
        multiplier: -1
  - id: s2
    label: Wage Growth (%)
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 4
      - outputId: out3
        multiplier: 3
cards:
  - id: c1
    label: Expand Government Borrowing
    effects:
      - outputId: out1
        multiplier: 15
  - id: c2
    label: High-Yield Savings Plan
    effects:
      - outputId: out2
        multiplier: 15
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c13-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c13-m1
version: 1
lessonSlug: map-of-money-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: inflation-framework
  position: after
concepts:
  - inflation compounding
  - borrower benefit from inflation
  - saver penalty from inflation
  - central bank price stability target
skills:
  - recall
domain: financial-freedom-studies
prompt: >-
  Tune the inflation rate and policy levers so all three metrics land inside
  their target ranges.
validator:
  kind: invariants
  ref: map-of-money-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: map-of-money-easy-c13-m1:public
privateValidatorRef: map-of-money-easy-c13-m1:private
rewardIdentity: map-of-money-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c14-m1
version: 1
items:
  - id: i1
    content: Convenience creates paper or digital claims.
  - id: i2
    content: Authorities standardize those claims.
  - id: i3
    content: Issuers expand them beyond the original anchor.
  - id: i4
    content: Holders absorb the dilution through lost purchasing power.
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c14-m1
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
id: 04-money-as-social-agreement-easy-c14-m1
version: 1
lessonSlug: map-of-money-easy
type: sequence-builder
tier: Easy
anchor:
  heading: strategic-insight
  position: after
concepts:
  - monetary expansion
  - inflation
  - purchasing power dilution
skills:
  - recall
domain: financial-freedom-studies
prompt: How the monetary system converts trusted claims into expandable claims
validator:
  kind: sequence
  ref: map-of-money-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: map-of-money-easy-c14-m1:public
privateValidatorRef: map-of-money-easy-c14-m1:private
rewardIdentity: map-of-money-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c15-m1
version: 1
question: What actually backs fiat money?
options:
  - id: a
    content: Trust, law, and taxes
  - id: b
    content: Gold and silver
  - id: c
    content: Nothing at all
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c15-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c15-m1
version: 1
lessonSlug: map-of-money-easy
type: multiple-choice
tier: Easy
anchor:
  heading: misconception-7-fiat-money-is-backed-by-nothing-at-all
  position: after
concepts:
  - fiat money backing
skills:
  - recall
domain: financial-freedom-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: map-of-money-easy-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c15-m1:public
privateValidatorRef: map-of-money-easy-c15-m1:private
rewardIdentity: map-of-money-easy-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-money-as-social-agreement-easy-c11-m1
version: 1
scenario: Two competing explanations of how bank lending works today.
theories:
  - id: th-a
    content: Banks lend out pre-existing deposits from savers (intermediation).
  - id: th-b
    content: >-
      Banks create new money by crediting borrower accounts when loans are
      issued.
clues:
  - id: c1
    content: >-
      A $10,000 loan results in $10,000 newly credited to the borrower's account
      at the moment of lending.
  - id: c2
    content: >-
      Banks keep a fraction in reserve and lend out what savers have already
      deposited.
  - id: c3
    content: The loan itself produces a new deposit through double-entry accounting.
  - id: c4
    content: >-
      Banks act mainly as middlemen moving existing funds from depositors to
      borrowers.
:::

:::mechanic-private
id: 04-money-as-social-agreement-easy-c11-m1
version: 1
kind: mapping
matches:
  c1: th-b
  c2: th-a
  c3: th-b
  c4: th-a
:::

:::mechanic
schemaVersion: 1
id: 04-money-as-social-agreement-easy-c11-m1
version: 1
lessonSlug: map-of-money-easy
type: evidence-match
tier: Easy
anchor:
  heading: modern-bank-money-creation
  position: after
concepts:
  - modern bank money creation
  - loan creation mechanism
skills:
  - recall
domain: financial-freedom-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: map-of-money-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: map-of-money-easy-c11-m1:public
privateValidatorRef: map-of-money-easy-c11-m1:private
rewardIdentity: map-of-money-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,14,15],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"money-is-a-social-agreement"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"money-as-a-measuring-tool"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"the-barter-myth"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"debt-came-before-coins"},{"mechanicType":"quick-classification","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"historical-pattern-of-money-systems"},{"mechanicType":"tradeoff-decision","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"paper-money-logic"},{"mechanicType":"missing-step","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"goldsmith-banking"},{"mechanicType":"abstract-transfer","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"central-banking"},{"mechanicType":"complex-system-repair","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"bretton-woods-and-the-1971-break"},{"mechanicType":"prediction","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"debt-and-the-interest-constraint"},{"mechanicType":"parameter-tuner","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"inflation-framework"},{"mechanicType":"sequence-builder","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"strategic-insight"},{"mechanicType":"multiple-choice","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"misconception-7-fiat-money-is-backed-by-nothing-at-all"},{"mechanicType":"evidence-match","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"modern-bank-money-creation"}]}
:::