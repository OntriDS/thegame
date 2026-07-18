:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c3-m1
version: 1
question: What does a workaround reveal?
options:
  - id: a
    content: A design opportunity
  - id: b
    content: A user's skill level
  - id: c
    content: A system bug
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c3-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c3-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: multiple-choice
tier: Easy
anchor:
  heading: creating-design-goals
  position: after
concepts:
  - workarounds as design opportunities
skills:
  - recall
domain: interactive-design-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: interaction-design-ux-specialization-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c3-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c3-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c4-m1
version: 1
scenario: >-
  Your team is designing a new AI scheduling assistant. There are no engineers
  available yet, and leadership wants to know whether users will actually find
  the proposed interactions valuable before any real product is built.
options:
  - id: a
    content: >-
      Paper Prototyping — draw the screens on paper and physically swap them to
      walk users through the flow
    pros:
      - very low cost to produce
      - prevents stakeholders from fixating on visual polish
      - forces everyone to focus on the user flow
    cons:
      - limited ability to simulate a real interactive experience
      - cannot test how users react to a system that appears to be live
  - id: b
    content: >-
      Wizard of Oz Prototyping — let users talk to what looks like the assistant
      while a hidden teammate supplies the responses
    pros:
      - tests interaction logic before any backend code is written
      - validates whether the proposed automation is actually desirable
      - captures realistic responses from real users
    cons:
      - requires a team member to respond live during each session
      - users might behave differently if they discovered a human was behind it
  - id: c
    content: >-
      High-Fidelity Interactive Mockup — spend two weeks building a polished,
      clickable Figma prototype
    pros:
      - looks impressive in executive demos
      - can be presented without an operator present
    cons:
      - takes weeks to build before any user feedback is gathered
      - delays learning about the actual interaction quality
      - encourages early attachment to a single concept
      - consumes design effort that could be spent exploring alternatives
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c4-m1
version: 1
kind: rubric
scoring:
  a: 2
  b: 4
  c: 1
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c4-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: paper-prototyping
  position: after
concepts:
  - Wizard of Oz prototyping
  - paper prototyping
  - fail-fast iteration
skills:
  - recall
domain: interactive-design-studies
prompt: Which prototyping approach should the team use?
validator:
  kind: rubric
  ref: interaction-design-ux-specialization-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-ux-specialization-easy-c4-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c4-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c5-m1
version: 1
categories:
  - id: cat-a
    label: Feedback
  - id: cat-b
    label: Recovery
items:
  - id: i1
    content: Loading spinner appears
  - id: i2
    content: Progress bar shows upload %
  - id: i3
    content: Hover shows tooltip
  - id: i4
    content: Undo button after delete
  - id: i5
    content: Plain language error message
  - id: i6
    content: Suggested correction offered
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c5-m1
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
id: 02-interaction-design-ux-architecture-easy-c5-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: quick-classification
tier: Easy
anchor:
  heading: consistency-standards
  position: after
concepts:
  - System Visibility heuristic
  - Error Recovery heuristic
skills:
  - recall
domain: interactive-design-studies
prompt: 'Sort the UX design examples: System Feedback or Error Recovery'
validator:
  kind: mapping
  ref: interaction-design-ux-specialization-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c5-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c5-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c7-m1
version: 1
scenario: Match each UI design example to the principle it best illustrates.
theories:
  - id: th-a
    content: Direct Manipulation
  - id: th-b
    content: Distributed Cognition
clues:
  - id: c1
    content: Pinch-to-zoom on a map shows results as your fingers move.
  - id: c2
    content: An 'Auto-save' feature removes the need to remember to save work.
  - id: c3
    content: >-
      Dragging a file into a folder gives instant visual confirmation of the
      move.
  - id: c4
    content: A 'Recently Viewed' list lets users avoid memorizing what they browsed.
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c7-m1
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
id: 02-interaction-design-ux-architecture-easy-c7-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: evidence-match
tier: Easy
anchor:
  heading: distributed-cognition
  position: after
concepts:
  - direct manipulation
  - distributed cognition
skills:
  - recall
domain: interactive-design-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: interaction-design-ux-specialization-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c7-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c7-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c8-m1
version: 1
scenario: >-
  A designer is making decisions on a webpage. Decide whether each design choice
  comes from manipulating Visual Variables or from applying Gestalt Principles.
theories:
  - id: th-a
    content: Visual Variables (scale, contrast, color, typography, etc.)
  - id: th-b
    content: Gestalt Principles (proximity, alignment, similarity, whitespace)
