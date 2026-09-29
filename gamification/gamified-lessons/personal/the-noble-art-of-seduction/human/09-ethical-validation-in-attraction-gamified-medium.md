:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c2-m1
version: 1
categories:
  - id: cat-approval
    label: Approval-Seeking
  - id: cat-worth
    label: Healthy Self-Worth
  - id: cat-mutual
    label: Mutual Evaluation
items:
  - id: i1
    content: Agreeing with everything the other person says
  - id: i2
    content: Treating the other person's attention as proof of your personal worth
  - id: i3
    content: Praising every interest or accomplishment automatically
  - id: i4
    content: Refusing to make your worth depend entirely on someone else's approval
  - id: i5
    content: >-
      Remaining open to the other person's preferences even when they differ
      from yours
  - id: i6
    content: Accepting that incompatibility is not the same as inferiority
  - id: i7
    content: >-
      Both people considering whether their values, interests, behavior, and
      expectations are compatible
  - id: i8
    content: >-
      Each person holding authentic preferences and boundaries while treating
      the other as an equal
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-approval
  i2: cat-approval
  i3: cat-approval
  i4: cat-worth
  i5: cat-worth
  i6: cat-worth
  i7: cat-mutual
  i8: cat-mutual
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c2-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: quick-classification
tier: Medium
anchor:
  heading: 1-attraction-self-worth-and-approval
  position: after
concepts:
  - approval-seeking vs. self-worth
  - mutual evaluation of compatibility
  - incompatibility is not inferiority
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each behavior or mindset from the lesson: Approval-Seeking, Healthy
  Self-Worth, or Mutual Evaluation
validator:
  kind: mapping
  ref: 09-ethical-validation-in-attraction-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c2-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c2-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c3-m1
version: 1
scenario: >-
  Sam and Jordan have been dating for a few months. Sam's friends disagree about
  how to read Jordan's behavior — some see genuine appreciation, others suspect
  a manipulative pattern. Match each observed clue to the theory it best
  supports. Keep the framework's key distinction in mind: sincere appreciation
  strengthens connection, while deliberately creating insecurity so the other
  person seeks reassurance places control above mutual respect.
theories:
  - id: th-a
    content: >-
      Sincere positive validation — Jordan's approval is specific and
      unconditional: it communicates attention and appreciation without strings,
      status ranking, or manufactured contrast.
  - id: th-b
    content: >-
      Push-pull — Jordan alternates warmth and approval with distance,
      indifference, or disapproval, creating contrast, uncertainty, and pursuit
      (a pattern resembling intermittent reinforcement).
  - id: th-c
    content: >-
      Negative validation and negging — Jordan expresses disapproval after
      approval has been established, or makes backhanded teasing remarks,
      prompting Sam to explain, defend, or qualify themselves and lowering Sam's
      sense of worth.
clues:
  - id: c1
    content: >-
      Jordan tells Sam: 'The way you handled that difficult client call was
      genuinely impressive — you stayed calm and found the fix.' The approval
      names something specific, and Jordan asks for nothing in return.
  - id: c2
    content: >-
      Jordan's warmest praise reliably arrives right after stretches of
      unreturned messages, and Sam finds the relief so strong that they cancel
      plans with friends to keep the weekend free 'just in case.'
  - id: c3
    content: >-
      For weeks Jordan has called Sam 'the most thoughtful person I know.' At
      dinner, Jordan sighs and says, 'Honestly, I expected more from you
      tonight.' Sam spends the rest of the meal explaining why the evening
      should count.
  - id: c4
    content: >-
      Sam's friends describe a repeating cycle: a weekend of affection and
      future plans, then a week of one-word replies and cancelled calls, then
      affection again. Sam admits checking their phone constantly, never sure
      which Jordan will show up.
  - id: c5
    content: >-
      At a group dinner, Jordan says in front of everyone: 'It's cute that you
      still wear that old jacket — very college-kid of you.' The table laughs;
      Sam changes the subject and stays quiet for the rest of the night.
  - id: c6
    content: >-
      Jordan sometimes goes quiet during deadline weeks at work, but when they
      are together the attention is steady and specific, and Sam says they feel
      more confident than before the relationship — not more anxious.
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c3-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-c
  c4: th-b
  c5: th-c
  c6: th-a
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-b
    hint: >-
      Push-pull is a repeating alternation — warmth, then distance, then warmth
      again — that breeds uncertainty and pursuit. Read c3 again: approval was
      established once, then a single line of disapproval, and notice what it
      makes Sam do (explain and defend themselves). Which theory is defined by
      exactly that structure?
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c3-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: evidence-match
tier: Medium
anchor:
  heading: 2-the-validation-framework
  position: after
