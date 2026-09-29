:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c2-m1
version: 1
question: >-
  Two people have an enjoyable, comfortable conversation. One person wants to
  shift toward romantic interest while respecting the other person's autonomy.
  Which approach best reflects healthy sexual escalation?
options:
  - id: a
    content: >-
      Gradually communicate romantic interest and leave clear room for the other
      person to reciprocate, redirect, or decline.
  - id: b
    content: >-
      Assume the pleasant rapport already proves mutual attraction, so a direct
      physical advance needs no further communication.
  - id: c
    content: >-
      Avoid expressing any interest until the other person makes an unmistakably
      explicit romantic proposal first.
  - id: d
    content: >-
      Move quickly from friendliness to intense sexual behavior so the romantic
      intention cannot be misunderstood.
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c2-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 1-what-sexual-escalation-means
  position: after
concepts:
  - sexual escalation
  - communicating interest without pressure
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 11-respectful-sexual-escalation-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c2-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c2-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c3-m1
version: 1
scenario: >-
  A person enjoys talking with someone they are interested in, but has not
  expressed that interest. Match each observation to the explanation that best
  fits it.
theories:
  - id: th-a
    content: >-
      Fear of rejection — after investing time and emotion, expressing
      attraction feels personally risky.
  - id: th-b
    content: >-
      Overstaying comfort — keeping every interaction exclusively non-romantic
      can allow a friendship dynamic to settle in.
  - id: th-c
    content: >-
      Fear of seeming inappropriate — concern about appearing disrespectful
      inhibits initiative, even though interest can be expressed lightly and
      without pressure.
clues:
  - id: c1
    content: >-
      The person thinks sharing attraction would hurt more now because they have
      already built rapport.
  - id: c2
    content: >-
      They keep conversations easy and friendly, hoping the other person will
      eventually infer their romantic intentions.
  - id: c3
    content: >-
      They decide it is safer never to make their attraction explicit, even
      though they hope it will become obvious.
  - id: c4
    content: >-
      The interaction has stayed comfortable and non-romantic for a long time,
      and it now feels like a friendship.
  - id: c5
    content: >-
      They worry that any expression of interest will automatically make them
      seem creepy or disrespectful.
  - id: c6
    content: >-
      They could communicate interest with a light, clear, non-pressuring
      approach while paying attention to the other person's response.
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c3-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-a
  c4: th-b
  c5: th-c
  c6: th-c
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-c
    hint: >-
      Read c3 again: the focus is on avoiding the personal risk of making
      attraction explicit, which fits fear of rejection.
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c3-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: evidence-match
tier: Medium
anchor:
  heading: lack-of-a-repeatable-model
  position: after
concepts:
  - fear of rejection
  - respectful expression of interest
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 11-respectful-sexual-escalation-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c3-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c3-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c4-m1
version: 1
items:
  - id: i1
    content: Adapt energy to the setting and begin an initial interaction.
  - id: i2
    content: Build rapport, safety, mutual ease, and a more personal connection.
  - id: i3
    content: >-
      Shift attention away from broad group energy toward quieter one-on-one
      engagement.
  - id: i4
    content: Communicate romantic or sexual interest clearly, without pressure.
  - id: i5
    content: >-
      Make a direct, respectful request and obtain clear agreement before a
      physical advance.
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c4-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
  - i4
  - i5
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c4-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: sequence-builder
tier: Medium
anchor:
  heading: stage-three-seduction
  position: after
concepts:
  - interaction-stage goals
  - mutual comfort and agreement
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  From gaining attention to communicating interest: the correct sequence of the
  three-stage interaction model
validator:
  kind: sequence
  ref: 11-respectful-sexual-escalation-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c4-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c4-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c5-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Group or high-energy interaction
  - id: s2
    isMissing: true
  - id: s3
    content: Mutual comfort
  - id: s4
    isMissing: true
  - id: s5
    content: Clear communication of interest
options:
  - id: o1
    content: Focused conversation
  - id: o2
    content: Gradual flirtation
  - id: o3
    content: Increase animated energy to maintain momentum
  - id: o4
    content: Communicate interest immediately
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c5-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c5-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: missing-step
tier: Medium
anchor:
  heading: 4-the-transition-principle
  position: after
