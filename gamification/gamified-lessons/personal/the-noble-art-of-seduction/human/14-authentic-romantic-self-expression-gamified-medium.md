:::mechanic-data
id: 14-authentic-romantic-self-expression-medium-c2-m1
version: 1
categories:
  - id: cat-nice
    label: Nice Guy
  - id: cat-good
    label: Good Guy
  - id: cat-bad
    label: Bad Guy
items:
  - id: i1
    content: Sexually and romantically expressive without ignoring consent
  - id: i2
    content: >-
      Politeness that may look considerate, but is partly driven by fear of
      disapproval and self-protection
  - id: i3
    content: >-
      Appears challenging and self-assured, but the effect relies on insecurity
      and manipulation
  - id: i4
    content: >-
      Direct about opinions and standards, willing to risk conflict or rejection
      in order to express them
  - id: i5
    content: >-
      Universally agreeable and harmless-seeming, concealing needs and romantic
      interest to avoid rejection
  - id: i6
    content: Emotionally withholding and unreliable, generating uncertainty and drama
  - id: i7
    content: Warm and compassionate without becoming passive
  - id: i8
    content: >-
      Apologetic and indirect, reluctant to escalate, coming across as bland and
      easily replaceable
shuffle: true
:::

:::mechanic-private
id: 14-authentic-romantic-self-expression-medium-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-good
  i2: cat-nice
  i3: cat-bad
  i4: cat-good
  i5: cat-nice
  i6: cat-bad
  i7: cat-good
  i8: cat-nice
:::

:::mechanic
schemaVersion: 1
id: 14-authentic-romantic-self-expression-medium-c2-m1
version: 1
lessonSlug: 14-authentic-romantic-self-expression-medium
type: quick-classification
tier: Medium
anchor:
  heading: 1-the-central-distinction-good-is-not-the-same-as-nice
  position: after
concepts:
  - nice guy as approval-seeking self-presentation driven by fear
  - good guy as compassion combined with agency, standards, and self-respect
  - bad guy as manipulation, withholding, and manufactured uncertainty
  - distinguishing surface-level behavior from underlying motivation
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: >-
  Classify each relational presentation trait by archetype: Nice Guy, Good Guy,
  or Bad Guy
validator:
  kind: mapping
  ref: 14-authentic-romantic-self-expression-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 14-authentic-romantic-self-expression-medium-c2-m1:public
privateValidatorRef: 14-authentic-romantic-self-expression-medium-c2-m1:private
rewardIdentity: 14-authentic-romantic-self-expression-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 14-authentic-romantic-self-expression-medium-c3-m1
version: 1
scenario: >-
  After another relationship fizzles, a friend tells you that people are drawn
  to 'bad guys' because they seem confident and never needy — and that your
  always-agreeing, always-available style is the real problem. You want to
  become genuinely more attractive without becoming manipulative. Which approach
  do you commit to?
options:
  - id: a
    content: Unconditional warmth and approval
    pros:
      - No conflict and no risk of hurting anyone
      - Feels kind and easygoing
      - Signals you will never play games
    cons:
      - Offers the automatic approval the text links to lost attraction
      - No independent preferences or respectful disagreement
      - Apologizes for having an identity instead of acting consistently with it
  - id: b
    content: The bad-guy playbook
    pros:
      - Unpredictability creates excitement
      - The other person keeps working for your attention
      - Reads as strength and self-assurance
    cons:
      - Runs on unreliability and manufactured drama
      - Keeps the partner insecure to stay desirable
      - Substitutes emotional deprivation for reciprocal respect
  - id: c
    content: Pure unapologetic confidence
    pros:
      - Pride in and clarity about who you are
      - Expresses romantic and sexual interest without apology
      - Acts decisively and consistently with your identity
    cons:
      - Treats warmth and reciprocity as weakness
      - Decisiveness can mask selfish or exploitative behavior
      - Confuses confidence with goodness
  - id: d
    content: Warm directness with healthy challenge
    pros:
      - Warmth, directness, and clear boundaries
      - Independent preferences and respectful disagreement
      - Playful teasing without contempt
      - Requires mutual effort rather than unconditional approval
    cons:
      - Demands ongoing honesty and effort
      - No dramatic shortcuts to intensity
:::

:::mechanic-private
id: 14-authentic-romantic-self-expression-medium-c3-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 0
  c: 2
  d: 4
hints:
  c: >-
    This captures the shared attractive traits, but the text says the ethical
    difference is decisive — check what happened to warmth and reciprocal
    respect.
:::