concepts:
  - positive validation
  - negative validation and negging
  - push-pull and intermittent reinforcement
  - 'ethical distinction: sincere appreciation vs. control'
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 09-ethical-validation-in-attraction-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c3-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c3-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c4-m1
version: 1
items:
  - id: i4
    content: >-
      Name the specific quality you appreciate, such as service, curiosity, or
      courage
  - id: i1
    content: Ask about the person's work, activity, or interests
  - id: i3
    content: Take a short pause to reflect instead of responding automatically
  - id: i5
    content: Invite the person to elaborate
  - id: i2
    content: Listen for a detail connected to a meaningful value
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c4-m1
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
id: 09-ethical-validation-in-attraction-medium-c4-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: sequence-builder
tier: Medium
anchor:
  heading: a-constructive-sequence
  position: after
concepts:
  - constructive sequence of positive validation
  - specific appreciation over automatic praise
  - the reflective pause before responding
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  From asking to inviting elaboration: the stages of constructive positive
  validation in order
validator:
  kind: sequence
  ref: 09-ethical-validation-in-attraction-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c4-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c4-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c5-m1
version: 1
scenario: >-
  Maya has twice joined her close friend Jordan at his weekly competitive
  karaoke night. She genuinely dislikes it — the loud, competitive atmosphere
  leaves her drained — while Jordan clearly loves it and lights up describing
  it. Maya doesn't want to fake enthusiasm forever, but she also doesn't want
  Jordan to feel rejected as a person. She decides to voice her disapproval
  honestly and see how the friendship holds up.
startNodeId: n1
nodes:
  - id: n1
    question: What should Maya's disapproval target, and in what tone?
    options:
      - id: a1
        content: >-
          The activity itself, framed reluctantly: 'That isn't really my scene,
          but I can totally see why you love it' — a real preference, stated
          without heat.
        nextNodeId: n2
      - id: b1
        content: >-
          Jordan's investment in the hobby — pointing out that a grown adult
          taking karaoke this seriously ought to have grown out of it by now.
        nextNodeId: null
      - id: c1
        content: >-
          The invitations themselves — implying Jordan should have known she'd
          hate it and shouldn't have put her in that position.
        nextNodeId: null
      - id: d1
        content: >-
          Nothing specific — staying vague so Jordan senses her disapproval and
          starts working harder to win back her full enthusiasm.
        nextNodeId: null
  - id: n2
    question: >-
      Jordan looks a little deflated and asks, 'So you think my hobby is dumb?'
      How should Maya respond?
    options:
      - id: a2
        content: >-
          She separates the activity from the person: she dislikes the karaoke
          scene, not him or the things that make him happy — equal friends don't
          have to share every taste.
        nextNodeId: n3
      - id: b2
        content: >-
          She softens it into a compliment and claims she actually had a great
          time both nights, so he doesn't feel bad.
        nextNodeId: null
      - id: c2
        content: >-
          She says his feeling hurt proves the point — if he were more secure,
          honest criticism wouldn't bother him this much.
        nextNodeId: null
      - id: d2
        content: >-
          She turns it around: his reaction is exactly why she stayed quiet so
          long, and he owes her credit for finally being honest with him.
        nextNodeId: null
  - id: n3
    question: >-
      Jordan recovers and asks whether she'll still come along sometimes. What
      is the ethical answer?
    options:
      - id: a3
        content: >-
          A straight one: she'll happily join the occasional low-key night, but
          weekly competition isn't for her — and her warmth toward him doesn't
          depend on his answer either way.
        nextNodeId: n4
      - id: b3
        content: >-
          'Sure, whatever you want' — she keeps attending weekly but goes quiet
          and cool during the events, trusting he'll notice her disappointment
          and scale back on his own.
        nextNodeId: null
      - id: c3
        content: >-
          Yes, but only on a condition: he has to sit through her book club
          first, so his effort proves he deserves her company at karaoke.
        nextNodeId: null
      - id: d3
        content: >-
          She agrees, then cancels last minute over and over, letting the
          pattern communicate what she couldn't bring herself to say.
        nextNodeId: null
  - id: n4
    question: >-
      A month later, which outcome confirms that Maya's negative validation
      stayed ethical?
    options:
      - id: a4
        content: >-
          Jordan still goes to karaoke with his other friends and lights up
          telling her about it — the difference is out in the open, and neither
          of them is managing the other's approval.
        nextNodeId: null
      - id: b4
        content: >-
          Jordan now double-checks every plan with Maya before committing and
          anxiously picks activities he thinks she'll approve of.
        nextNodeId: null
      - id: c4
        content: >-
          Jordan is noticeably more attentive — more compliments, more
          invitations — and Maya takes the extra effort as proof that the honest
          talk worked.
        nextNodeId: null
      - id: d4
        content: >-
          Jordan quietly stops inviting her to anything at all, including things
          she likes, to avoid another moment of disapproval.
        nextNodeId: null
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c5-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3,a4
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c5-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: prediction
tier: Medium
anchor:
  heading: 4-negative-validation-disagreement-and-disapproval
  position: after
