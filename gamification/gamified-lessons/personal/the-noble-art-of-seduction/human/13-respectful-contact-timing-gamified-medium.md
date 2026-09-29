:::mechanic-data
id: 13-respectful-contact-timing-medium-c2-m1
version: 1
categories:
  - id: cat-a
    label: Timing Recommendation
  - id: cat-b
    label: Stated Rationale
  - id: cat-c
    label: Adaptation Principle
items:
  - id: i1
    content: Call that same evening after a spontaneous, direct daytime approach
  - id: i2
    content: >-
      Waiting until the third day creates anticipation without leaving enough
      time for interest to turn into resentment
  - id: i3
    content: >-
      A time that is convenient for one person may be intrusive, exhausting, or
      impractical for another
  - id: i4
    content: >-
      Make contact on Sunday, the fifth day, when the number was received on a
      Tuesday
  - id: i5
    content: >-
      An invitation on Friday or Saturday may collide with plans the person
      already has
  - id: i6
    content: >-
      If the person's schedule and communication preferences are unknown, ask
      rather than assume
  - id: i7
    content: >-
      Call Monday through Thursday between 10:00 and 11:00 p.m. during a
      standard calling window
  - id: i8
    content: >-
      Many people are assumed to be free during the standard late-evening
      calling window
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-c
  i4: cat-a
  i5: cat-b
  i6: cat-c
  i7: cat-a
  i8: cat-b
:::

:::mechanic
schemaVersion: 1
id: 13-respectful-contact-timing-medium-c2-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: quick-classification
tier: Medium
anchor:
  heading: 1-contact-timing-after-an-initial-interaction
  position: after
concepts:
  - contact timing after an initial interaction
  - stated rationale vs. recommendation
  - adapting timing to the individual
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each contact-timing statement: Timing Recommendation, Stated
  Rationale, or Adaptation Principle
validator:
  kind: mapping
  ref: 13-respectful-contact-timing-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 13-respectful-contact-timing-medium-c2-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c2-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 13-respectful-contact-timing-medium-c3-m1
version: 1
items:
  - id: i1
    content: >-
      Not yet concerned: the person may hope to be contacted, but no contact
      does not yet bother them
  - id: i2
    content: >-
      Curiosity sets in: the person begins wondering why there has been no
      contact
  - id: i3
    content: >-
      Peak uncertainty: the source claims uncertainty is at its highest, making
      contact especially welcome
  - id: i4
    content: >-
      Final practical window: the latest point before delayed contact risks
      receiving a cold response
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c3-m1
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
id: 13-respectful-contact-timing-medium-c3-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: sequence-builder
tier: Medium
anchor:
  heading: 2-the-source-s-third-day-logic
  position: after
concepts:
  - the source's four-day psychological sequence
  - escalation from unconcern to peak uncertainty
  - day four as the latest practical contact point
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  From unconcerned hope to the risk of a cold response: the source's four-stage
  'third-day' psychological sequence in order
validator:
  kind: sequence
  ref: 13-respectful-contact-timing-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 13-respectful-contact-timing-medium-c3-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c3-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 13-respectful-contact-timing-medium-c4-m1
version: 1
scenario: >-
  Maya met Devon at a dinner party and wants to reconnect. In their first
  conversation, Devon mentioned that he works evening shifts Tuesday through
  Saturday, usually rests on Sunday mornings, and prefers text messages over
  phone calls. Each clue below describes a choice someone in Maya's position
  might make when reaching out. Match each clue to the theory of respectful
  scheduling it best reflects.
theories:
  - id: th-a
    content: >-
      Context-sensitive scheduling — let the specific details the person already
      shared (work hours, routines, commitments, rest periods, preferred contact
      method) determine when and how you reach out.
  - id: th-b
    content: >-
      Default-and-assumption scheduling — rely on general rules or guesses about
      'most people' (such as 'evenings are a safe time to call') instead of
      adjusting for what this particular person told you.
  - id: th-c
    content: >-
      Consent-first messaging — send a brief message that asks whether now is a
      good time and invites the other person to choose the timing, giving them
      control before any call happens.
clues:
  - id: c1
    content: >-
      Reviewing what Devon mentioned at dinner, you rule out Tuesday through
      Saturday evenings because those are his work shifts.
  - id: c2
    content: >-
      You decide a late-evening call must be welcome because a general etiquette
      guide lists evenings as a polite default time to call.
  - id: c3
    content: >-
      Devon said he prefers texts over calls, so you open with a message rather
      than dialing.
  - id: c4
    content: >-
      You send: 'Hey, I enjoyed meeting you. Is this a good time to call, or
      would another time suit you?'
  - id: c5
    content: >-
      The outreach communicates interest, asks about availability, and makes it
      easy for Devon to suggest another time — direct without being demanding.
  - id: c6
    content: >-
      You call on Sunday morning, guessing that must be a free gap for someone
      who works evenings — even though Devon mentioned he usually rests then.
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c4-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-a
  c4: th-c
  c5: th-c
  c6: th-b
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-c
    hint: >-
      This choice is based on a preference Devon explicitly stated.
      Consent-first messaging is about asking when you don't yet know — which
      theory covers acting on information the person already shared?
