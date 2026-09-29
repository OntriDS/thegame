:::mechanic-data
id: 10-handling-defensive-social-responses-medium-c2-m1
version: 1
scenario: >-
  You're observing interactions at a crowded rooftop party. Over the evening,
  several guests respond to friendly approaches with cold, dismissive, or
  challenging reactions. The lesson treats guarded behavior as situational
  rather than a personality trait, and offers three candidate explanations: a
  protective shortcut learned from repeated unwanted attention, a temporary
  negative state, or a deliberate test of how someone handles pressure. Match
  each clue to the theory it best supports. Keep in mind: the surface form of a
  response — cold, sarcastic, or challenging — doesn't by itself reveal the
  cause; the surrounding details do.
theories:
  - id: th-a
    content: >-
      Protective shortcut from repeated unwanted attention — the coldness is a
      learned defense shaped by past intrusive or presumptive approaches, meant
      to stop an interaction before it escalates.
  - id: th-b
    content: >-
      Temporary negative state — stress, exhaustion, or a bad day is coloring
      the response; the sharpness reflects the person's present state, not their
      character or the person approaching them.
  - id: th-c
    content: >-
      Social testing — the person is deliberately applying pressure to see how
      the other handles it, staying engaged while they evaluate the response.
clues:
  - id: c1
    content: >-
      Priya has already been cornered twice tonight by pushy, presumptive
      strangers. When a third person approaches — this time politely — she shuts
      the interaction down within seconds, before they can finish their first
      sentence.
  - id: c2
    content: >-
      Dev cuts off a friendly question with a flat 'not interested.' Minutes
      later he apologizes: 'Sorry — cancelled flight, awake since 4 a.m., I'm
      running on nothing.'
  - id: c3
    content: >-
      Lena fires a sharp challenge — 'Seriously? Another one tonight?' — moments
      after turning away two persistent strangers.
  - id: c4
    content: >-
      Marcus snaps at a completely ordinary question, harsher than the moment
      warrants. His friend explains he got rough news this morning and has been
      short with everyone all day.
  - id: c5
    content: >-
      Aisha raises a skeptical eyebrow — 'Why should I keep talking to you?' —
      but she doesn't leave. She waits through the pause and gives a small
      approving nod when the reply comes back steady.
  - id: c6
    content: >-
      Jonas answers the opener with flat sarcasm — 'Oh great, small talk, love
      it.' But he stays put, keeps tossing pointed follow-up questions, and
      cracks a half-smile only when an answer holds firm under the pressure.
:::

:::mechanic-private
id: 10-handling-defensive-social-responses-medium-c2-m1
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
      The sharp challenge reads like a test, but look at what came right before
      it: 'another one tonight,' moments after two persistent strangers. This
      clue points to a protective shortcut, not an evaluation.
:::

:::mechanic
schemaVersion: 1
id: 10-handling-defensive-social-responses-medium-c2-m1
version: 1
lessonSlug: 10-handling-defensive-social-responses-medium
type: evidence-match
tier: Medium
anchor:
  heading: social-testing
  position: after
concepts:
  - situational defensive behavior vs. permanent personality trait
  - repeated unwanted attention as a protective shortcut
  - temporary negative states affecting communication
  - social testing and the limits of inferring intent
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 10-handling-defensive-social-responses-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 10-handling-defensive-social-responses-medium-c2-m1:public
privateValidatorRef: 10-handling-defensive-social-responses-medium-c2-m1:private
rewardIdentity: 10-handling-defensive-social-responses-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 10-handling-defensive-social-responses-medium-c3-m1
version: 1
scenario: >-
  During a project review, a senior colleague interrupts your proposal, calls it
  'amateur hour,' and rolls their eyes while the rest of the room goes quiet.
  You feel a surge of anger and embarrassment, and part of you wants to fire
  back on the spot. Predict how to keep this interaction from escalating.
