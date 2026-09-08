:::mechanic-data
id: 04-generative-design-agents-medium-c2-m1
version: 1
question: >-
  A virtual world has not been fully designed in advance, but it changes to
  support a user's evolving needs and stylistic preferences during use. Which
  explanation best matches the role of a Generative Design Agent?
options:
  - id: a
    content: >-
      It interprets the user's needs, forms goals, generates place designs, and
      acts on the world to adapt it.
  - id: b
    content: >-
      It mainly makes existing world objects more interactive so users can
      control them more easily.
  - id: c
    content: >-
      It supplies the fixed design grammar that completely defines every
      possible place before users enter the world.
  - id: d
    content: >-
      It replaces sensing and reasoning by applying the same predefined redesign
      to every user.
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c2-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 1-what-a-generative-design-agent-is
  position: after
concepts:
  - Generative Design Agent purpose
  - adaptive virtual places
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 04-generative-design-agents-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-generative-design-agents-medium-c2-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c2-m1:private
rewardIdentity: 04-generative-design-agents-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c3-m1
version: 1
categories:
  - id: agent-function
    label: Agent Function
  - id: environment-object
    label: Environment or Object
  - id: multi-agent-structure
    label: Multi-Agent Structure
items:
  - id: i1
    content: Sense, reason, then act autonomously
  - id: i2
    content: A shared setting in which participants exist and operate
  - id: i3
    content: A passive object that agents can perceive, create, and manipulate
  - id: i4
    content: Beliefs, goals, and actions organized rationally
  - id: i5
    content: Relationships among participating agents
  - id: i6
    content: Operators that let agents pursue perception, creation, or manipulation
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c3-m1
version: 1
kind: mapping
matches:
  i1: agent-function
  i2: environment-object
  i3: environment-object
  i4: agent-function
  i5: multi-agent-structure
  i6: multi-agent-structure
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c3-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: quick-classification
tier: Medium
anchor:
  heading: 2-agents-environments-and-multi-agent-systems
  position: after
concepts:
  - agent-environment relation
  - multi-agent system components
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each agent-systems concept: Agent Function, Environment or Object, or
  Multi-Agent Structure
validator:
  kind: mapping
  ref: 04-generative-design-agents-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-generative-design-agents-medium-c3-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c3-m1:private
rewardIdentity: 04-generative-design-agents-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c4-m1
version: 1
sourceDomain: GDA agents in virtual worlds
targetDomain: Architecture and urban design
scenario: >-
  Transfer the core logic from virtual-world agents to architecture. Which
  approach actually works?
options:
  - id: a
    content: >-
      Give each resident a design agent that generates and redesigns spaces
      around the resident's needs and style.
  - id: b
    content: >-
      Let rooms and buildings remain the main agents, while a resident-focused
      layer helps them adjust some features.
  - id: c
    content: >-
      Make walls, doors, and rooms react to preset triggers without giving
      residents a design agent or generating new layouts.
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c4-m1
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
      Check whether agency belongs to the resident's agent and whether it can
      design places, rather than merely adjust existing components.
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c4-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: 3-the-main-shift-from-earlier-virtual-world-agent-models
  position: after
concepts:
  - user-centered agency
  - design generation via grammar
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-generative-design-agents-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-generative-design-agents-medium-c4-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c4-m1:private
rewardIdentity: 04-generative-design-agents-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c5-m1
version: 1
question: >-
  Which statement best explains how the GDA relates to the earlier agent models
  and modes described in the section?
options:
  - id: a
    content: >-
      It retains the agent-world interface and several earlier architectural
      ideas, but adds explicit interpretation, goal formation, design
      generation, and recursion.
  - id: b
    content: >-
      It replaces the earlier models entirely because reflexive, reactive, and
      reflective modes cannot support any form of reasoning.
  - id: c
    content: >-
      It is mainly a reflective agent that filters sensed data and updates
      concepts, without changing the distribution of agency.
  - id: d
    content: >-
      It preserves the reflexive condition-action structure but removes beliefs,
      perception processes, and staged reasoning.
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c5-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c5-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 5-common-virtual-world-agent-modes
  position: after