:::

:::mechanic
schemaVersion: 1
id: 13-respectful-contact-timing-medium-c4-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: evidence-match
tier: Medium
anchor:
  heading: 3-context-sensitive-scheduling
  position: after
concepts:
  - context-sensitive scheduling
  - specific information vs. general defaults
  - consent-first messaging
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 13-respectful-contact-timing-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 13-respectful-contact-timing-medium-c4-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c4-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 13-respectful-contact-timing-medium-c5-m1
version: 1
scenario: >-
  You met someone at a friend's dinner party and hit it off over an easy
  conversation about travel photography. You exchanged numbers, and now you're
  making the first call. Which approach gives this call the best chance of doing
  its job?
options:
  - id: a
    content: >-
      Reconnect over the conversation you shared, and if interest feels mutual,
      propose a specific plan tied to it
    pros:
      - Builds on the tone and subject of the initial interaction
      - Honest about the reason for reconnecting
      - Offers a clear next step if both people seem interested
      - Aims to discover whether both want to meet again
    cons:
      - Requires gauging mutual interest before inviting
      - Feels more exposed than staying casual
  - id: b
    content: >-
      Keep the call light and casual, closing with a vague 'we should hang out
      sometime'
    pros:
      - Keeps pressure low
      - Preserves a friendly, unhurried tone
    cons:
      - Never clearly expresses intent
      - Risks becoming indefinite casual conversation
      - Leaves the next step undefined
  - id: c
    content: >-
      Open with the invitation immediately, proposing a specific date and time
      in the first minute
    pros:
      - Makes intent unmistakable
      - Gets to the point quickly
    cons:
      - Skips reconnecting with the initial interaction
      - Can feel rushed or mechanically forced
      - Treats securing a yes as the goal
  - id: d
    content: Run a rehearsed routine designed to steer the call toward getting a yes
    pros:
      - Feels confident and prepared
      - Gives a sense of control over the outcome
    cons:
      - Performs a technique instead of reconnecting honestly
      - Focuses on securing a particular response
      - Ignores whether both people actually want to meet again
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c5-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 1
  d: 0
hints:
  b: >-
    Staying casual keeps pressure low, but the lesson warns against an unclear
    exchange that never expresses intent — a vague 'sometime' is not a clear
    next step.
:::

:::mechanic
schemaVersion: 1
id: 13-respectful-contact-timing-medium-c5-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 4-the-purpose-of-the-first-call
  position: after
concepts:
  - purpose of the first call
  - specific invitation vs. indefinite casual conversation
  - discovering mutual interest vs. securing a response
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Choose the approach that best fulfills the purpose of a first call.
validator:
  kind: rubric
  ref: 13-respectful-contact-timing-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 13-respectful-contact-timing-medium-c5-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c5-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 13-respectful-contact-timing-medium-c6-m1
version: 1
scenario: >-
  It's time to make the call, and the other person may be free or busy.
  Configure your environment and your fallback plan so the call comes across
  clear, easygoing, genuine, and respectful of whatever they say.
outputs:
  - id: out1
    label: Hearing Clarity (both sides audible)
    baseValue: 30
    targetMin: 70
    targetMax: 100
  - id: out2
    label: Relaxed, Unpressured Mood
    baseValue: 35
    targetMin: 50
    targetMax: 80
  - id: out3
    label: Authenticity (nothing faked)
    baseValue: 75
    targetMin: 70
    targetMax: 100
  - id: out4
    label: Respect for Their Availability
    baseValue: 15
    targetMin: 60
    targetMax: 100
sliders:
  - id: s1
    label: Quietness of Your Spot
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 5
      - outputId: out2
        multiplier: -1
  - id: s2
    label: Genuine Ambient Activity Around You
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 4
      - outputId: out1
        multiplier: -2
  - id: s3
    label: Staged Busyness (fake noise, name-drops)
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 5
      - outputId: out3
        multiplier: -7
      - outputId: out1
        multiplier: -2
  - id: s4
    label: Insisting After 'I'm Not Available'
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out4
        multiplier: -8
      - outputId: out2
        multiplier: -2
  - id: s5
    label: Concreteness of Your Alternative Offer
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out4
        multiplier: 5
      - outputId: out2
        multiplier: 1
cards:
  - id: c1
    label: Move Somewhere Quieter Once Talking
    effects:
      - outputId: out1
        multiplier: 15
      - outputId: out2
        multiplier: -2
  - id: c2
    label: Accept Unavailability Plainly
    effects:
      - outputId: out4
        multiplier: 20
      - outputId: out3
        multiplier: 5
  - id: c3
    label: Leave Room to Counter-Offer or Decline
    effects:
      - outputId: out4
        multiplier: 12
      - outputId: out2
        multiplier: 4
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c6-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      outputId: out3
    hint: >-
      Only 'Staged Busyness' destroys Authenticity — keep it at 0 and build the
      relaxed mood from genuine ambient activity instead; 'Accept Unavailability
      Plainly' gives Authenticity a small boost.
