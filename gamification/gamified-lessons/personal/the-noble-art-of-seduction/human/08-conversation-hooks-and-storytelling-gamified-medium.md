:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c2-m1
version: 1
question: >-
  A speaker is talking with someone who is waiting for transportation. Aware
  that the exchange may last only about five minutes, he becomes convinced the
  conversation must become interesting immediately, and as a result he stops
  listening attentively and misses useful material in the other person's
  replies. According to the lesson, what best explains his failure to notice
  useful material?
options:
  - id: a
    content: >-
      The urgency created by his awareness of the interaction's limited duration
      interfered with his attentive listening.
  - id: b
    content: >-
      He was treating an interesting conversation as a necessary outcome, so
      outcome dependency made his mind go blank.
  - id: c
    content: >-
      Five minutes is objectively too little time for useful material to appear
      in the other person's responses.
  - id: d
    content: >-
      He had slipped into interrogation mode, asking repeated questions that
      left him no room to listen.
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c2-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: multiple-choice
tier: Medium
anchor:
  heading: outcome-dependency
  position: after
concepts:
  - time pressure and attentive listening
  - distinguishing time pressure from outcome dependency
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 08-conversation-hooks-and-storytelling-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c2-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c2-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c3-m1
version: 1
scenario: >-
  You and two study partners are comparing notes on the Nine-Hook Lead System, a
  conversational method built around 'hooks' — pieces of information in another
  person's statement that can be used to continue, redirect, or deepen the
  conversation. Each of you has a different theory about what actually makes the
  system work. Match each clue from the source material to the theory it
  supports.
theories:
  - id: th-a
    content: >-
      Theory A — The system works because you respond to the type of information
      being offered; you never need to know or share the other person's specific
      reference, hobby, occupation, city, book, or film.
  - id: th-b
    content: >-
      Theory B — The system works because you treat the other person's words as
      usable information that opens new directions, instead of constantly
      searching for a completely unrelated topic.
  - id: th-c
    content: >-
      Theory C — The system works because you select from its named set of leads
      — open question, fact, opinion, challenge, humour, and anecdote, plus the
      later task and assumption leads — with validation recommended during early
      practice even though it is not defined as a separate method.
clues:
  - id: c1
    content: >-
      Someone names a film you have not seen. You ask why they recommend it,
      what kind of story it tells, and what they enjoy about it — and the
      conversation keeps going even though you know nothing about the film.
  - id: c2
    content: >-
      As they explain the film, they bring up its music, a historical period,
      storytelling, actors, travel, and personal memories — each one fresh
      material the conversation could follow in a new direction.
  - id: c3
    content: >-
      What you respond to is the type of information being offered — a fact, an
      opinion, an anecdote — not the specific reference, hobby, or film behind
      it.
  - id: c4
    content: >-
      A hook is any piece of information in another person's statement that can
      be used to continue, redirect, or deepen the conversation.
  - id: c5
    content: >-
      The source recommends including Validation during early practice but does
      not define a separate validation method, and it warns against filling such
      gaps with an invented framework.
  - id: c6
    content: >-
      The source describes six initial leads — open question, fact, opinion,
      challenge, humour, and anecdote — and later develops task and assumption
      leads.
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c3-m1
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
      Read c3 again — 'fact, opinion, anecdote' appear there as examples of the
      kind of information the other person offers, not as a menu of lead methods
      to choose from. The clue is stating the type-of-information principle, so
      it supports Theory A, not Theory C.
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c3-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: evidence-match
tier: Medium
anchor:
  heading: 2-the-nine-hook-lead-system
  position: after
concepts:
  - hooks as usable information in conversation
  - responding to the type of information vs. the specific reference
  - the lead inventory and validation's undefined status
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 08-conversation-hooks-and-storytelling-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c3-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c3-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c4-m1
version: 1
categories:
  - id: cat-high
    label: High-calibre — invites elaboration
  - id: cat-mid
    label: Development-dependent — value depends on how it's developed
  - id: cat-low
    label: Low-calibre — yields a minimal answer