concepts:
  - ethical disagreement targets preference or compatibility, not personal worth
  - reluctant framing of sincere disapproval
  - warning signs of destabilizing negative validation
  - equal relationships tolerate differing tastes
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: How does Maya's disagreement with her friend's favorite activity unfold?
validator:
  kind: exact
  ref: 09-ethical-validation-in-attraction-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c5-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c5-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c6-m1
version: 1
scenario: >-
  You're early in dating someone. They laughed at your first playful joke, but
  after your second remark — a backhanded comment about their appearance — their
  replies got shorter and they seem less engaged. You want to keep the
  interaction fun without making them feel diminished. What do you do?
options:
  - id: a
    content: >-
      Pause the teasing and check in with them, letting their reactions set the
      pace for any future humor
    pros:
      - Treats their disengagement as a signal to stop
      - Weighs their response more heavily than your intent
      - Keeps any future teasing clearly easy to stop
    cons:
      - Slows the playful momentum of the interaction
      - Requires sitting through a moment of awkwardness
  - id: b
    content: >-
      Keep the mood light but steer the humor toward things you both laugh at,
      without addressing the silence
    pros:
      - Feels more mutual and less targeted at them personally
      - Reduces pressure without a heavy conversation
    cons:
      - Still guesses at how the earlier remark landed
      - Skips the check-in that would confirm they actually feel comfortable
  - id: c
    content: >-
      Continue teasing at the same intensity — a little push-pull keeps the
      dynamic interesting
    pros:
      - Maintains a confident, playful frame
      - Can feel like flirtation to some people
    cons:
      - >-
        Repeated teasing loses any claim to playfulness and can appear hostile
        or controlling
      - Treats their discomfort as a challenge to overcome
      - Risks creating cycles of approval and withdrawal
  - id: d
    content: >-
      Explain that you were only joking and that you tease everyone, so they
      shouldn't take it personally
    pros:
      - Clarifies that you meant no harm
      - Keeps the tone light without a serious talk
    cons:
      - A joke is not harmless just because the speaker intended it as teasing
      - Pressures them to dismiss their own reaction
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c6-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 0
  d: 1
hints:
  b: >-
    Shared humor is a good instinct, but you're still guessing — their reaction,
    not your framing, is the signal that matters here.
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c6-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 5-negging-and-the-difference-between-teasing-and-harm
  position: after
concepts:
  - negging vs. playful teasing
  - recipient response over speaker intent
  - discomfort as a signal to stop
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 09-ethical-validation-in-attraction-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c6-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c6-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c7-m1
version: 1
scenario: >-
  Your friend Sam can't stop checking their phone and works harder each week to
  win back their partner's affection. Diagnose the root cause of this dynamic,
  then configure the intervention dials to treat it.