:::mechanic
schemaVersion: 1
id: 14-authentic-romantic-self-expression-medium-c3-m1
version: 1
lessonSlug: 14-authentic-romantic-self-expression-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 2-why-distinctiveness-and-challenge-can-appear-attractive
  position: after
concepts:
  - why confidence gets confused with goodness
  - healthy challenge versus manipulation
  - ethical difference between the good-guy and bad-guy models
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 14-authentic-romantic-self-expression-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 14-authentic-romantic-self-expression-medium-c3-m1:public
privateValidatorRef: 14-authentic-romantic-self-expression-medium-c3-m1:private
rewardIdentity: 14-authentic-romantic-self-expression-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 14-authentic-romantic-self-expression-medium-c4-m1
version: 1
scenario: >-
  A relationship-psychology workshop is studying why people sometimes chase
  harmful partners or hide their real selves. The group has drafted three
  competing explanations. The facilitator reads out six observations about
  different attendees; each observation is evidence for exactly one of the three
  explanations.
theories:
  - id: th-a
    content: >-
      Scarcity-driven validation — the person experiences an unavailable
      partner's affection as a scarce prize; winning it would prove they are
      unusually desirable, so the attraction is tied to validation rather than
      compatibility or mutual care.
  - id: th-b
    content: >-
      Projected confidence — the person mistakes emotional coldness,
      irresponsibility, or never explaining oneself for strength; a strong
      identity is assumed even when the partner's conduct is actually harmful.
  - id: th-c
    content: >-
      Approval-seeking self-erasure — the person hides opinions, needs, and
      romantic interest behind agreeable politeness, using the persona as a
      shield against honest expression and possible rejection.
clues:
  - id: c1
    content: >-
      Mia says her main goal is getting her aloof partner to commit: 'If someone
      that hard to win finally chooses me, it proves I'm more desirable than
      everyone he's ever rejected.'
  - id: c2
    content: >-
      Devon is captivated by his new partner because she never apologizes, never
      explains herself, and seems to need no one; he reads her unaccountability
      as a rare, magnetic strength of character.
  - id: c3
    content: >-
      Priya accepts a one-sided friendship while concealing her romantic
      interest, reasoning that being chosen for a real relationship by someone
      this selective would finally prove she is worth choosing.
  - id: c4
    content: >-
      Jordan's friends warn that his partner is selfish and unreliable, but he
      waves it off: 'He just doesn't need anyone's approval — that's what real
      strength looks like.'
  - id: c5
    content: >-
      Leo laughs nervously and agrees with everything his date says; by never
      voicing a single preference, he keeps the odds of an openly negative
      response close to zero.
  - id: c6
    content: >-
      Sasha presents a carefully edited personality designed to avoid every
      possible disagreement, and calls her refusal to ever make waves a sign of
      quiet inner strength.
:::

:::mechanic-private
id: 14-authentic-romantic-self-expression-medium-c4-m1
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
      The one-sided friendship and hidden interest make this look like
      approval-seeking, but check the stated motive: is Priya shielding herself
      from disapproval, or chasing proof of her own worth from a selective
      person?
:::

:::mechanic
schemaVersion: 1
id: 14-authentic-romantic-self-expression-medium-c4-m1
version: 1
lessonSlug: 14-authentic-romantic-self-expression-medium
type: evidence-match
tier: Medium
anchor:
  heading: fear-of-disapproval
  position: after
concepts:
  - scarcity-driven validation
  - projected confidence
  - approval-seeking self-erasure
  - distinguishing motive from surface behavior
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 14-authentic-romantic-self-expression-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 14-authentic-romantic-self-expression-medium-c4-m1:public
privateValidatorRef: 14-authentic-romantic-self-expression-medium-c4-m1:private
rewardIdentity: 14-authentic-romantic-self-expression-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 14-authentic-romantic-self-expression-medium-c5-m1
version: 1
scenario: >-
  Marcus, 27, is witty, stylish, and warmly opinionated among friends — traits
  people consistently notice when he is comfortable. Around Dana, a woman he met
  through mutual friends and is romantically interested in, he becomes
  noticeably different: agreeable, cautious, and muted. He echoes her opinions
  even when he privately disagrees, suppresses his humor, and hides his romantic
  interest behind friendly neutrality, waiting for a guaranteed safe signal
  before revealing anything real.
