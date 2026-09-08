:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c2-m1
version: 1
question: >-
  What best captures the conceptual shift introduced by an adaptive virtual
  place?
options:
  - id: a
    content: >-
      The environment’s objects gain more predefined interaction rules, while
      occupants mainly use the world as designed.
  - id: b
    content: >-
      Occupants gain agency because a GDA can interpret their needs and redesign
      the place in real time, using a design language defined by human
      designers.
  - id: c
    content: >-
      Human designers remain responsible for manually rebuilding each new world
      state, but occupants can request changes more easily.
  - id: d
    content: >-
      The world becomes less interactive because its design language limits the
      possible changes a GDA can make.
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c2-m1
version: 1
kind: exact
correctAnswer: b
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c2-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 1-the-central-idea-adaptive-places-shift-agency-to-the-occupant
  position: after
concepts:
  - adaptive virtual places
  - Generative Design Agent
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 07-generative-agents-adaptive-places-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c2-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c2-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c3-m1
version: 1
items:
  - id: i1
    content: Understand the user's situation, purposes, activities, and preferences
  - id: i2
    content: Reason about the user's needs and the environment
  - id: i3
    content: Select an appropriate design response
  - id: i4
    content: Act in the environment so the space adapts to the user
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c3-m1
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
id: 07-generative-agents-adaptive-places-medium-c3-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: sequence-builder
tier: Medium
anchor:
  heading: 2-what-a-generative-design-agent-does
  position: after
concepts:
  - GDA capabilities
  - adaptive environments
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From understanding user needs to adaptive change: the correct sequence of a
  Generative Design Agent
validator:
  kind: sequence
  ref: 07-generative-agents-adaptive-places-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c3-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c3-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c5-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: >-
      Define generative design grammars with rules, structures, and style
      principles
  - id: s2
    isMissing: true
  - id: s3
    content: The GDA performs design operations live inside the world
  - id: s4
    isMissing: true
  - id: s5
    content: The place is designed while it is being used
options:
  - id: o1
    content: Use the grammars to describe how the place may be formed or transformed
  - id: o2
    content: Treat design as an embedded and ongoing process
  - id: o3
    content: Author every possible finished scene before the environment is used
  - id: o4
    content: Separate design operations from the world’s live use
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c5-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c5-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: missing-step
tier: Medium
anchor:
  heading: 4-the-changing-role-of-the-human-designer
  position: after
concepts:
  - generative design grammars
  - embedded ongoing design
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Fill the missing steps in the generative design process pipeline
validator:
  kind: mapping
  ref: 07-generative-agents-adaptive-places-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c5-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c5-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c6-m1
version: 1
sourceDomain: Web environments
targetDomain: Human-computer interaction
scenario: >-
  Transfer the core logic from web environments to human-computer interaction.
  Which approach actually works?
options:
  - id: a
    content: >-
      Model structure, content, presentation, local behavior, and shared
      behavior as distinct but coordinated roles, regardless of the interface
      medium.
  - id: b
    content: >-
      Reuse web technologies as the required implementation categories, adapting
      only their visual appearance for other interfaces.
  - id: c
    content: >-
      Treat each interface medium as fundamentally unique, so no common
      grammar-agent structure can transfer between them.
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c6-m1
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
      Check whether the approach transfers the underlying roles rather than
      copying the technologies themselves.
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c6-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: 5-the-framework-is-not-limited-to-3d-virtual-worlds
  position: after
concepts:
  - technology-independent grammar-agent model
  - structural equivalence across media
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 07-generative-agents-adaptive-places-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c6-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c6-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c7-m1
version: 1
attributes:
  - id: syntax
    label: Syntax
  - id: semantics
    label: Semantics
