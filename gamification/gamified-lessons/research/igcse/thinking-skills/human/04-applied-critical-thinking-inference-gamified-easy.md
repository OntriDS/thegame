:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c2-m1
version: 1
scenario: Match each clue about evidence and conclusions to the theory it supports.
theories:
  - id: th-a
    content: A safe inference stays within what the evidence supports.
  - id: th-b
    content: An unsafe inference adds unsupported details or certainty.
clues:
  - id: c1
    content: Duplicate serial numbers show that the notes are not all genuine.
  - id: c2
    content: The notes were made by terrorists to destabilise the economy.
  - id: c3
    content: >-
      One long interglacial does not justify predicting exactly 20,000 more warm
      years.
  - id: c4
    content: >-
      Ice-age conditions lasted much longer than interglacials in the relevant
      record.
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c2-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-b
  c4: th-a
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c2-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: evidence-match
tier: Easy
anchor:
  heading: why-safe-inference-matters
  position: after
concepts:
  - safe and unsafe inference
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c2-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c2-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c3-m1
version: 1
categories:
  - id: cat-a
    label: Safe
  - id: cat-b
    label: Unsafe
items:
  - id: i1
    content: 87% perceive more recipients
  - id: i2
    content: Claims rose significantly
  - id: i3
    content: Majority belief proves fact
  - id: i4
    content: Over 50% wins may avoid loss
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-b
  i4: cat-a
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c3-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: quick-classification
tier: Easy
anchor:
  heading: hypotheses-do-not-establish-causes
  position: after
concepts:
  - causation
  - evidence
  - public opinion
skills:
  - recall
domain: igcse
prompt: 'Sort the compensation-claim conclusions: Safe or Unsafe'
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c3-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c3-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c4-m1
version: 1
question: What happened to total claims?
options:
  - id: a
    content: They fell slightly
  - id: b
    content: They doubled
  - id: c
    content: They stayed exactly equal
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c4-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c4-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: multiple-choice
tier: Easy
anchor:
  heading: assessing-photographs
  position: after
concepts:
  - claim-volume evidence
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 04-applied-critical-thinking-inference-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c4-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c4-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c5-m1
version: 1
items:
  - id: i1
    content: Rivers carry dissolved minerals to the oceans
  - id: i2
    content: Sun-driven evaporation removes water but leaves salt behind
  - id: i3
    content: Fresh rain and snow return through condensation
  - id: i4
    content: Millions of years of cycling concentrate salt in the oceans
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c5-m1
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
id: 04-applied-critical-thinking-inference-easy-c5-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: sequence-builder
tier: Easy
anchor:
  heading: evaluating-explanations
  position: after
concepts:
  - evaporation cycle and ocean salinity
skills:
  - recall
domain: igcse
prompt: How ocean salt concentration develops over time
validator:
  kind: sequence
  ref: 04-applied-critical-thinking-inference-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c5-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c5-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c6-m1
version: 1
scenario: Match each clue about the Battle of Issus to the theory it supports.
theories:
  - id: th-a
    content: Alexander's army had better tactics.
  - id: th-b
    content: The Persian army was fatigued.
clues:
  - id: c1
    content: Alexander's smaller army defeated a much larger force.
  - id: c2
    content: Persian fatigue could have reduced the army's effectiveness.
  - id: c3
    content: The victory may have resulted from how Alexander used his forces.
  - id: c4
    content: A tired Persian force may have struggled during the battle.
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c6-m1
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
id: 04-applied-critical-thinking-inference-easy-c6-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: evidence-match
tier: Easy
anchor:
  heading: a-satisfying-explanation-can-still-be-false
  position: after
concepts:
  - evaluating historical explanations
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c6-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c6-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c7-m1
version: 1
categories:
  - id: cat-a
    label: Supports
  - id: cat-b
    label: Repeats
items:
  - id: i1
    content: Independent witnesses agree
  - id: i2
    content: One claim repeated
  - id: i3
    content: Stats and physical facts
  - id: i4
    content: Coordinated accounts
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c7-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c7-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: quick-classification
tier: Easy
anchor:
  heading: corroboration
  position: after