items:
  - id: i1
    content: Asking which cities someone has lived in and what each was like
  - id: i2
    content: '"You enjoying yourself?" — predictably answered "Yes."'
  - id: i3
    content: Bringing up cuisine as a conversational topic
  - id: i4
    content: Asking why someone took up their particular hobby
  - id: i5
    content: '"Do you like films?" — predictably answered "Yes."'
  - id: i6
    content: Bringing up colours as a conversational topic
  - id: i7
    content: Asking someone to tell the story of how they got into their line of work
  - id: i8
    content: '"How are you?" — predictably answered "Fine."'
shuffle: true
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c4-m1
version: 1
kind: mapping
matches:
  i1: cat-high
  i2: cat-low
  i3: cat-mid
  i4: cat-high
  i5: cat-low
  i6: cat-mid
  i7: cat-high
  i8: cat-low
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c4-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: quick-classification
tier: Medium
anchor:
  heading: hook-calibre
  position: after
concepts:
  - hook calibre
  - conversational potential of topics
  - questions that yield minimal answers
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each conversational hook by its calibre: High-calibre,
  Development-dependent, or Low-calibre
validator:
  kind: mapping
  ref: 08-conversation-hooks-and-storytelling-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c4-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c4-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c5-m1
version: 1
scenario: >-
  You're at a friend's housewarming party, seated next to Priya, someone you've
  never met. Your goal is a real conversation in which she contributes
  meaningful material — not a stilted chain of one-word answers. Priya opens
  with: 'I just got back from a trip to Portugal.' Predict how the exchange
  unfolds if you apply the open-question approach.
startNodeId: n1
nodes:
  - id: n1
    question: >-
      Priya has just mentioned her trip to Portugal. What's your best opening
      move?
    options:
      - id: a1
        content: >-
          Ask an open question that invites her to describe the trip: 'What was
          the highlight of Portugal for you?'
        nextNodeId: n2
      - id: b1
        content: 'Ask a focused factual question: ''Was it a work trip or a vacation?'''
        nextNodeId: null
      - id: c1
        content: >-
          Match her story with your own: 'I went to Spain last year — wait till
          I tell you about it.'
        nextNodeId: null
      - id: d1
        content: >-
          Keep it light and move to safe ground: 'Nice! Can you believe this
          weather we've been having?'
        nextNodeId: null
  - id: n2
    question: >-
      Priya lights up: 'Honestly, the food. I took a cooking class in Lisbon,
      and I've been trying to recreate their seafood stew at home ever since.'
      What should you do next?
    options:
      - id: a2
        content: >-
          Pick up one of the new hooks she just offered: 'What's the trick to
          getting that stew right?'
        nextNodeId: n3
      - id: b2
        content: >-
          Return to trip logistics with a practical question: 'How long was the
          flight back?'
        nextNodeId: null
      - id: c2
        content: >-
          Open a fresh topic with another open question: 'So what do you do for
          work?'
        nextNodeId: null
      - id: d2
        content: >-
          Give a friendly compliment and let the thread rest: 'That sounds
          amazing — you should open a restaurant.'
        nextNodeId: null
  - id: n3
    question: >-
      You ask about the stew, and Priya talks for several minutes: she's
      adapting her grandmother's recipe, and she now visits the local fish
      market every Saturday for ingredients. What has her answer accomplished?
    options:
      - id: a3
        content: >-
          It has produced several new hooks — her grandmother, the recipe
          adaptation, the Saturday fish market — any of which can carry the
          conversation forward.
        nextNodeId: n4
      - id: b3
        content: >-
          It has given you the information you needed about her trip, so this
          thread is now complete.
        nextNodeId: null
      - id: c3
        content: >-
          It has revealed that Priya is simply more talkative than most people
          you meet.
        nextNodeId: null
      - id: d3
        content: >-
          It has drifted the conversation away from the original topic of
          Portugal, which you should steer back to.
        nextNodeId: null
  - id: n4
    question: >-
      The conversation keeps flowing until the party winds down. What best
      confirms that the open-question approach worked?
    options:
      - id: a4
        content: >-
          Priya contributed meaningful material throughout, and each of her
          answers left you a fresh hook to follow — the conversation sustained
          itself.
        nextNodeId: null
      - id: b4
        content: There was never an awkward silence between the two of you.
        nextNodeId: null
      - id: c4
        content: Priya told you that you ask questions like a professional interviewer.
        nextNodeId: null
      - id: d4
        content: You left the party with Priya's phone number and a plan to meet again.
        nextNodeId: null
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c5-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3,a4
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c5-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: prediction
tier: Medium
anchor:
  heading: hook-lead-1-open-question
  position: after