startNodeId: n1
nodes:
  - id: n1
    question: >-
      What is the most likely effect of Marcus's agreeable 'nice' persona on his
      connection with Dana?
    options:
      - id: a1
        content: >-
          Dana experiences him as pleasant but indistinct — the persona conceals
          the very qualities that could create attraction or connection, and the
          connection drifts into disengagement.
        nextNodeId: n2
      - id: b1
        content: >-
          Dana perceives his authentic personality underneath anyway, so the
          persona costs him nothing and the connection deepens naturally.
        nextNodeId: null
      - id: c1
        content: >-
          Dana becomes more intrigued — his restraint reads as mystery, and
          hiding his interest makes him more attractive to her.
        nextNodeId: null
      - id: d1
        content: >-
          The persona successfully protects him from rejection, so the
          relationship remains safe and stable indefinitely.
        nextNodeId: null
  - id: n2
    question: >-
      Marcus recognizes the persona as psychological cover — if Dana rejected
      it, only the performance was rejected, not his real self. Following the
      lesson's principles, what should he do next?
    options:
      - id: a2
        content: >-
          Express his actual humor, preferences, and romantic interest with
          consideration — accepting that rejection, if it comes, would at least
          be honest information about compatibility.
        nextNodeId: n3
      - id: b2
        content: >-
          Keep the persona but intensify it — agree more, compliment more, do
          more favors — until Dana signals that it is safe to show interest.
        nextNodeId: null
      - id: c2
        content: >-
          Swing to the opposite extreme: unfiltered bluntness with no regard for
          Dana's comfort, treating directness as proof he is no longer hiding.
        nextNodeId: null
      - id: d2
        content: >-
          Stay in the friendship and wait indefinitely for Dana to make the
          first move, so he never has to risk exposure.
        nextNodeId: null
  - id: n3
    question: >-
      Marcus begins expressing his real personality and interest. During one
      conversation, Dana states an opinion he genuinely disagrees with, and soon
      after she sets a clear boundary about the pace of things. How should he
      handle these moments?
    options:
      - id: a3
        content: >-
          Calmly voice his different view — disagreement does not have to
          threaten connection — and treat her boundary about pace as
          non-negotiable, staying responsive to her comfort.
        nextNodeId: n4
      - id: b3
        content: >-
          Sidestep the disagreement entirely to protect the connection, and
          quietly test her boundary later once things feel more secure.
        nextNodeId: null
      - id: c3
        content: >-
          Argue his view forcefully to prove he has opinions now, and treat her
          boundary as an obstacle that confidence should push past.
        nextNodeId: null
      - id: d3
        content: >-
          End things immediately — any disagreement or boundary signals clear
          incompatibility, so honest information means walking away at the first
          difference.
        nextNodeId: null
  - id: n4
    question: >-
      Despite the honest expression, Dana ultimately tells Marcus she does not
      feel romantic interest. What is the most accurate reading of this outcome?
    options:
      - id: a4
        content: >-
          The rejection is honest information — it may reflect preference,
          timing, or incompatibility rather than personal deficiency — and it
          leaves his self-worth intact; clear incompatibility is a useful
          outcome.
        nextNodeId: null
      - id: b4
        content: >-
          The rejection proves authentic expression was the wrong strategy — the
          persona was safer, and he should return to it with the next person.
        nextNodeId: null
      - id: c4
        content: >-
          The rejection reveals a personal deficiency he must fix before he is
          entitled to express interest in anyone again.
        nextNodeId: null
      - id: d4
        content: >-
          He should keep the friendship while continuing to hide his interest,
          waiting for circumstances to change so rejection never has to be
          final.
        nextNodeId: null
:::

:::mechanic-private
id: 14-authentic-romantic-self-expression-medium-c5-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3,a4
:::

:::mechanic
schemaVersion: 1
id: 14-authentic-romantic-self-expression-medium-c5-m1
version: 1
lessonSlug: 14-authentic-romantic-self-expression-medium
type: prediction
tier: Medium
anchor:
  heading: practice-unapologetic-vulnerability
  position: after
concepts:
  - self-concealment as psychological cover
  - authentic expression vs approval-seeking
  - respectful disagreement and consent
  - interpreting rejection as information
  - self-worth independent of reciprocation
skills:
  - recall
domain: the-noble-art-of-seduction
prompt: What happens next in this romantic self-expression situation?
validator:
  kind: exact
  ref: 14-authentic-romantic-self-expression-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 14-authentic-romantic-self-expression-medium-c5-m1:public
privateValidatorRef: 14-authentic-romantic-self-expression-medium-c5-m1:private
rewardIdentity: 14-authentic-romantic-self-expression-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-the-central-distinction-good-is-not-the-same-as-nice"},{"mechanicType":"tradeoff-decision","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-why-distinctiveness-and-challenge-can-appear-attractive"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"fear-of-disapproval"},{"mechanicType":"prediction","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"practice-unapologetic-vulnerability"}]}
:::