concepts:
  - corroboration
skills:
  - recall
domain: igcse
prompt: 'Sort the corroboration examples: supports or repeats'
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c7-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c7-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c8-m1
version: 1
scenario: Match each clue to the theory it supports.
theories:
  - id: th-a
    content: Jackson is guilty beyond reasonable doubt.
  - id: th-b
    content: The evidence creates suspicion but does not establish guilt.
clues:
  - id: c1
    content: No witness saw Jackson throw an object.
  - id: c2
    content: Her presence at the angry demonstration creates suspicion.
  - id: c3
    content: Her flatmates confirmed she left to shop before university.
  - id: c4
    content: >-
      The eyewitness saw the person from behind and later saw Jackson only
      during arrest.
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c8-m1
version: 1
kind: mapping
matches:
  c1: th-b
  c2: th-a
  c3: th-b
  c4: th-b
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c8-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: evidence-match
tier: Easy
anchor:
  heading: eyewitness-evidence
  position: after
concepts:
  - circumstantial evidence
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c8-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c8-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c9-m1
version: 1
scenario: >-
  You must assess a claim whose truth cannot yet be established with certainty.
  Choose an approach for judging the source and claim.
options:
  - id: a
    content: >-
      Look for independent supporting evidence and assess the source's access to
      relevant facts.
    pros:
      - uses corroboration
      - considers knowledge and perceptual ability
    cons:
      - may require additional time or evidence
  - id: b
    content: Give substantial weight to the source's reputation and relevant expertise.
    pros:
      - uses prior reliability
      - considers relevant knowledge
    cons:
      - reputation does not guarantee truth
      - expertise does not remove possible bias
  - id: c
    content: >-
      Accept the claim because it is plausible and comes from a high-status
      source.
    pros:
      - fits existing beliefs
      - uses the source's status
    cons:
      - plausibility is not proof
      - status does not guarantee competence or truthfulness
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c9-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c9-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: bias-and-vested-interest
  position: after
concepts:
  - credibility
  - corroboration
  - vested interest
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-applied-critical-thinking-inference-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c9-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c9-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c10-m1
version: 1
scenario: Match each clue with the theory it supports.
theories:
  - id: th-a
    content: Suspicion is justified, but conclusive plagiarism is not proved.
  - id: th-b
    content: Conclusive plagiarism is established beyond reasonable doubt.
clues:
  - id: c1
    content: >-
      The photograph and handwritten lyrics support earlier contact and a
      similar composition.
  - id: c2
    content: >-
      Magnolia changed from total denial to partial concession, weakening her
      reliability.
  - id: c3
    content: The compatible chords are common and provide only modest support.
  - id: c4
    content: >-
      Dates, authorship, provenance, and Sarah’s original tune cannot be
      independently verified.
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c10-m1
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
id: 04-applied-critical-thinking-inference-easy-c10-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: evidence-match
tier: Easy
anchor:
  heading: the-magnolia-dispute
  position: after
concepts:
  - evaluating evidence
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c10-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c10-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c11-m1
version: 1
categories:
  - id: cat-a
    label: Stronger
  - id: cat-b
    label: Weaker
items:
  - id: i1
    content: Computer camera images
  - id: i2
    content: Race official account
  - id: i3
    content: Crowe's apparent smile
  - id: i4
    content: Brecht's party report
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c11-m1
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
id: 04-applied-critical-thinking-inference-easy-c11-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: quick-classification
tier: Easy
anchor:
  heading: case-two-racing-collision
  position: after
concepts:
  - evidence weight
skills:
  - recall
domain: igcse
prompt: 'Sort the racing evidence: Stronger or Weaker'
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c11-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c11-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c12-m1
version: 1
scenario: >-
  Several people report feeling tremors, and a seismometer records them.
  Scientists evaluate whether these observations support an earthquake
  hypothesis.