symptoms:
  - >-
    Warmth arrives unpredictably — some weeks the partner is deeply attentive,
    then turns cold and distant for days with no explanation
  - >-
    Sam monitors the partner constantly, searching for signs of approval and
    working harder to recover affection
  - >-
    The cold spells reliably begin within a day after Sam expresses a need or
    preference
diagnoses:
  - id: d1
    content: >-
      Deliberate push-pull manipulation — the partner engineers alternating
      warmth and distance to keep Sam anxious and pursuing
  - id: d2
    content: >-
      Natural variation in closeness — the partner simply has shifting moods and
      an ordinary need for space
  - id: d3
    content: >-
      Healthy intense passion — Sam's fixation is just a sign of strong mutual
      attraction
parameters:
  - id: p1
    label: Deliberate hot-and-cold engineering
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Open communication about needs and space
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Genuine natural space for rest and individual life
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c7-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: <
    targetValue: 50
  - parameterId: p3
    operator: '>='
    targetValue: 50
hints:
  - id: hint-1
    matcher:
      wrongDiagnosisId: d2
    hint: >-
      Natural variation doesn't follow a script. Notice WHEN the distance
      appears: cold spells that reliably start right after Sam voices a need,
      combined with warmth that arrives unpredictably, are the signature of
      deliberate control — intermittent reinforcement — not ordinary mood
      shifts.
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c7-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: diagnostic-lab
tier: Medium
anchor:
  heading: 6-the-push-pull-model
  position: after
concepts:
  - intermittent reinforcement
  - push-pull manipulation versus natural variation in closeness
  - fixation versus healthy attraction
  - emotional security and deliberate uncertainty
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Diagnose the root cause of Sam's relationship anxiety, then tune the
  intervention dials to treat it.
validator:
  kind: invariants
  ref: 09-ethical-validation-in-attraction-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c7-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c7-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c8-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: >-
      Jazmina appears engaged and begins qualifying herself, investing in the
      exchange
  - id: s2
    isMissing: true
  - id: s3
    content: >-
      Craig says she is not his usual type and that he prefers subtle teasing
      over overt display, introducing doubt about whether she meets his
      standards
  - id: s4
    isMissing: true
  - id: s5
    content: >-
      The hairstyle suggestion creates a pretext for physical contact ('kino'):
      he arranges her hair and inspects her neck
  - id: s6
    content: 'Reported outcome: Craig leaves with Jazmina and her friend'
  - id: s7
    isMissing: true
options:
  - id: o1
    content: >-
      Craig looks past Jazmina and asks another person's name before asking hers
      — a negative-validation 'push' that shifts attention away just as she
      begins investing
  - id: o2
    content: >-
      Craig pairs the disapproval with a flattering, specific image — suggesting
      she would look attractive in a long black dress with her hair up — the
      'pull' after the earlier criticism
  - id: o3
    content: >-
      The author cautions that a conversational pretext does not replace consent
      — touch should be mutually welcome, responsive to verbal and nonverbal
      boundaries, and easy to decline without social pressure
  - id: o4
    content: >-
      Craig openly compliments Jazmina's appearance in front of the whole group
      to lock in her approval
  - id: o5
    content: >-
      Craig invites Jazmina to list her best qualities so that she keeps
      qualifying herself to him
  - id: o6
    content: >-
      The author concludes that the reported romantic outcome proves every
      method used was respectful
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c8-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
  s7: o3
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c8-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: missing-step
tier: Medium
anchor:
  heading: 7-case-study-redirecting-attention-through-validation
  position: after
concepts:
  - negative-validation push and selective attention
  - alternating disapproval with a vivid compliment (pull)
  - pretext for touch versus consent
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Fill the missing steps in the push–pull validation sequence from the Craig and
  Jazmina case study
validator:
  kind: mapping
  ref: 09-ethical-validation-in-attraction-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c8-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c8-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c9-m1
version: 1
question: >-
  Four people describe how they talk about their dating standards. Who is best
  applying the lesson's ethical reframing?