concepts:
  - open questions
  - conversation hooks
  - avoiding the closed-question pattern
  - building on contributed material
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: How does this conversation unfold when you use open questions?
validator:
  kind: exact
  ref: 08-conversation-hooks-and-storytelling-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c5-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c5-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c6-m1
version: 1
items:
  - id: i1
    content: Pause, maintain calm eye contact, and say, "Stop."
  - id: i2
    content: >-
      State the shared reality: "It's obvious we are not going to agree about
      this."
  - id: i3
    content: >-
      Reframe the disagreement as evidence that both people can be passionate
      and willing to speak their minds.
  - id: i4
    content: >-
      Preserve the relationship without requiring either person to abandon their
      position.
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c6-m1
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
id: 08-conversation-hooks-and-storytelling-medium-c6-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: sequence-builder
tier: Medium
anchor:
  heading: defusing-personal-disagreement
  position: after
concepts:
  - defusing personal disagreement
  - de-escalation sequence
  - prioritizing mutual respect over winning
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  From the moment a debate turns personal to a restored connection: the correct
  sequence for defusing disagreement
validator:
  kind: sequence
  ref: 08-conversation-hooks-and-storytelling-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c6-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c6-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c7-m1
version: 1
scenario: >-
  Week-one team lunch. Priya breaks the ice with new teammate Marco by teasing
  him about running 'fridge tribunals' and leaving passive-aggressive notes
  about expired yogurt. He chuckles at the first jab — but by dessert he's gone
  silent. Diagnose the root cause, then set the repair dials (0 = minimal, 100 =
  maximum).
symptoms:
  - >-
    The accusations were patently absurd — 'fridge tribunals' and 'yogurt
    audits' could not be read as a literal judgment of Marco's character, and
    Priya delivered them grinning
  - >-
    Marco chuckled at the first jab, but his smile faded, his replies shrank to
    one word, and he stopped making eye contact
  - Fresh accusations kept coming at full intensity even after Marco went quiet
diagnoses:
  - id: d1
    content: >-
      The comfort condition was violated — Marco appeared visibly uneasy, and
      the teasing should have stopped immediately instead of continuing
  - id: d2
    content: >-
      The exaggeration wasn't unmistakable enough, so Marco read the teasing as
      a genuine accusation about his character
  - id: d3
    content: >-
      Wrong challenge type — Priya should have raised an intellectual challenge
      and substantively disagreed with an idea Marco had put forward
parameters:
  - id: p1
    label: Responsiveness to unease
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Teasing continuation
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Exaggeration obviousness
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c7-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: '>='
    targetValue: 75
  - parameterId: p2
    operator: <=
    targetValue: 25
hints:
  - id: hint-1
    matcher:
      wrongDiagnosisId: d2
    hint: >-
      Re-read the first indicator: 'fridge tribunals' was patently absurd and
      Priya was grinning — the exaggeration was already unmistakable, so it
      could not have read as a genuine accusation. Now look at what kept
      happening after Marco's smile faded.
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c7-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: diagnostic-lab
tier: Medium
anchor:
  heading: playful-challenge
  position: after
concepts:
  - playful challenge
  - exaggeration unmistakability
  - comfort condition for teasing
  - intellectual vs playful challenge
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Diagnose why Priya's playful challenge silenced her new teammate, then set the
  repair dials.
validator:
  kind: invariants
  ref: 08-conversation-hooks-and-storytelling-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c7-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c7-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c8-m1
version: 1
scenario: >-
  You're at a team dinner making small talk with a colleague you've just met.
  You share a wry observation that genuinely amuses you — but they don't laugh,
  and a brief awkward pause settles in. How do you handle the moment?