concepts:
  - GDA antecedents
  - agent modes
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 04-generative-design-agents-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-generative-design-agents-medium-c5-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c5-m1:private
rewardIdentity: 04-generative-design-agents-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c6-m1
version: 1
items:
  - id: i1
    content: Sensation retrieves relevant raw data from the virtual world
  - id: i2
    content: >-
      Interpretation transforms sensed data into an internal understanding of
      needs and world state
  - id: i3
    content: >-
      Hypothesizing creates design goals to reduce the mismatch between needs
      and world state
  - id: i4
    content: >-
      Designing applies a generative design grammar to produce a virtual place
      design
  - id: i5
    content: Action plans and activates changes in the world
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c6-m1
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
id: 04-generative-design-agents-medium-c6-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: sequence-builder
tier: Medium
anchor:
  heading: 6-the-five-gda-processes
  position: after
concepts:
  - five GDA processes
  - computational pipeline
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From sensing the world to changing it: the correct sequence of the five GDA
  processes
validator:
  kind: sequence
  ref: 04-generative-design-agents-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 04-generative-design-agents-medium-c6-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c6-m1:private
rewardIdentity: 04-generative-design-agents-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c7-m1
version: 1
scenario: >-
  A user needs a gallery space, but the interpreted world contains no gallery
  space. Diagnose the core problem and tune the state.
symptoms:
  - A needed gallery space is absent from the interpreted world.
  - >-
    The system must keep checking whether the world fits the user’s current
    needs.
  - The response should not depend only on a fixed scripted trigger.
diagnoses:
  - id: d1
    content: >-
      A mismatch exists between the user’s current needs and the current
      interpreted state.
  - id: d2
    content: >-
      A fixed scripted response should be triggered whenever the gallery space
      is absent.
  - id: d3
    content: >-
      No adaptation is needed because the interpreted world already fits the
      user.
parameters:
  - id: p1
    label: Current need level
    min: 0
    max: 100
    step: 25
  - id: p2
    label: State fit
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Continuous checking
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c7-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: '>='
    targetValue: 50
  - parameterId: p2
    operator: <
    targetValue: 50
hints:
  - id: hint-1
    matcher:
      wrongDiagnosisId: d2
    hint: >-
      The issue is not a predetermined script; it is the mismatch between
      current needs and current state.
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c7-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: diagnostic-lab
tier: Medium
anchor:
  heading: 7-the-core-adaptive-problem-mismatch-between-needs-and-state
  position: after
concepts:
  - needs-state mismatch
  - continuous adaptivity
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Identify the adaptive problem and set the system state.
validator:
  kind: invariants
  ref: 04-generative-design-agents-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: 04-generative-design-agents-medium-c7-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c7-m1:private
rewardIdentity: 04-generative-design-agents-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c8-m1
version: 1
scenario: >-
  The GDA maintains three simultaneous representations: what exists outside it,
  what it currently understands, and what should exist to satisfy its current
  goals.
theories:
  - id: th-a
    content: >-
      The clue describes the external world: entities and events that exist
      outside the GDA.
  - id: th-b
    content: >-
      The clue describes the interpreted world: transformed representations that
      make up the GDA’s current understanding.
  - id: th-c
    content: >-
      The clue describes the expected world: states, events, or objects that
      should exist if current goals are satisfied.
clues:
  - id: c1
    content: >-
      A virtual gallery, a wall, and a digital picture are treated as things
      that exist outside the GDA.
  - id: c2
    content: >-
      The GDA transforms an observed event into a representation it can use to
      infer needs.
  - id: c3
    content: A message should be sent to connected users to satisfy the current goal.
  - id: c4
    content: The GDA’s user and other non-agent avatars are included in this layer.
  - id: c5
    content: >-
      This layer contains the GDA’s understanding of the world, not merely a
      copy of it.
  - id: c6
    content: >-
      World-level attributes such as server and system time are excluded from
      this goal structure because they are generally unchangeable.
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c8-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-c
  c4: th-a
  c5: th-b
  c6: th-c
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: wrong-one
    hint: >-
      A message that should exist to satisfy a goal belongs to the expected
      world, even though it refers to an event.
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c8-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: evidence-match
tier: Medium
anchor:
  heading: expected-world
  position: after