startNodeId: n1
nodes:
  - id: n1
    question: >-
      You feel the flash of anger and embarrassment. What is your first move to
      prevent escalation?
    options:
      - id: a1
        content: >-
          Pause and create mental distance so you can choose your next words
          deliberately instead of acting straight from the emotion
        nextNodeId: n2
      - id: b1
        content: >-
          Fire back immediately with a sharp remark so the room sees you won't
          be pushed around
        nextNodeId: null
      - id: c1
        content: >-
          Suppress everything and act as if the comment never happened, even to
          yourself
        nextNodeId: null
      - id: d1
        content: >-
          Let your frustration show on your face and in your tone so the
          colleague knows they crossed a line
        nextNodeId: null
  - id: n2
    question: >-
      You've paused and steadied your expression and voice. How do you interpret
      the colleague's mockery to stay composed?
    options:
      - id: a2
        content: >-
          Treat it as defensive or theatrical behavior rather than automatically
          as a serious threat
        nextNodeId: n3
      - id: b2
        content: >-
          Treat it as a serious personal attack that you must rebut point by
          point right now
        nextNodeId: null
      - id: c2
        content: Conclude that the mockery proves your proposal really is amateur work
        nextNodeId: null
      - id: d2
        content: >-
          Decide that disrespect from a senior colleague is simply acceptable in
          this setting
        nextNodeId: null
  - id: n3
    question: >-
      With the behavior reframed and your composure intact, what does that
      composure actually preserve for you?
    options:
      - id: a3
        content: >-
          The ability to set a boundary, redirect the conversation, or leave if
          the interaction is no longer worth continuing
        nextNodeId: n4
      - id: b3
        content: >-
          A license to belittle the colleague in return, now that you're calm
          and in control
        nextNodeId: null
      - id: c3
        content: >-
          A guarantee that the colleague will realize they were wrong and
          apologize
        nextNodeId: null
      - id: d3
        content: >-
          Complete indifference — feeling nothing at all about the exchange from
          now on
        nextNodeId: null
  - id: n4
    question: >-
      The meeting continues. What outcome confirms the detachment actually
      worked?
    options:
      - id: a4
        content: >-
          The exchange stays contained: you set a boundary or redirect the
          discussion without a public scene, and no one nearby is made
          uncomfortable
        nextNodeId: null
      - id: b4
        content: >-
          The colleague is visibly humiliated and goes silent for the rest of
          the meeting
        nextNodeId: null
      - id: c4
        content: You feel zero emotion about the incident by the end of the day
        nextNodeId: null
      - id: d4
        content: >-
          You win the argument and the room openly sides with you against the
          colleague
        nextNodeId: null
:::

:::mechanic-private
id: 10-handling-defensive-social-responses-medium-c3-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3,a4
:::

:::mechanic
schemaVersion: 1
id: 10-handling-defensive-social-responses-medium-c3-m1
version: 1
lessonSlug: 10-handling-defensive-social-responses-medium
type: prediction
tier: Medium
anchor:
  heading: 3-emotional-detachment-prevents-escalation
  position: after
concepts:
  - emotional detachment
  - reframing hostility
  - composure under provocation
  - de-escalation
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: How does the de-escalation decision unfold in this tense meeting?
validator:
  kind: exact
  ref: 10-handling-defensive-social-responses-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 10-handling-defensive-social-responses-medium-c3-m1:public
privateValidatorRef: 10-handling-defensive-social-responses-medium-c3-m1:private
rewardIdentity: 10-handling-defensive-social-responses-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 10-handling-defensive-social-responses-medium-c4-m1
version: 1
categories:
  - id: cat-a
    label: Sign of a negative pattern
  - id: cat-b
    label: Calm but passively cooperating
  - id: cat-c
    label: Genuine composure
items:
  - id: i1
    content: One person continually interrupts the other just as they begin to answer
  - id: i2
    content: >-
      One person asks question after question but refuses to answer any
      reciprocal questions
  - id: i3
    content: >-
      You keep a steady, even tone while dutifully answering every demand the
      other person makes
  - id: i4
    content: >-
      You notice the exchange has become an interrogation and choose to stop
      participating in it
  - id: i5
    content: Answers are used as material for mockery or dismissal
  - id: i6
    content: >-
      You remain composed and polite while allowing the other person to control
      the entire exchange
  - id: i7
    content: >-
      You pause to assess whether the conversation's structure is mutual before
      deciding how to engage
  - id: i8
    content: Topics are changed unilaterally, without any shared agreement