options:
  - id: a
    content: >-
      Acknowledge it lightly — "You didn't find that funny, did you?" — and
      continue naturally
    pros:
      - defuses the awkward moment calmly
      - keeps the conversation mutual and authentic
      - >-
        shows the joke expressed your own perspective rather than a bid for
        approval
      - lets you carry on without panic or over-correction
    cons:
      - requires a brief moment of visible vulnerability
  - id: b
    content: Say nothing about the joke and simply keep the conversation flowing
    pros:
      - avoids panicking or over-explaining
      - keeps the conversation moving
      - doesn't make the failed joke the center of attention
    cons:
      - pretending nothing happened may create more tension than recognizing it
      - the unacknowledged moment can linger beneath the surface
  - id: c
    content: Quickly pivot to a fresh topic to move past the awkward pause
    pros:
      - escapes the uncomfortable moment fast
      - gives the conversation a fresh start
    cons:
      - the abrupt subject change can feel like fleeing the moment
      - creates more tension than calmly recognizing it
      - lets their reaction shake your confidence
  - id: d
    content: Briefly explain the context so they can see why the joke was funny
    pros:
      - shows there was a genuine point behind the joke
      - might help them catch the reference
    cons:
      - over-explaining makes the moment heavier
      - reads as fishing for approval or validation
      - turns a light moment into a defense of your humor
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c8-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 1
  d: 0
hints:
  b: >-
    Moving on without comment avoids panic, but pretending nothing happened can
    create more tension than a light acknowledgment.
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c8-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: hook-lead-5-humor
  position: after
concepts:
  - humor as self-expression vs. approval-seeking
  - recovering from a failed joke
  - acknowledging awkward moments
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: How do you handle the moment?
validator:
  kind: rubric
  ref: 08-conversation-hooks-and-storytelling-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c8-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c8-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c9-m1
version: 1
scenario: >-
  You're at the pub turning an ordinary night out into a story for a
  half-distracted friend. Tune the four storytelling factors and flip any
  delivery overrides that help until every metric lands inside its target band.
outputs:
  - id: out1
    label: Audience Engagement
    baseValue: 10
    targetMin: 50
    targetMax: 75
  - id: out2
    label: Emotional Connection
    baseValue: 5
    targetMin: 30
    targetMax: 60
  - id: out3
    label: Story Clarity
    baseValue: 60
    targetMin: 40
    targetMax: 60
  - id: out4
    label: Follow-up Threads
    baseValue: 2
    targetMin: 10
    targetMax: 28
sliders:
  - id: s1
    label: Inclusion — questions to the listener
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 4
      - outputId: out4
        multiplier: 1
      - outputId: out3
        multiplier: -3
  - id: s2
    label: Timing — pauses, pace, voice
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 3
      - outputId: out2
        multiplier: 2
  - id: s3
    label: Emotion — specific feeling words
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 4
      - outputId: out4
        multiplier: 1
  - id: s4
    label: Description — sensory detail
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 2
      - outputId: out4
        multiplier: 2
      - outputId: out3
        multiplier: -1
cards:
  - id: c1
    label: Precise feeling words (drop 'nice' and 'cool')
    effects:
      - outputId: out2
        multiplier: 6
      - outputId: out4
        multiplier: 2
  - id: c2
    label: Pause and lower your voice at the tense beat
    effects:
      - outputId: out1
        multiplier: 4
      - outputId: out2
        multiplier: 3
  - id: c3
    label: Compress the whole story into one rushed sentence
    effects:
      - outputId: out3
        multiplier: -15
      - outputId: out4
        multiplier: -7
      - outputId: out2
        multiplier: -5
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c9-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      outputId: out3
    hint: >-
      Story Clarity only erodes: each Inclusion notch costs 3, each Description
      notch costs 1, and the rushed one-sentence summary card costs 15. Keep (3
      × Inclusion) + Description at 20 or below, and let Timing and Emotion
      carry Engagement and Connection.
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c9-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: parameter-tuner
tier: Medium
anchor:
  heading: continuing-after-the-anecdote
  position: after
concepts:
  - Inclusion
  - Timing
  - Emotion
  - Description
  - Follow-up threads
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Tune the four storytelling factors — and flip any delivery overrides that help
  — until all four story metrics sit inside their target bands.
validator:
  kind: invariants
  ref: 08-conversation-hooks-and-storytelling-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c9-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c9-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c10-m1