concepts:
  - world representations
  - external, interpreted, and expected worlds
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 04-generative-design-agents-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-generative-design-agents-medium-c8-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c8-m1:private
rewardIdentity: 04-generative-design-agents-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c9-m1
version: 1
items:
  - id: i1
    content: Begin with raw sensed data from the current world
  - id: i2
    content: >-
      Filter, focus, and transform the sensed data into understandable internal
      representations
  - id: i3
    content: Infer the relevant object structure from the interpreted information
  - id: i4
    content: Derive the object's behavior from its interpreted structure
  - id: i5
    content: Infer the object's function from its behavior
  - id: i6
    content: Infer current design needs and the current world state
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c9-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
  - i4
  - i5
  - i6
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c9-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: sequence-builder
tier: Medium
anchor:
  heading: 9-interpretation-as-the-decisive-bridge
  position: after
concepts:
  - interpretation as a bridge
  - structure-behavior-function chain
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: 'From raw sensing to design action: the correct sequence of interpretation'
validator:
  kind: sequence
  ref: 04-generative-design-agents-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 04-generative-design-agents-medium-c9-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c9-m1:private
rewardIdentity: 04-generative-design-agents-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c10-m1
version: 1
sourceDomain: Object representation through F-B-S
targetDomain: Systems engineering
scenario: >-
  Transfer the core logic from object modeling to systems engineering. Which
  approach actually works?
options:
  - id: a
    content: >-
      Interpret an existing system by transforming observed structure into
      behavior and then function, while design begins with the desired function
      and derives behavior and structure.
  - id: b
    content: >-
      Interpret and design a system by beginning with its observed structure,
      then deriving behavior and function in both directions.
  - id: c
    content: >-
      Treat structure, behavior, and function as interchangeable descriptions
      whose order does not affect interpretation or design.
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c10-m1
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
      Check whether the approach preserves the opposite directions used for
      interpretation and design.
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c10-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: 10-object-representation-through-f-b-s
  position: after
concepts:
  - F-B-S object representation
  - interpretation versus design direction
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-generative-design-agents-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-generative-design-agents-medium-c10-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c10-m1:private
rewardIdentity: 04-generative-design-agents-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c11-m1
version: 1
scenario: >-
  A gallery is needed for an exhibition, but no gallery currently exists. The
  exhibition contains X images, a visitor is outside the gallery boundary, and
  gallery space is available at coordinates (x,y,z).
startNodeId: n1
nodes:
  - id: n1
    question: What should the GDA establish first for the missing gallery?
    options:
      - id: a1
        content: An expected function of gallery area for exhibition
        nextNodeId: n2
      - id: b1
        content: >-
          An expected behavior to display X images before defining the gallery's
          function
        nextNodeId: null
      - id: c1
        content: >-
          An event informing the artist before establishing an expected object
          goal
        nextNodeId: null
  - id: n2
    question: >-
      Once the gallery's expected function is established, what follows from the
      exhibition context?
    options:
      - id: a2
        content: An expected behavior for the gallery to display X images
        nextNodeId: n3
      - id: b2
        content: A visitor-location update, without specifying the gallery's behavior
        nextNodeId: null
      - id: c2
        content: >-
          A message to the artist, because object behavior cannot be derived
          from context
        nextNodeId: null
  - id: n3
    question: Which coordinated outcome can the GDA derive from the remaining situation?
    options:
      - id: a3
        content: >-
          Set the visitor's expected location to (x,y,z) and inform the artist
          that gallery space is available
        nextNodeId: null
      - id: b3
        content: >-
          Only redesign the gallery object, since avatar changes and events are
          outside hypothesizing
        nextNodeId: null
      - id: c3
        content: >-
          Trigger an artist message without using the available gallery location
          or visitor context
        nextNodeId: null
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c11-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c11-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: prediction
tier: Medium
anchor:
  heading: 11-hypothesizing-creating-goals-in-the-expected-world
  position: after