concepts:
  - shifting from high-energy interaction to focused connection
  - responding to engagement with space rather than intensifying
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Fill the missing steps in the transition from group energy to clear
  communication of interest
validator:
  kind: mapping
  ref: 11-respectful-sexual-escalation-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c5-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c5-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c6-m1
version: 1
scenario: >-
  You want your delivery to communicate interest without making the other person
  feel rushed or pressured. Adjust each control while keeping comfort and
  freedom central.
outputs:
  - id: calm
    label: Calm, deliberate feeling
    baseValue: 20
    targetMin: 35
    targetMax: 50
  - id: space
    label: Space to process
    baseValue: 10
    targetMin: 25
    targetMax: 40
  - id: comfort
    label: Comfort and freedom
    baseValue: 20
    targetMin: 35
    targetMax: 50
sliders:
  - id: slowRhythm
    label: Slow the rhythm of speech
    min: 0
    max: 5
    step: 1
    effects:
      - outputId: calm
        multiplier: 4
      - outputId: comfort
        multiplier: 1
  - id: naturalPauses
    label: Add natural pauses
    min: 0
    max: 5
    step: 1
    effects:
      - outputId: space
        multiplier: 4
      - outputId: comfort
        multiplier: 2
      - outputId: calm
        multiplier: 1
  - id: lowerVolume
    label: Lower the volume slightly
    min: 0
    max: 5
    step: 1
    effects:
      - outputId: calm
        multiplier: 1
      - outputId: comfort
        multiplier: 3
cards:
  - id: respectfulQuestion
    label: Ask a natural, respectful question
    effects:
      - outputId: comfort
        multiplier: 12
      - outputId: space
        multiplier: 3
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c6-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      outputId: comfort
    hint: >-
      Tone and pacing can communicate interest, but a respectful question more
      reliably supports comfort and consent.
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c6-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: parameter-tuner
tier: Medium
anchor:
  heading: avoid-dependence-on-scripts
  position: after
concepts:
  - tone and pacing
  - respect for comfort and consent
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Tune the vocal approach so the interaction feels calm, spacious, and
  respectful.
validator:
  kind: invariants
  ref: 11-respectful-sexual-escalation-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c6-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c6-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c7-m1
version: 1
scenario: >-
  You notice eye movements during a conversation and must interpret them
  carefully. Match each clue to the most supported theory without treating a
  gaze cue as proof or permission.
theories:
  - id: th-a
    content: The eye-contact triangle may be functioning as a flirtatious cue.
  - id: th-b
    content: >-
      The eye behavior has another context-dependent explanation and does not
      establish desire.
  - id: th-c
    content: >-
      Regardless of the gaze pattern, direct communication is needed before a
      kiss or touch.
clues:
  - id: c1
    content: >-
      A person looks from one eye to the other eye, lingers briefly at the lips,
      then returns to the eyes.
  - id: c2
    content: >-
      Someone looks at another person's lips during conversation, but no one has
      discussed kissing or touch.
  - id: c3
    content: The other person uses a similar eye–eye–lips–eyes pattern.
  - id: c4
    content: >-
      A lip glance occurs while the person is concentrating on what the speaker
      is saying.
  - id: c5
    content: >-
      A lingering lip glance may communicate possible interest in kissing, but
      it is not proof of desire.
  - id: c6
    content: Before initiating a kiss, someone asks whether it is welcome.
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c7-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-c
  c3: th-a
  c4: th-b
  c5: th-b
  c6: th-c
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: wrong-one
    hint: >-
      A matching pattern may suggest interest, so it supports the
      flirtatious-cue theory; it still does not prove desire or replace
      communication.
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c7-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: evidence-match
tier: Medium
anchor:
  heading: 6-the-eye-contact-triangle
  position: after
concepts:
  - eye-contact triangle
  - ambiguous nonverbal cues
  - direct communication and consent
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 11-respectful-sexual-escalation-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c7-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c7-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c8-m1
version: 1
scenario: >-
  Alternate brief flirtatious cues with ordinary rapport. Extend intensity only
  when engagement remains receptive; if responsiveness drops, rebuild comfort or
  stop escalating.