version: 1
attributes:
  - id: hooks
    label: New Hooks
  - id: specificity
    label: Specificity
  - id: pressure
    label: Pressure
components:
  - id: c1
    content: Ask them to say something in their native language
    metrics:
      hooks: 1
      specificity: 1
      pressure: 2
  - id: c2
    content: Ask them to tell you three interesting facts about Sweden
    metrics:
      hooks: 3
      specificity: 3
      pressure: 2
  - id: c3
    content: >-
      Say you reckon they shop at Harrods and top stores, but secretly love
      finding treasures in second-hand shops
    metrics:
      hooks: 2
      specificity: 5
      pressure: 1
  - id: c4
    content: Say you reckon they like traveling
    metrics:
      hooks: 1
      specificity: 1
      pressure: 1
  - id: c5
    content: >-
      Say you reckon they go to Greece either for its history and ruins, or
      purely to relax in the sun and avoid sightseeing
    metrics:
      hooks: 2
      specificity: 4
      pressure: 1
requirements:
  - attributeId: hooks
    operator: '>='
    value: 4
    description: Open at least four new directions the conversation could take
  - attributeId: specificity
    operator: '>='
    value: 7
    description: The combined moves must feel individual rather than generic
  - attributeId: pressure
    operator: <=
    value: 4
    description: Keep the total demand placed on the other person low
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c10-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: specificity
    hint: >-
      Generic moves like 'say something' or 'I reckon you like traveling' add
      almost no specificity.
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c10-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: constraint-construction
tier: Medium
anchor:
  heading: two-option-assumption
  position: after
concepts:
  - task lead
  - assumption lead
  - specific vs vague assumptions
  - low-pressure invitations
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Combine conversation lead moves that open enough new hooks, feel specific, and
  stay low-pressure.
validator:
  kind: invariants
  ref: 08-conversation-hooks-and-storytelling-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c10-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c10-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 08-conversation-hooks-and-storytelling-medium-c11-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Start with only three leads, including Validation and Tasks
  - id: s2
    isMissing: true
  - id: s3
    content: Keep practicing until choosing among those three leads becomes reflexive
  - id: s4
    isMissing: true
  - id: s5
    content: Continue until the wider set of leads feels natural rather than scripted
options:
  - id: o1
    content: >-
      When a pause or dead end occurs, choose one of the three selected leads
      instead of searching desperately for an unrelated subject
  - id: o2
    content: Add one new lead at a time to the practice set
  - id: o3
    content: >-
      When a pause occurs, grab any unrelated subject that comes to mind so the
      conversation never goes quiet
  - id: o4
    content: >-
      Once the first three leads feel reflexive, add several new leads at once
      to accelerate progress
  - id: o5
    content: >-
      Memorize a set of polished lines for each lead so you never stall
      mid-conversation
:::

:::mechanic-private
id: 08-conversation-hooks-and-storytelling-medium-c11-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 08-conversation-hooks-and-storytelling-medium-c11-m1
version: 1
lessonSlug: 08-conversation-hooks-and-storytelling-medium
type: missing-step
tier: Medium
anchor:
  heading: practice-method
  position: after
concepts:
  - gradual practice method for conversational leads
  - responding to pauses with selected leads
  - expanding the lead set incrementally
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Fill the missing steps in the gradual practice method for learning
  conversational leads
validator:
  kind: mapping
  ref: 08-conversation-hooks-and-storytelling-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 08-conversation-hooks-and-storytelling-medium-c11-m1:public
privateValidatorRef: 08-conversation-hooks-and-storytelling-medium-c11-m1:private
rewardIdentity: 08-conversation-hooks-and-storytelling-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"outcome-dependency"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-the-nine-hook-lead-system"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"hook-calibre"},{"mechanicType":"prediction","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"hook-lead-1-open-question"},{"mechanicType":"sequence-builder","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"defusing-personal-disagreement"},{"mechanicType":"diagnostic-lab","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"playful-challenge"},{"mechanicType":"tradeoff-decision","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"hook-lead-5-humor"},{"mechanicType":"parameter-tuner","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"continuing-after-the-anecdote"},{"mechanicType":"constraint-construction","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"two-option-assumption"},{"mechanicType":"missing-step","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"practice-method"}]}
:::