concepts:
  - hypothesis formation
  - expected-world goals
  - object, avatar, and event goals
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: What happens next in this gallery-planning situation?
validator:
  kind: exact
  ref: 04-generative-design-agents-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 04-generative-design-agents-medium-c11-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c11-m1:private
rewardIdentity: 04-generative-design-agents-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c12-m1
version: 1
attributes:
  - id: cost
    label: Cost
  - id: recognition
    label: LHO Recognition
  - id: stateMatch
    label: State Match
components:
  - id: c1
    content: >-
      LHO recognition — checks whether an object is recognized in the virtual
      world
    metrics:
      cost: 2
      recognition: 3
      stateMatch: 0
  - id: c2
    content: State-label matching — checks whether sL matches the current design goals
    metrics:
      cost: 2
      recognition: 0
      stateMatch: 3
  - id: c3
    content: >-
      Rule application — generates a replacement or addition from a recognized
      LHO
    metrics:
      cost: 3
      recognition: 2
      stateMatch: 2
  - id: c4
    content: >-
      Reception-to-gallery rule — adds a gallery area adjacent to a recognized
      reception area
    metrics:
      cost: 3
      recognition: 2
      stateMatch: 2
  - id: c5
    content: >-
      Incremental construction — applies rules to build part of the expected
      structure
    metrics:
      cost: 4
      recognition: 1
      stateMatch: 1
requirements:
  - attributeId: cost
    operator: <=
    value: 10
  - attributeId: recognition
    operator: '>='
    value: 6
  - attributeId: stateMatch
    operator: '>'
    value: 5
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c12-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: cost
    hint: >-
      Check the lowest-cost combinations before verifying recognition and state
      matching.
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c12-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: constraint-construction
tier: Medium
anchor:
  heading: 12-designing-the-generative-grammar
  position: after
concepts:
  - LHO recognition
  - state-label matching
  - incremental structure generation
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Find the rule combination that satisfies the design grammar constraints.
validator:
  kind: invariants
  ref: 04-generative-design-agents-medium-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 04-generative-design-agents-medium-c12-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c12-m1:private
rewardIdentity: 04-generative-design-agents-medium-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c13-m1
version: 1
scenario: >-
  Move expected design into the external world through action. Balance
  structural implementation, avatar or attribute changes, and event triggering,
  then use reinterpretation to reduce the remaining mismatch.
maxTurns: 6
variables:
  - id: v1
    name: External structure
    initialValue: 20
    targetValue: 60
    min: 0
    max: 100
  - id: v2
    name: Actual behavior
    initialValue: 20
    targetValue: 60
    min: 0
    max: 100
  - id: v3
    name: Event readiness
    initialValue: 10
    targetValue: 40
    min: 0
    max: 100
  - id: v4
    name: Cycle mismatch
    initialValue: 80
    targetValue: 20
    min: 0
    max: 100
controls:
  - id: c1
    type: button
    label: Plan the action
    effects:
      - variableId: v1
        delta: 10
      - variableId: v2
        delta: 10
      - variableId: v4
        delta: -5
  - id: c2
    type: button
    label: Implement structure
    effects:
      - variableId: v1
        delta: 20
      - variableId: v2
        delta: 10
      - variableId: v4
        delta: -15
  - id: c3
    type: button
    label: Change avatar attributes
    effects:
      - variableId: v2
        delta: 10
      - variableId: v1
        delta: -10
      - variableId: v4
        delta: -10
  - id: c4
    type: button
    label: Trigger an event
    effects:
      - variableId: v3
        delta: 20
      - variableId: v2
        delta: 5
      - variableId: v4
        delta: -10
  - id: c5
    type: switch
    label: Sustain reinterpretation
    activeEffects:
      - variableId: v3
        delta: 10
      - variableId: v4
        delta: -5
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c13-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c13-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: system-simulation
tier: Medium
anchor:
  heading: 14-gda-as-an-adaptation-of-the-f-b-s-framework
  position: after