startNodeId: n1
nodes:
  - id: n1
    question: What makes the tremor reports stronger evidence?
    options:
      - id: a1
        content: >-
          Independent observers report matching tremors, and the seismometer
          records them
        nextNodeId: n2
      - id: b1
        content: One person imagines an earthquake without recording any observation
        nextNodeId: null
      - id: c1
        content: The conclusion is accepted because earthquakes are familiar
        nextNodeId: null
  - id: n2
    question: What should scientists do before drawing a conclusion?
    options:
      - id: a2
        content: >-
          Accurately record, collate, and test the observations against the
          hypothesis
        nextNodeId: null
      - id: b2
        content: Treat the first observation as proof without further testing
        nextNodeId: null
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c12-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c12-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: prediction
tier: Easy
anchor:
  heading: testing-the-grooming-hypothesis
  position: after
concepts:
  - corroboration
  - scientific evidence
skills:
  - recall
domain: igcse
prompt: How does the scientific evidence scenario play out?
validator:
  kind: exact
  ref: 04-applied-critical-thinking-inference-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c12-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c12-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c13-m1
version: 1
sourceDomain: Argument analysis
targetDomain: Public-policy analysis
scenario: Apply the core principles from argument analysis to a new public-policy case.
options:
  - id: a
    content: >-
      Check whether the policy presents falsely exclusive alternatives and
      whether comparisons rely on similarities relevant to the policy
      conclusion.
  - id: b
    content: >-
      Compare the emotional intensity and visible features of the policy case
      with other cases, then select the most similar conclusion.
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c13-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c13-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: analogy
  position: after
concepts:
  - restricting the options
  - relevant similarities in analogy
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-applied-critical-thinking-inference-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c13-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c13-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-applied-critical-thinking-inference-easy-c14-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Criminals should not profit from crime
  - id: s2
    isMissing: true
  - id: s3
    content: Celebrity income is indirect crime profit
  - id: s4
    isMissing: true
options:
  - id: o1
    content: Celebrity ex-cons earn large incomes
  - id: o2
    content: All such income should be confiscated
  - id: o3
    content: Crime should be encouraged
  - id: o4
    content: Talent always cancels criminal profit
:::

:::mechanic-private
id: 04-applied-critical-thinking-inference-easy-c14-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 04-applied-critical-thinking-inference-easy-c14-m1
version: 1
lessonSlug: 04-applied-critical-thinking-inference-easy
type: missing-step
tier: Easy
anchor:
  heading: time-to-get-tough
  position: after
concepts:
  - argument mapping
skills:
  - recall
domain: igcse
prompt: What's missing from the confiscation process?
validator:
  kind: mapping
  ref: 04-applied-critical-thinking-inference-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-applied-critical-thinking-inference-easy-c14-m1:public
privateValidatorRef: 04-applied-critical-thinking-inference-easy-c14-m1:private
rewardIdentity: 04-applied-critical-thinking-inference-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,14],"sectionMechanics":[{"mechanicType":"evidence-match","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"why-safe-inference-matters"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"hypotheses-do-not-establish-causes"},{"mechanicType":"multiple-choice","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"assessing-photographs"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"evaluating-explanations"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"a-satisfying-explanation-can-still-be-false"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"corroboration"},{"mechanicType":"evidence-match","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"eyewitness-evidence"},{"mechanicType":"tradeoff-decision","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"bias-and-vested-interest"},{"mechanicType":"evidence-match","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"the-magnolia-dispute"},{"mechanicType":"quick-classification","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"case-two-racing-collision"},{"mechanicType":"prediction","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"testing-the-grooming-hypothesis"},{"mechanicType":"abstract-transfer","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"analogy"},{"mechanicType":"missing-step","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"time-to-get-tough"},{"mechanicType":"diagnostic-lab","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"ad-hominem"},{"mechanicType":"multiple-choice","__chunkIndex":16,"__version":1,"__tier":"Easy","__anchorId":"argument-from-fairness"},{"mechanicType":"tradeoff-decision","__chunkIndex":17,"__version":1,"__tier":"Easy","__anchorId":"critical-reading-of-authentic-texts"},{"mechanicType":"constraint-construction","__chunkIndex":18,"__version":1,"__tier":"Easy","__anchorId":"constructing-an-argument-about-intelligent-animals"}]}
:::