components:
  - id: c1
    content: Layout rules — organize the spatial arrangement of the place
    metrics:
      syntax: 4
      semantics: 1
  - id: c2
    content: Object design rules — shape visible and usable place components
    metrics:
      syntax: 4
      semantics: 1
  - id: c3
    content: Navigation rules — govern how users move through the place
    metrics:
      syntax: 1
      semantics: 4
  - id: c4
    content: Interaction rules — govern user actions and the place's responses
    metrics:
      syntax: 1
      semantics: 4
  - id: c5
    content: Combined rule set — coordinate spatial structure with behavior in use
    metrics:
      syntax: 3
      semantics: 3
requirements:
  - attributeId: syntax
    operator: '>='
    value: 5
  - attributeId: semantics
    operator: '>='
    value: 5
  - attributeId: syntax
    operator: <=
    value: 8
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c7-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: syntax
    hint: Balance rules for visualization with rules for behavior.
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c7-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: constraint-construction
tier: Medium
anchor:
  heading: 6-generative-design-grammars-how-adaptive-places-are-structured
  position: after
concepts:
  - rule classes
  - syntax and semantics
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Find the right combination to meet the constraints.
validator:
  kind: invariants
  ref: 07-generative-agents-adaptive-places-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c7-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c7-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c8-m1
version: 1
scenario: >-
  You are designing an adaptive place. Its main purpose is to support a precise
  task reliably while still allowing some creative variation. Which design
  approach best fits the framework?
options:
  - id: a
    content: >-
      Use strong constraints that keep the environment predictable and reliably
      support the intended task.
    pros:
      - high functional reliability
      - clear support for intended activities
      - predictable outcomes
    cons:
      - less novelty
      - reduced stylistic diversity
  - id: b
    content: >-
      Use moderate constraints so the task remains mostly supported while
      leaving room for surprise and variation.
    pros:
      - balances function and creativity
      - allows some stylistic diversity
    cons:
      - less reliable than a strongly constrained design
      - may not fully maximize novelty
  - id: c
    content: >-
      Use very few constraints to maximize emergence, surprise, and creative
      exploration.
    pros:
      - high novelty
      - greater surprise
      - broad stylistic diversity
    cons:
      - weaker support for precise tasks
      - less predictable functionality
  - id: d
    content: >-
      Prioritize ambiguity and emergence regardless of the place's intended
      activity.
    pros:
      - strong creative openness
    cons:
      - ignores goal satisfaction
      - can make intended activities unreliable
      - does not adapt constraints to purpose
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c8-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 1
  d: 0
hints:
  b: >-
    The framework prioritizes reliable goal satisfaction when the place must
    support a precise task.
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c8-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 7-functional-design-and-creative-design
  position: after
concepts:
  - goal satisfaction
  - constraints versus creativity
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 07-generative-agents-adaptive-places-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c8-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c8-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c9-m1
version: 1
scenario: >-
  A GDA is managing an adaptive virtual world. A user's behavior changes, but
  the system is not yet certain whether the change reflects a genuine need, a
  temporary action, or a shift in design goals. The design team is considering
  how the GDA should respond now and improve over time.
startNodeId: n1
nodes:
  - id: n1
    question: What should the GDA prioritize before changing the environment?
    options:
      - id: a1
        content: >-
          Build an explicit, well-structured interpretation of the user's needs,
          actions, and context.
        nextNodeId: n2
      - id: b1
        content: >-
          Change the environment immediately so the system can discover whether
          the user likes the result.
        nextNodeId: null
      - id: c1
        content: >-
          Treat the latest user action as sufficient evidence of a stable design
          requirement.
        nextNodeId: null
  - id: n2
    question: >-
      Once the user's situation is interpreted, what should justify an
      environmental change?
    options:
      - id: a2
        content: >-
          An interpretation strong enough to connect the observed situation with
          a relevant design response.
        nextNodeId: n3
      - id: b2
        content: >-
          Any interpretation that produces a more novel or visually impressive
          environment.
        nextNodeId: null
      - id: c2
        content: >-
          A change whenever inferred behavior conflicts with the
          designer-authored grammar.
        nextNodeId: null
  - id: n3
    question: How could the GDA improve its design behavior over time?
    options:
      - id: a3
        content: >-
          Learn from prior design episodes through machine learning or
          case-based reasoning, then refine its grammar.
        nextNodeId: null
      - id: b3
        content: >-
          Automate more design decisions without changing the underlying
          designer-authored rules.
        nextNodeId: null
      - id: c3
        content: >-
          Replace interpretation with a fixed response pattern that works for
          recurring situations.
        nextNodeId: null
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c9-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c9-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: prediction
tier: Medium
anchor:
  heading: 9-future-extension-learning-and-adaptation-of-grammars
  position: after