shuffle: true
:::

:::mechanic-private
id: 10-handling-defensive-social-responses-medium-c4-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-a
  i3: cat-b
  i4: cat-c
  i5: cat-a
  i6: cat-b
  i7: cat-c
  i8: cat-a
:::

:::mechanic
schemaVersion: 1
id: 10-handling-defensive-social-responses-medium-c4-m1
version: 1
lessonSlug: 10-handling-defensive-social-responses-medium
type: quick-classification
tier: Medium
anchor:
  heading: 4-calmness-is-necessary-but-not-sufficient
  position: after
concepts:
  - calmness is necessary but not sufficient
  - signs of a negative conversational pattern
  - genuine composure vs. passive cooperation
  - noticing the structure of a conversation
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each conversation behavior: Sign of a negative pattern, Calm but
  passively cooperating, or Genuine composure
validator:
  kind: mapping
  ref: 10-handling-defensive-social-responses-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 10-handling-defensive-social-responses-medium-c4-m1:public
privateValidatorRef: 10-handling-defensive-social-responses-medium-c4-m1:private
rewardIdentity: 10-handling-defensive-social-responses-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 10-handling-defensive-social-responses-medium-c5-m1
version: 1
scenario: >-
  During your project update, a colleague repeatedly interrupts with accusatory
  questions — 'Why does your team always drop the ball?' — and raises a new
  complaint each time you begin to answer. You notice yourself defending
  point-by-point as the tone turns hostile. You want to restore a respectful,
  reciprocal exchange.
options:
  - id: a
    content: >-
      Pause, acknowledge the question without complying, then calmly return to
      the original subject
    pros:
      - Creates a pause between stimulus and response
      - Signals that your participation is voluntary, not automatic
      - Prevents topic changes from being used to avoid reciprocity
      - Stays respectful instead of seizing control of the conversation
    cons:
      - Requires steady composure while under attack
      - May not work if the hostility continues
  - id: b
    content: >-
      Answer every accusation thoroughly and in order, with detailed
      justifications
    pros:
      - Demonstrates good faith and transparency
      - Addresses every specific concern that was raised
    cons:
      - Follows the unhealthy conversational script automatically
      - Lets the challenger control the emotional tone
      - Keeps you permanently on the defensive
      - Rewards each derailment with your full attention
  - id: c
    content: Deflect with sharp sarcasm about how the questions keep changing
    pros:
      - Releases tension in the moment
      - Feels like reclaiming the upper hand
    cons:
      - Mocks instead of softening the exchange
      - Disguises hostility as playfulness
      - Risks humiliating the colleague in front of others
      - Can escalate the hostility rather than reset it
  - id: d
    content: Calmly end your participation in the exchange
    pros:
      - Valid when respect does not emerge
      - Leaving calmly can show more confidence than pursuing approval
      - Avoids the trap of trying to win the exchange
    cons:
      - Skips attempting a reset before withdrawing
      - Forfeits the chance to restore reciprocity
      - Can read as abandoning a workable discussion
:::

:::mechanic-private
id: 10-handling-defensive-social-responses-medium-c5-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
  d: 2
hints:
  d: >-
    Disengaging is valid, but the lesson treats it as the fallback after a reset
    attempt — try creating the pause first.
:::

:::mechanic
schemaVersion: 1
id: 10-handling-defensive-social-responses-medium-c5-m1
version: 1
lessonSlug: 10-handling-defensive-social-responses-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: disengage-when-respect-does-not-emerge
  position: after
concepts:
  - pattern interruption
  - acknowledge before answering
  - returning to the original subject
  - disengagement as fallback
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which approach best applies pattern interruption to this situation?
validator:
  kind: rubric
  ref: 10-handling-defensive-social-responses-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 10-handling-defensive-social-responses-medium-c5-m1:public