clues:
  - id: c1
    content: >-
      The headline is set 3x larger than the body text so the eye finds it
      first.
  - id: c2
    content: Error messages are bold red against regular gray labels to stand out.
  - id: c3
    content: >-
      Two action buttons placed right next to each other are read as one related
      group.
  - id: c4
    content: Generous empty space around a price tag makes the price feel important.
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c8-m1
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
id: 02-interaction-design-ux-architecture-easy-c8-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: evidence-match
tier: Easy
anchor:
  heading: invisible-structure-gestalt-principles
  position: after
concepts:
  - visual variables
  - Gestalt principles
skills:
  - recall
domain: interactive-design-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: interaction-design-ux-specialization-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c8-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c8-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c9-m1
version: 1
question: 'Unexpected user behavior is best seen as:'
options:
  - id: a
    content: An opportunity to learn
  - id: b
    content: A failure of design
  - id: c
    content: A reason to blame users
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c9-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c9-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-element-of-surprise
  position: after
concepts:
  - element of surprise in user testing
skills:
  - recall
domain: interactive-design-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: interaction-design-ux-specialization-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c9-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c9-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c10-m1
version: 1
sourceDomain: Social computing and software design
targetDomain: Organizational behavior
scenario: >-
  A team of researchers wants to study modern workplace productivity. Apply the
  core principle from social computing—that collaboration is embedded into tools
  by default, not added on as an extra—to shape this research program.
options:
  - id: a
    content: >-
      Investigate how workplace tools should be redesigned so that shared
      editing, commenting, and real-time multiplayer features are built into the
      core workflow rather than treated as extras.
  - id: b
    content: >-
      Examine how employees layer optional collaboration features on top of
      primarily individual-focused tools like email and standalone documents.
  - id: c
    content: >-
      Focus the research on individual productivity metrics, treating
      collaboration as a separate concern from the tools workers use.
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c10-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c10-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: beyond-social-networks
  position: after
concepts:
  - social computing
  - collaborative software design
skills:
  - recall
domain: interactive-design-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: interaction-design-ux-specialization-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-ux-specialization-easy-c10-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c10-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c11-m1
version: 1
scenario: >-
  Your product team is fully distributed across San Francisco, London, and
  Singapore. You need to run a two-week design review cycle for a major new
  feature, and stakeholders want thoughtful, documented feedback that can be
  referenced later.
options:
  - id: a
    content: Run synchronous video review sessions with the whole team
    pros:
      - Builds rapport through face-to-face discussion
      - Enables quick clarification of design intent
    cons:
      - Difficult to schedule across three major time zones
      - No persistent record of the discussion
      - Can disadvantage quieter or less fluent speakers
  - id: b
    content: >-
      Use asynchronous documented reviews via shared documents and threaded
      comments
    pros:
      - Accommodates contributors across all time zones
      - Produces a written, searchable record of decisions
      - Allows thoughtful, edited responses over the two-week window
    cons:
      - Decisions arrive more slowly
      - Builds less personal rapport among teammates
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c11-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c11-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: collaboration-frameworks
  position: after
concepts:
  - synchronous vs asynchronous collaboration
  - design tradeoffs in collaborative systems
skills:
  - recall
domain: interactive-design-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: interaction-design-ux-specialization-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-ux-specialization-easy-c11-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c11-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c12-m1
version: 1
attributes:
  - id: richness
    label: Channel Richness
  - id: sync
    label: Sync Requirement
components:
  - id: c1
    content: Live video call with face-to-face conversation and screen sharing
    metrics:
      richness: 5
      sync: 5
  - id: c2
    content: Recorded video message with playback comments and transcripts
    metrics:
      richness: 4
      sync: 1
  - id: c3
    content: Text chat channel with emoji reactions and file sharing
    metrics:
      richness: 2
      sync: 1
  - id: c4
    content: Threaded message board with video replies and pinned summaries
    metrics:
      richness: 4
      sync: 1
requirements:
  - attributeId: richness
    operator: '>='
    value: 4
    description: Must preserve body language, tone, and nuance
  - attributeId: sync
    operator: <=
    value: 2
    description: Must support async-first participation
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c12-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c12-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: constraint-construction
tier: Easy
anchor:
  heading: designing-for-distributed-teams
  position: after
concepts:
  - distance penalty
  - channel richness vs. sync trade-off
  - async-first design
skills:
  - recall
domain: interactive-design-studies
prompt: >-
  Select design components that reduce the distance penalty for distributed
  teams.
validator:
  kind: invariants
  ref: interaction-design-ux-specialization-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-ux-specialization-easy-c12-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c12-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c13-m1
version: 1
categories:
  - id: cat-platform
    label: Platform
  - id: cat-motive
    label: Motive