concepts:
  - interpretation as a strategic bottleneck
  - learning and adaptation of grammars
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: What happens next in this adaptive design situation?
validator:
  kind: exact
  ref: 07-generative-agents-adaptive-places-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c9-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c9-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c10-m1
version: 1
scenario: >-
  The section describes how design grammars shape style, and how design can
  extend from one GDA designing for one user to collaborative and large-scale
  collective participation.
theories:
  - id: th-a
    content: >-
      Individual design style: one dominant GDA designs for one user or
      situation.
  - id: th-b
    content: >-
      Shared design style: multiple GDAs with different grammars negotiate how
      their styles coexist.
  - id: th-c
    content: >-
      Collective design style: large networked communities contribute to design,
      potentially reshaping identity, authorship, and control.
clues:
  - id: c1
    content: >-
      Current work mostly treats design as one dominant GDA designing for one
      user or situation.
  - id: c2
    content: >-
      Different GDAs may carry different grammars, and those grammars may
      express different styles.
  - id: c3
    content: Styles may need to morph to support shared interests.
  - id: c4
    content: Styles may influence one another when multiple GDAs participate in design.
  - id: c5
    content: Large networked communities can contribute to complex design problems.
  - id: c6
    content: A collective design style may reshape identity, authorship, and control.
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c10-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-b
  c4: th-b
  c5: th-c
  c6: th-c
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-c
    hint: >-
      Read c3 carefully: it describes styles adapting for shared interests,
      which is the shared-design problem rather than large-scale collective
      participation.
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c10-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: evidence-match
tier: Medium
anchor:
  heading: 11-from-collaborative-design-to-collective-design
  position: after
concepts:
  - individual, shared, and collective design styles
  - style negotiation in multi-agent and community design
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 07-generative-agents-adaptive-places-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c10-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c10-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c11-m1
version: 1
scenario: >-
  Prepare an adaptive built environment by balancing sensing, intelligence,
  responsiveness, and virtual testing. Controls have side effects, so plan your
  sequence carefully.
maxTurns: 6
variables:
  - id: v1
    name: Sensitivity
    initialValue: 30
    targetValue: 70
    min: 0
    max: 100
  - id: v2
    name: Smartness
    initialValue: 40
    targetValue: 70
    min: 0
    max: 100
  - id: v3
    name: Responsiveness
    initialValue: 35
    targetValue: 70
    min: 0
    max: 100
  - id: v4
    name: Virtual Test Confidence
    initialValue: 30
    targetValue: 70
    min: 0
    max: 100
controls:
  - id: c1
    type: button
    label: Add embedded sensing
    effects:
      - variableId: v1
        delta: 15
      - variableId: v2
        delta: 5
      - variableId: v3
        delta: -5
  - id: c2
    type: button
    label: Apply adaptive grammar rules
    effects:
      - variableId: v2
        delta: 15
      - variableId: v3
        delta: 10
  - id: c3
    type: switch
    label: Enable responsive interaction
    activeEffects:
      - variableId: v3
        delta: 10
      - variableId: v2
        delta: -5
  - id: c4
    type: button
    label: Test the concept virtually
    effects:
      - variableId: v4
        delta: 20
      - variableId: v3
        delta: 5
  - id: c5
    type: slider
    label: Set virtual test depth
    bindsTo: v4
    min: 0
    max: 100
    step: 10
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c11-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c11-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: system-simulation
tier: Medium
anchor:
  heading: 13-relevance-to-interactive-architecture
  position: after