options:
  - id: a
    content: >-
      Maya: "I communicate best with direct people — that's just information
      about fit, and anyone I date is equally free to decide I'm not right for
      them."
  - id: b
    content: >-
      Dev: "I don't like weak people, but I'm careful to say it in a kind,
      polite tone so it doesn't put anyone down."
  - id: c
    content: >-
      Priya: "I've stopped stating any preferences about other people, because
      expressing a preference about someone always places you above them."
  - id: d
    content: >-
      Leo: "When someone isn't a match for me, I tell them it's useful
      information — about a defect they should fix before dating anyone again."
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c9-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c9-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 8-ethical-reframing-of-standards
  position: after
concepts:
  - ranking vs. compatibility framing of standards
  - symmetric evaluation
  - treating incompatibility as information rather than defect
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Who is best applying the lesson's ethical reframing of standards?
validator:
  kind: exact
  ref: 09-ethical-validation-in-attraction-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c9-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c9-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 09-ethical-validation-in-attraction-medium-c10-m1
version: 1
attributes:
  - id: reciprocity
    label: Reciprocity
  - id: autonomy
    label: Autonomy
  - id: approvalSeeking
    label: Approval Seeking
components:
  - id: c1
    content: >-
      Mutual evaluation — both people assess compatibility and share honest
      feedback
    metrics:
      reciprocity: 5
      autonomy: 4
      approvalSeeking: 1
  - id: c2
    content: >-
      Gatekeeper dynamic — one person controls approval while the other works to
      earn it
    metrics:
      reciprocity: 1
      autonomy: 1
      approvalSeeking: 8
  - id: c3
    content: >-
      Independent lives — each person keeps their own friends, goals, and
      schedule
    metrics:
      reciprocity: 2
      autonomy: 6
      approvalSeeking: 1
  - id: c4
    content: >-
      Consistent check-ins — regular contact that builds predictability over
      time
    metrics:
      reciprocity: 4
      autonomy: 2
      approvalSeeking: 2
  - id: c5
    content: >-
      Chase cycles — attention is withdrawn to see how hard the other will
      pursue
    metrics:
      reciprocity: 1
      autonomy: 2
      approvalSeeking: 7
requirements:
  - attributeId: reciprocity
    operator: '>='
    value: 7
    description: Interest and evaluation must flow both ways
  - attributeId: autonomy
    operator: '>='
    value: 8
    description: Each person keeps the freedom to disagree and decline contact
  - attributeId: approvalSeeking
    operator: <=
    value: 4
    description: No one should have to continually prove their worth
:::

:::mechanic-private
id: 09-ethical-validation-in-attraction-medium-c10-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: approvalSeeking
    hint: >-
      Dynamics where one person earns or chases approval push this number up
      fast.
:::

:::mechanic
schemaVersion: 1
id: 09-ethical-validation-in-attraction-medium-c10-m1
version: 1
lessonSlug: 09-ethical-validation-in-attraction-medium
type: constraint-construction
tier: Medium
anchor:
  heading: 9-attraction-as-reciprocal-compatibility
  position: after
concepts:
  - reciprocal compatibility
  - approval-seeking instability
  - personal autonomy
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Combine relationship dynamics to build a reciprocal, stable connection.
validator:
  kind: invariants
  ref: 09-ethical-validation-in-attraction-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 09-ethical-validation-in-attraction-medium-c10-m1:public
privateValidatorRef: 09-ethical-validation-in-attraction-medium-c10-m1:private
rewardIdentity: 09-ethical-validation-in-attraction-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-attraction-self-worth-and-approval"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-the-validation-framework"},{"mechanicType":"sequence-builder","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"a-constructive-sequence"},{"mechanicType":"prediction","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"4-negative-validation-disagreement-and-disapproval"},{"mechanicType":"tradeoff-decision","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"5-negging-and-the-difference-between-teasing-and-harm"},{"mechanicType":"diagnostic-lab","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"6-the-push-pull-model"},{"mechanicType":"missing-step","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"7-case-study-redirecting-attention-through-validation"},{"mechanicType":"multiple-choice","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"8-ethical-reframing-of-standards"},{"mechanicType":"constraint-construction","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"9-attraction-as-reciprocal-compatibility"}]}
:::