maxTurns: 6
variables:
  - id: comfort
    name: Comfort
    initialValue: 50
    targetValue: 70
    min: 0
    max: 100
  - id: receptivity
    name: Active Receptivity
    initialValue: 60
    targetValue: 65
    min: 0
    max: 100
  - id: intensity
    name: Flirtatious Intensity
    initialValue: 0
    targetValue: 20
    min: 0
    max: 100
controls:
  - id: briefCue
    type: button
    label: Use a brief flirtatious cue
    effects:
      - variableId: intensity
        delta: 10
      - variableId: comfort
        delta: -5
  - id: returnToRapport
    type: button
    label: Return to ordinary conversation
    effects:
      - variableId: comfort
        delta: 15
      - variableId: receptivity
        delta: 5
      - variableId: intensity
        delta: -5
  - id: pauseEscalation
    type: switch
    label: Pause escalation and give space
    activeEffects:
      - variableId: comfort
        delta: 10
      - variableId: intensity
        delta: -10
  - id: setCueLength
    type: slider
    label: Set flirtatious cue length
    bindsTo: intensity
    min: 0
    max: 30
    step: 10
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c8-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c8-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: system-simulation
tier: Medium
anchor:
  heading: 7-the-dipping-technique
  position: after
concepts:
  - gradual escalation
  - responsiveness and boundaries
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Keep rapport comfortable while using brief, responsive flirtation.
validator:
  kind: invariants
  ref: 11-respectful-sexual-escalation-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 2
publicPayloadRef: 11-respectful-sexual-escalation-medium-c8-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c8-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c9-m1
version: 1
categories:
  - id: discomfort
    label: Possible Discomfort
  - id: comfort-interest
    label: Possible Comfort or Interest
  - id: not-consent
    label: Not Proof of Consent
items:
  - id: i1
    content: Leaning away
  - id: i2
    content: Looking away shyly and then returning eye contact
  - id: i3
    content: Folding the arms
  - id: i4
    content: Reciprocating welcome touch
  - id: i5
    content: Sustained eye contact means someone has consented to kissing
  - id: i6
    content: Flirting means someone wants physical contact
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c9-m1
version: 1
kind: mapping
matches:
  i1: discomfort
  i2: comfort-interest
  i3: discomfort
  i4: comfort-interest
  i5: not-consent
  i6: not-consent
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c9-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: quick-classification
tier: Medium
anchor:
  heading: possible-signs-of-comfort-or-interest
  position: after
concepts:
  - possible nonverbal signs of discomfort
  - possible nonverbal signs of comfort or interest
  - limits of interpreting nonverbal behavior
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each interaction cue or conclusion: Possible Discomfort, Possible
  Comfort or Interest, or Not Proof of Consent
validator:
  kind: mapping
  ref: 11-respectful-sexual-escalation-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c9-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c9-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c10-m1
version: 1
attributes:
  - id: checkIn
    label: Asked whether contact is welcome
  - id: activeAgreement
    label: Clear active agreement
  - id: cost
    label: Boundary concerns
components:
  - id: c1
    content: Ask, “Can I kiss you?”
    metrics:
      checkIn: 1
      activeAgreement: 0
      cost: 0
  - id: c2
    content: The person clearly says yes and actively reciprocates.
    metrics:
      checkIn: 0
      activeAgreement: 1
      cost: 0
  - id: c3
    content: The person hesitates before responding.
    metrics:
      checkIn: 0
      activeAgreement: 0
      cost: 1
  - id: c4
    content: The person becomes silent or freezes.
    metrics:
      checkIn: 0
      activeAgreement: 0
      cost: 1
  - id: c5
    content: Continue after using persistence or pressure.
    metrics:
      checkIn: 0
      activeAgreement: 0
      cost: 1
requirements:
  - attributeId: checkIn
    operator: '>='
    value: 1
  - attributeId: activeAgreement
    operator: '>='
    value: 1
  - attributeId: cost
    operator: '=='
    value: 0
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c10-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: cost
    hint: Exclude choices involving hesitation, silence, freezing, or pressure.
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c10-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: constraint-construction
tier: Medium
anchor:
  heading: 9-the-consent-boundary
  position: after
concepts:
  - clear voluntary agreement
  - respecting hesitation and pressure
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Build a combination that respects the consent boundary.
validator:
  kind: invariants
  ref: 11-respectful-sexual-escalation-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 11-respectful-sexual-escalation-medium-c10-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c10-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c11-m1