concepts:
  - sensitivity
  - smartness
  - responsiveness
  - virtual test beds
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Bring the environment to adaptive operating levels.
validator:
  kind: invariants
  ref: 07-generative-agents-adaptive-places-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 2
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c11-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c11-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c12-m1
version: 1
question: >-
  A design team wants an adaptive virtual place that can respond to users,
  support continuous redesign, and be tested before building a physical version.
  Which approach best follows the chapter’s practical implications?
options:
  - id: a
    content: >-
      Place agency near the user, encode place logic as grammars, separate form
      and behavior rules, and use the virtual place as a prototype.
  - id: b
    content: >-
      Place agency in the environment object, define a fixed scene first, and
      optimize primarily for predictable behavior.
  - id: c
    content: >-
      Keep form and behavior in one rule family, let novelty determine the
      system’s function-creativity balance, and coordinate agents through task
      assignment.
  - id: d
    content: >-
      Use fixed scenes for reliable adaptation, place agency equally between
      users and objects, and deploy physical architecture before virtual
      testing.
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c12-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c12-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 14-practical-implications-of-the-chapter
  position: after
concepts:
  - adaptive place design
  - design-system tradeoffs
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 07-generative-agents-adaptive-places-medium-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c12-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c12-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 07-generative-agents-adaptive-places-medium-c4-m1
version: 1
categories:
  - id: cat-ext
    label: External state
  - id: cat-int
    label: Internal state
  - id: cat-exp
    label: Expected state
items:
  - id: i1
    content: The current arrangement of space and objects
  - id: i2
    content: A goal the GDA is pursuing
  - id: i3
    content: A prediction about what may be true next
  - id: i4
    content: A detectable user action occurring now
  - id: i5
    content: An active rule the GDA is considering
  - id: i6
    content: A hypothesis used to interpret the situation
:::

:::mechanic-private
id: 07-generative-agents-adaptive-places-medium-c4-m1
version: 1
kind: mapping
matches:
  i1: cat-ext
  i2: cat-int
  i3: cat-exp
  i4: cat-ext
  i5: cat-int
  i6: cat-exp
:::

:::mechanic
schemaVersion: 1
id: 07-generative-agents-adaptive-places-medium-c4-m1
version: 1
lessonSlug: 07-generative-agents-adaptive-places-medium
type: quick-classification
tier: Medium
anchor:
  heading: 3-the-world-model-external-internal-and-expected-states
  position: after
concepts:
  - external world state
  - internal agent state
  - expected or hypothesized world state
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each GDA world-model element: External state, Internal state, or
  Expected state
validator:
  kind: mapping
  ref: 07-generative-agents-adaptive-places-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 07-generative-agents-adaptive-places-medium-c4-m1:public
privateValidatorRef: 07-generative-agents-adaptive-places-medium-c4-m1:private
rewardIdentity: 07-generative-agents-adaptive-places-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-the-central-idea-adaptive-places-shift-agency-to-the-occupant"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-what-a-generative-design-agent-does"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"3-the-world-model-external-internal-and-expected-states"},{"mechanicType":"missing-step","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"4-the-changing-role-of-the-human-designer"},{"mechanicType":"abstract-transfer","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"5-the-framework-is-not-limited-to-3d-virtual-worlds"},{"mechanicType":"constraint-construction","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"6-generative-design-grammars-how-adaptive-places-are-structured"},{"mechanicType":"tradeoff-decision","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"7-functional-design-and-creative-design"},{"mechanicType":"prediction","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"9-future-extension-learning-and-adaptation-of-grammars"},{"mechanicType":"evidence-match","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"11-from-collaborative-design-to-collective-design"},{"mechanicType":"system-simulation","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"13-relevance-to-interactive-architecture"},{"mechanicType":"multiple-choice","__chunkIndex":12,"__version":1,"__tier":"Medium","__anchorId":"14-practical-implications-of-the-chapter"}]}
:::