concepts:
  - action planning and activation
  - structural, avatar, and event implementation
  - reinterpretation and mismatch reduction
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Bring the action cycle to stable operating levels.
validator:
  kind: invariants
  ref: 04-generative-design-agents-medium-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 2
publicPayloadRef: 04-generative-design-agents-medium-c13-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c13-m1:private
rewardIdentity: 04-generative-design-agents-medium-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-generative-design-agents-medium-c14-m1
version: 1
scenario: >-
  Your team must design a place-making system that can respond effectively as
  user needs and conditions change. Each strategy has benefits but also
  limitations.
options:
  - id: a
    content: >-
      Use fixed scripts and a comprehensive design grammar to pre-author every
      likely situation
    pros:
      - predictable behavior
      - clear design rules
    cons:
      - struggles with changing needs
      - cannot fully adapt through scripts alone
      - may limit novel structures
  - id: b
    content: >-
      Give rational agents user-centered agency and repeatedly reduce the
      mismatch between current needs and the current state
    pros:
      - responds to changing conditions
      - keeps design focused on users
      - supports ongoing adaptation
      - can guide reconfiguration or new creation
    cons:
      - requires continuous interpretation
      - outcomes may be less predictable
  - id: c
    content: >-
      Focus on building durable physical spaces first, then let users adjust
      their behavior around them
    pros:
      - stable physical foundation
      - simpler initial planning
    cons:
      - places agency in buildings rather than agents
      - does not directly reduce the needs-state gap
      - adaptation depends on users compensating for the design
  - id: d
    content: >-
      Install sensors while leaving decision-making and execution logic mostly
      predefined
    pros:
      - collects information about conditions
      - can detect some changes
    cons:
      - sensing alone does not produce adaptivity
      - lacks internal interpretation or goal hypotheses
      - may fail to turn observations into appropriate action
:::

:::mechanic-private
id: 04-generative-design-agents-medium-c14-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
  c: 0
  d: 2
hints:
  b: >-
    The strongest strategy connects user-centered agency with repeated mismatch
    reduction and the full adaptive architecture.
:::

:::mechanic
schemaVersion: 1
id: 04-generative-design-agents-medium-c14-m1
version: 1
lessonSlug: 04-generative-design-agents-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: the-model-supports-both-redesign-and-new-creation
  position: after
concepts:
  - adaptivity through mismatch reduction
  - user-centered agency
  - requirements for adaptive systems
  - redesign and new creation
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-generative-design-agents-medium-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-generative-design-agents-medium-c14-m1:public
privateValidatorRef: 04-generative-design-agents-medium-c14-m1:private
rewardIdentity: 04-generative-design-agents-medium-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,14],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-what-a-generative-design-agent-is"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-agents-environments-and-multi-agent-systems"},{"mechanicType":"abstract-transfer","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"3-the-main-shift-from-earlier-virtual-world-agent-models"},{"mechanicType":"multiple-choice","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"5-common-virtual-world-agent-modes"},{"mechanicType":"sequence-builder","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"6-the-five-gda-processes"},{"mechanicType":"diagnostic-lab","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"7-the-core-adaptive-problem-mismatch-between-needs-and-state"},{"mechanicType":"evidence-match","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"expected-world"},{"mechanicType":"sequence-builder","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"9-interpretation-as-the-decisive-bridge"},{"mechanicType":"abstract-transfer","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"10-object-representation-through-f-b-s"},{"mechanicType":"prediction","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"11-hypothesizing-creating-goals-in-the-expected-world"},{"mechanicType":"constraint-construction","__chunkIndex":12,"__version":1,"__tier":"Medium","__anchorId":"12-designing-the-generative-grammar"},{"mechanicType":"system-simulation","__chunkIndex":13,"__version":1,"__tier":"Medium","__anchorId":"14-gda-as-an-adaptation-of-the-f-b-s-framework"},{"mechanicType":"tradeoff-decision","__chunkIndex":14,"__version":1,"__tier":"Medium","__anchorId":"the-model-supports-both-redesign-and-new-creation"}]}
:::