version: 1
sourceDomain: Playful conversation between two people
targetDomain: Collaborative academic discussion
scenario: >-
  A student wants to suggest an unconventional research direction to a
  classmate. Which approach transfers the core logic of playful ambiguity while
  respecting the classmate's autonomy?
options:
  - id: a
    content: >-
      Offer the idea lightly, invite the classmate's perspective, and adjust or
      move on if they seem uninterested.
  - id: b
    content: >-
      Present the idea playfully, then keep returning to it until the classmate
      gives a clear answer.
  - id: c
    content: >-
      Avoid stating the idea directly and assume the classmate's friendly tone
      means they want to pursue it.
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c11-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 0
hints:
  - id: hint-1
    matcher:
      selectedOptionId: b
    hint: >-
      The transfer should leave genuine room for a neutral response,
      redirection, or decline.
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c11-m1
version: 1
lessonSlug: 11-respectful-sexual-escalation-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: 10-flirting-as-playful-ambiguity
  position: after
concepts:
  - playful ambiguity
  - responsive boundaries
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 11-respectful-sexual-escalation-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 11-respectful-sexual-escalation-medium-c11-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c11-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 11-respectful-sexual-escalation-medium-c12-m1
version: 1
layout: branch
sequence:
  - id: s1
    content: Establish rapport and allow mutual comfort to develop.
    row: 0
    col: 0
  - id: s2
    content: >-
      Communicate attraction gradually, alternating brief flirtatious cues with
      ordinary conversation.
    row: 0
    col: 1
    dependencies:
      - s1
  - id: s3
    isMissing: true
    row: 0
    col: 2
    dependencies:
      - s2
  - id: s4
    content: If responsiveness decreases, return to neutral conversation or disengage.
    row: 1
    col: 3
    dependencies:
      - s3
  - id: s5
    isMissing: true
    row: 0
    col: 3
    dependencies:
      - s3
  - id: s6
    isMissing: true
    row: 0
    col: 4
    dependencies:
      - s5
options:
  - id: o1
    content: Look for active reciprocity, not merely the absence of rejection.
  - id: o2
    content: Ask before initiating a kiss or other physical contact.
  - id: o3
    content: >-
      Accept refusal, hesitation, uncertainty, or silence as a reason not to
      proceed.
  - id: o4
    content: Continue escalating unless the other person explicitly rejects it.
  - id: o5
    content: Treat silence as permission to proceed with physical contact.
  - id: o6
    content: Use more flirtatious cues to restore decreased responsiveness.
:::

:::mechanic-private
id: 11-respectful-sexual-escalation-medium-c12-m1
version: 1
kind: mapping
matches:
  s3: o1
  s5: o2
  s6: o3
:::

:::mechanic
schemaVersion: 1
id: 11-respectful-sexual-escalation-medium-c12-m1
version: 2
lessonSlug: 11-respectful-sexual-escalation-medium
type: missing-step
tier: Medium
anchor:
  heading: 11-a-respectful-practical-sequence
  position: after
concepts:
  - active reciprocity
  - respectful escalation
  - consent
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Complete the missing steps in the respectful mutuality decision flow
validator:
  kind: mapping
  ref: 11-respectful-sexual-escalation-medium-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 11-respectful-sexual-escalation-medium-c12-m1:public
privateValidatorRef: 11-respectful-sexual-escalation-medium-c12-m1:private
rewardIdentity: 11-respectful-sexual-escalation-medium-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-what-sexual-escalation-means"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"lack-of-a-repeatable-model"},{"mechanicType":"sequence-builder","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"stage-three-seduction"},{"mechanicType":"missing-step","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"4-the-transition-principle"},{"mechanicType":"parameter-tuner","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"avoid-dependence-on-scripts"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"6-the-eye-contact-triangle"},{"mechanicType":"system-simulation","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"7-the-dipping-technique"},{"mechanicType":"quick-classification","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"possible-signs-of-comfort-or-interest"},{"mechanicType":"constraint-construction","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"9-the-consent-boundary"},{"mechanicType":"abstract-transfer","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"10-flirting-as-playful-ambiguity"},{"mechanicType":"missing-step","__chunkIndex":12,"__version":2,"__tier":"Medium","__anchorId":"11-a-respectful-practical-sequence"}]}
:::