privateValidatorRef: 10-handling-defensive-social-responses-medium-c5-m1:private
rewardIdentity: 10-handling-defensive-social-responses-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 10-handling-defensive-social-responses-medium-c6-m1
version: 1
question: >-
  During a conversation, someone makes a blunt demand that you consider
  unreasonable. According to the framework, which response best exemplifies
  validation as a form of pattern interruption?
options:
  - id: a
    content: >-
      Tell them bluntly that their demand is rude, so they learn their hostility
      will not be rewarded.
  - id: b
    content: >-
      Acknowledge the directness or confidence behind the demand while still
      declining the request.
  - id: c
    content: >-
      Agree to a scaled-down version of the demand to show goodwill and keep the
      exchange friendly.
  - id: d
    content: >-
      Stay silent and expressionless, since validation means giving no reaction
      at all.
:::

:::mechanic-private
id: 10-handling-defensive-social-responses-medium-c6-m1
version: 1
kind: exact
correctAnswer: b
:::

:::mechanic
schemaVersion: 1
id: 10-handling-defensive-social-responses-medium-c6-m1
version: 1
lessonSlug: 10-handling-defensive-social-responses-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 6-validation-as-a-form-of-pattern-interruption
  position: after
concepts:
  - >-
    validation means recognizing a quality (directness, confidence) without
    agreeing to unreasonable demands
  - validation is not surrender
  - non-reactive responses to blunt demands
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 10-handling-defensive-social-responses-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 10-handling-defensive-social-responses-medium-c6-m1:public
privateValidatorRef: 10-handling-defensive-social-responses-medium-c6-m1:private
rewardIdentity: 10-handling-defensive-social-responses-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 10-handling-defensive-social-responses-medium-c7-m1
version: 1
categories:
  - id: cat-composure
    label: Composure
  - id: cat-boundaries
    label: Boundaries
  - id: cat-reciprocity
    label: Reciprocity
items:
  - id: i1
    content: >-
      Keeping your pace and tone measured rather than escalating to match the
      other person
  - id: i2
    content: Resisting the impulse to fire back an insult after being mocked
  - id: i3
    content: Ending the exchange once you have decided you are done
  - id: i4
    content: Asking the other person to communicate respectfully before you continue
  - id: i5
    content: Declining a demand you are not willing to meet
  - id: i6
    content: Both people having a say in whether the conversation continues
  - id: i7
    content: Either person being free to steer the discussion toward a different topic
  - id: i8
    content: Both people having room to speak and ask questions
:::

:::mechanic-private
id: 10-handling-defensive-social-responses-medium-c7-m1
version: 1
kind: mapping
matches:
  i1: cat-composure
  i2: cat-composure
  i3: cat-boundaries
  i4: cat-boundaries
  i5: cat-boundaries
  i6: cat-reciprocity
  i7: cat-reciprocity
  i8: cat-reciprocity
:::

:::mechanic
schemaVersion: 1
id: 10-handling-defensive-social-responses-medium-c7-m1
version: 1
lessonSlug: 10-handling-defensive-social-responses-medium
type: quick-classification
tier: Medium
anchor:
  heading: reciprocity
  position: after
concepts:
  - composure under pressure
  - setting boundaries
  - reciprocity in conversation
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each behavior from the response framework: Composure, Boundaries, or
  Reciprocity
validator:
  kind: mapping
  ref: 10-handling-defensive-social-responses-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 10-handling-defensive-social-responses-medium-c7-m1:public
privateValidatorRef: 10-handling-defensive-social-responses-medium-c7-m1:private
rewardIdentity: 10-handling-defensive-social-responses-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7],"sectionMechanics":[{"mechanicType":"evidence-match","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"social-testing"},{"mechanicType":"prediction","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"3-emotional-detachment-prevents-escalation"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"4-calmness-is-necessary-but-not-sufficient"},{"mechanicType":"tradeoff-decision","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"disengage-when-respect-does-not-emerge"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"6-validation-as-a-form-of-pattern-interruption"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"reciprocity"}]}
:::