items:
  - id: i1
    content: Amazon Mechanical Turk
  - id: i2
    content: Wikipedia
  - id: i3
    content: Waze
  - id: i4
    content: Financial
  - id: i5
    content: Altruistic
  - id: i6
    content: Gamified
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c13-m1
version: 1
kind: mapping
matches:
  i1: cat-platform
  i2: cat-platform
  i3: cat-platform
  i4: cat-motive
  i5: cat-motive
  i6: cat-motive
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c13-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: quick-classification
tier: Easy
anchor:
  heading: crowd-motivations
  position: after
concepts:
  - micro-tasking
  - crowd motivations
skills:
  - recall
domain: interactive-design-studies
prompt: 'Sort the crowdsourcing concepts: platform example or worker motivation'
validator:
  kind: mapping
  ref: interaction-design-ux-specialization-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c13-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c13-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c14-m1
version: 1
items:
  - id: i1
    content: User forms an intent and decides on an action
  - id: i2
    content: User interacts with an input device (keyboard, mouse, touchscreen)
  - id: i3
    content: System receives and processes the input signal
  - id: i4
    content: System produces output, displaying feedback on the screen
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c14-m1
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
id: 02-interaction-design-ux-architecture-easy-c14-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: sequence-builder
tier: Easy
anchor:
  heading: the-full-interaction-loop
  position: after
concepts:
  - input/output loop
  - interaction bandwidth
skills:
  - recall
domain: interactive-design-studies
prompt: How the full interaction loop unfolds from user intent to screen output
validator:
  kind: sequence
  ref: interaction-design-ux-specialization-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c14-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c14-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c15-m1
version: 1
scenario: >-
  Design a touchscreen button layout to minimize selection time using Fitts's
  Law.
outputs:
  - id: out1
    label: Selection Time (ms)
    baseValue: 180
    targetMin: 30
    targetMax: 90
  - id: out2
    label: Error Rate (%)
    baseValue: 45
    targetMin: 5
    targetMax: 25
  - id: out3
    label: User Satisfaction (%)
    baseValue: 35
    targetMin: 55
    targetMax: 100
sliders:
  - id: s1
    label: Target Width (px)
    min: 20
    max: 200
    step: 20
    effects:
      - outputId: out1
        multiplier: -0.6
      - outputId: out2
        multiplier: -0.12
  - id: s2
    label: Cursor Distance (px)
    min: 20
    max: 400
    step: 20
    effects:
      - outputId: out1
        multiplier: 0.15
      - outputId: out2
        multiplier: 0.04
      - outputId: out3
        multiplier: -0.05
  - id: s3
    label: Edge / Corner Placement
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: -5
      - outputId: out2
        multiplier: -1.2
      - outputId: out3
        multiplier: 3.5
cards:
  - id: c1
    label: Stylus Support
    effects:
      - outputId: out1
        multiplier: -10
      - outputId: out3
        multiplier: 10
  - id: c2
    label: Voice Commands
    effects:
      - outputId: out3
        multiplier: 15
      - outputId: out2
        multiplier: -2
  - id: c3
    label: Multi-touch Gestures
    effects:
      - outputId: out1
        multiplier: -8
      - outputId: out2
        multiplier: 2
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c15-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c15-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: fitts-s-law
  position: after
concepts:
  - Fitts's Law
  - target width vs. distance trade-off
  - edge/corner placement advantage
  - input modality trade-offs
skills:
  - recall
domain: interactive-design-studies
prompt: >-
  Tune the sliders and select input cards so every metric lands inside its
  target range, using Fitts's Law principles.
validator:
  kind: invariants
  ref: interaction-design-ux-specialization-easy-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c15-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c15-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c16-m1
version: 1
scenario: >-
  You're leading IA design for a new online marketplace with thousands of
  products across many categories and attributes. Which primary navigation
  approach should you prioritize?
options:
  - id: a
    content: Faceted Search
    pros:
      - scales efficiently to large product catalogs
      - lets users filter by specific attributes like size, color, and price
      - supports users who already know what they want
    cons:
      - depends on well-structured product attribute data
      - less effective for inspiring exploratory discovery
  - id: b
    content: Browsing
    pros:
      - encourages exploration and serendipitous discovery
      - low barrier for users without a specific goal
    cons:
      - users can feel lost in a catalog of thousands of items
      - harder to scale across large inventories
      - lower conversion for users with specific purchase intent
  - id: c
    content: Recommendation
    pros:
      - surfaces content users did not know they wanted
      - personalizes the experience
      - boosts engagement metrics
    cons:
      - requires significant behavioral data to work well
      - creates cold-start issues for new users
      - can trap users in narrow filter bubbles
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c16-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 2
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c16-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: faceted-search-vs-browsing
  position: after