:::

:::mechanic
schemaVersion: 1
id: 13-respectful-contact-timing-medium-c6-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: parameter-tuner
tier: Medium
anchor:
  heading: 5-creating-a-suitable-conversation-environment
  position: after
concepts:
  - clear hearing over atmosphere
  - genuine vs manufactured background activity
  - accepting unavailability without pressure
  - concrete but flexible alternative offers
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Tune your call setup and fallback plan until all four metrics land inside
  their target ranges.
validator:
  kind: invariants
  ref: 13-respectful-contact-timing-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 13-respectful-contact-timing-medium-c6-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c6-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 13-respectful-contact-timing-medium-c7-m1
version: 1
attributes:
  - id: specificity
    label: Specificity
    iconKeyword: target
  - id: flexibility
    label: Flexibility
    iconKeyword: arrows
  - id: pressure
    label: Pressure
    iconKeyword: gauge
components:
  - id: c1
    content: >-
      Name the activity and place — state exactly what you'd like to do and
      where it would happen
    metrics:
      specificity: 3
      flexibility: 1
      pressure: 1
  - id: c2
    content: >-
      Propose a day and approximate time — offer one concrete slot, like
      Thursday around 7
    metrics:
      specificity: 3
      flexibility: 1
      pressure: 1
  - id: c3
    content: >-
      Invite an alternative — add a line such as 'if not, what day works for
      you?'
    metrics:
      specificity: 1
      flexibility: 4
      pressure: 1
  - id: c4
    content: >-
      State the emotional stakes — mention you'd be disappointed if the answer
      is no
    metrics:
      specificity: 1
      flexibility: 0
      pressure: 4
  - id: c5
    content: Ask again after a no — repeat the invitation the day after it's declined
    metrics:
      specificity: 1
      flexibility: 0
      pressure: 5
requirements:
  - attributeId: specificity
    operator: '>='
    value: 7
    description: 'Specific enough to answer: activity, place, day, and time are all covered.'
  - attributeId: flexibility
    operator: '>='
    value: 5
    description: The other person can easily suggest a different day.
  - attributeId: pressure
    operator: <=
    value: 4
    description: No obligation is placed on them, and nothing pushes after a refusal.
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c7-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: pressure
    hint: Adding emotional stakes or a repeat ask pushes pressure past the cap of 4.
:::

:::mechanic
schemaVersion: 1
id: 13-respectful-contact-timing-medium-c7-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: constraint-construction
tier: Medium
anchor:
  heading: 6-closing-with-a-specific-date-invitation
  position: after
concepts:
  - complete invitation (activity, day, time, place)
  - inviting without pressure
  - allowing the other person to propose an alternative
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Build an invitation that is specific, flexible, and low-pressure.
validator:
  kind: invariants
  ref: 13-respectful-contact-timing-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 13-respectful-contact-timing-medium-c7-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c7-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 13-respectful-contact-timing-medium-c8-m1
version: 1
question: >-
  You invite someone out and they decline without giving a reason. A friend
  advises waiting three days and inviting them again, claiming that people of
  that gender reliably respond well to persistence after a delay. According to
  the lesson's guardrails, what is the core problem with this advice?
options:
  - id: a
    content: >-
      It treats a decline as an obstacle to overcome and treats gendered claims
      as evidence — the outcome should be respected without needing to know the
      precise reason, and such claims are anecdotal, not evidence-based.
  - id: b
    content: >-
      The delay is too short — gendered patterns show that people of that gender
      respond better to longer stretches of silence, so the tactic would work
      with better timing.
  - id: c
    content: >-
      The advice is acceptable as long as the person seems uncertain rather than
      uninterested, since uncertainty is a valid reason to follow up.
  - id: d
    content: >-
      Persistence after a decline is fine provided it is expressed clearly and
      respectfully, since clarity is what distinguishes healthy from unhealthy
      communication.
:::

:::mechanic-private
id: 13-respectful-contact-timing-medium-c8-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 13-respectful-contact-timing-medium-c8-m1
version: 1
lessonSlug: 13-respectful-contact-timing-medium
type: multiple-choice
tier: Medium
anchor:
  heading: prioritize-clarity-consent-and-compatibility
  position: after
concepts:
  - respecting nonparticipation without knowing the reason
  - gendered claims as anecdotal vs evidence-based
  - manipulation tactics vs honest communication
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 13-respectful-contact-timing-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 13-respectful-contact-timing-medium-c8-m1:public
privateValidatorRef: 13-respectful-contact-timing-medium-c8-m1:private
rewardIdentity: 13-respectful-contact-timing-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-contact-timing-after-an-initial-interaction"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-the-source-s-third-day-logic"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"3-context-sensitive-scheduling"},{"mechanicType":"tradeoff-decision","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"4-the-purpose-of-the-first-call"},{"mechanicType":"parameter-tuner","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"5-creating-a-suitable-conversation-environment"},{"mechanicType":"constraint-construction","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"6-closing-with-a-specific-date-invitation"},{"mechanicType":"multiple-choice","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"prioritize-clarity-consent-and-compatibility"}]}
:::