concepts:
  - faceted search
  - browsing
  - recommendation
  - information architecture
skills:
  - recall
domain: interactive-design-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: interaction-design-ux-specialization-easy-c16-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-ux-specialization-easy-c16-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c16-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c16-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c17-m1
version: 1
scenario: >-
  Classify each interaction as belonging to a WIMP interface or a Post-WIMP
  (gestural) interface.
theories:
  - id: th-a
    content: WIMP Interface (Windows, Icons, Menus, Pointers)
  - id: th-b
    content: Post-WIMP (Gestural) Interface
clues:
  - id: c1
    content: User clicks an icon inside a window using a mouse pointer.
  - id: c2
    content: User pinches two fingers apart on a touchscreen to zoom into a photo.
  - id: c3
    content: User opens a labeled drop-down menu by clicking a menu bar.
  - id: c4
    content: >-
      Player waves a motion controller and the game tracks their hand in 3D
      space.
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c17-m1
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
id: 02-interaction-design-ux-architecture-easy-c17-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: evidence-match
tier: Easy
anchor:
  heading: the-discoverability-problem
  position: after
concepts:
  - WIMP paradigm
  - Post-WIMP gestural interfaces
skills:
  - recall
domain: interactive-design-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: interaction-design-ux-specialization-easy-c17-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c17-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c17-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c17-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c18-m1
version: 1
categories:
  - id: cat-a
    label: Generate
  - id: cat-b
    label: Evaluate
items:
  - id: i1
    content: Interviews about user needs
  - id: i2
    content: Usability testing a prototype
  - id: i3
    content: Exploring unmet user needs
  - id: i4
    content: A/B testing existing designs
  - id: i5
    content: Field studies for opportunities
  - id: i6
    content: Heuristic evaluation of app
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c18-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
  i5: cat-a
  i6: cat-b
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c18-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: quick-classification
tier: Easy
anchor:
  heading: generative-vs-evaluative-research
  position: after
concepts:
  - Generative research
  - Evaluative research
skills:
  - recall
domain: interactive-design-studies
prompt: 'Sort the UX research methods: Generative or Evaluative research'
validator:
  kind: mapping
  ref: interaction-design-ux-specialization-easy-c18-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c18-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c18-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c18-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-interaction-design-ux-architecture-easy-c19-m1
version: 1
question: What does a generator produce?
options:
  - id: a
    content: Values one at a time on demand
  - id: b
    content: All values in a list upfront
  - id: c
    content: Random numbers only
:::

:::mechanic-private
id: 02-interaction-design-ux-architecture-easy-c19-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 02-interaction-design-ux-architecture-easy-c19-m1
version: 1
lessonSlug: interaction-design-ux-specialization-easy
type: multiple-choice
tier: Easy
anchor:
  heading: module-1-gener
  position: after
concepts:
  - generators
skills:
  - recall
domain: interactive-design-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: interaction-design-ux-specialization-easy-c19-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-ux-specialization-easy-c19-m1:public
privateValidatorRef: interaction-design-ux-specialization-easy-c19-m1:private
rewardIdentity: interaction-design-ux-specialization-easy-c19-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[3,4,5,7,8,9,10,11,12,13,14,15,16,17,18,19],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"creating-design-goals"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"paper-prototyping"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"consistency-standards"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"distributed-cognition"},{"mechanicType":"evidence-match","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"invisible-structure-gestalt-principles"},{"mechanicType":"multiple-choice","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"the-element-of-surprise"},{"mechanicType":"abstract-transfer","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"beyond-social-networks"},{"mechanicType":"tradeoff-decision","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"collaboration-frameworks"},{"mechanicType":"constraint-construction","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"designing-for-distributed-teams"},{"mechanicType":"quick-classification","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"crowd-motivations"},{"mechanicType":"sequence-builder","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"the-full-interaction-loop"},{"mechanicType":"parameter-tuner","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"fitts-s-law"},{"mechanicType":"tradeoff-decision","__chunkIndex":16,"__version":1,"__tier":"Easy","__anchorId":"faceted-search-vs-browsing"},{"mechanicType":"evidence-match","__chunkIndex":17,"__version":1,"__tier":"Easy","__anchorId":"the-discoverability-problem"},{"mechanicType":"quick-classification","__chunkIndex":18,"__version":1,"__tier":"Easy","__anchorId":"generative-vs-evaluative-research"},{"mechanicType":"multiple-choice","__chunkIndex":19,"__version":1,"__tier":"Easy","__anchorId":"module-1-gener"}]}
:::