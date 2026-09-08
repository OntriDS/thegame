:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c2-m1
version: 1
categories:
  - id: cat-gda
    label: GDA Design Capability
  - id: cat-avatar
    label: Ordinary Avatar Role
  - id: cat-scope
    label: Outside Chapter Scope
items:
  - id: i1
    content: Forms a hypothesis about what the gallery needs next
  - id: i2
    content: Participates in the gallery as a user without design agency
  - id: i3
    content: Interprets what is happening in the world
  - id: i4
    content: Communication among multiple design-capable agents
  - id: i5
    content: Matches the current situation to grammar rules and generates a new design
  - id: i6
    content: Represents the artist's design agency in the scenario
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-gda
  i2: cat-avatar
  i3: cat-gda
  i4: cat-scope
  i5: cat-gda
  i6: cat-gda
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c2-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: quick-classification
tier: Medium
anchor:
  heading: 1-what-this-scenario-is-about
  position: after
concepts:
  - Generative Design Agent capabilities
  - scope of the agent-based scenario
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each virtual-gallery concept: GDA design capability, ordinary avatar
  role, or outside the chapter's scope
validator:
  kind: mapping
  ref: 06-adaptive-virtual-gallery-design-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c2-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c2-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c3-m1
version: 1
question: >-
  Which statement best explains how the gallery changes between its adaptive and
  static modes?
options:
  - id: a
    content: >-
      The gallery stays permanently fluid because the GDA continuously redesigns
      it, even after the artist disconnects.
  - id: b
    content: >-
      The gallery is adaptive whenever visitor numbers change, regardless of
      whether the artist is present.
  - id: c
    content: >-
      The artist's presence through the GDA enables redesign and manipulation,
      while disconnection triggers termination rules that leave a stable static
      design.
  - id: d
    content: >-
      The gallery is static only before the first exhibition and becomes
      permanently adaptive once an exhibition opens.
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c3-m1
version: 1
kind: exact
correctAnswer: c
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c3-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 3-static-gallery-vs-adaptive-gallery
  position: after
concepts:
  - adaptive versus static gallery modes
  - artist presence and design agency
  - dynamic adaptation and stable persistence
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 06-adaptive-virtual-gallery-design-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c3-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c3-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c4-m1
version: 1
items:
  - id: i1
    content: Interpret changes in the world by reading world state and user activity
  - id: i2
    content: Hypothesize explicit symbolic design goals from the interpreted conditions
  - id: i3
    content: Match the hypothesized goals to relevant state labels
  - id: i4
    content: >-
      Search and apply eligible layout, object design, navigation, and
      interaction rules
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c4-m1
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
id: 06-adaptive-virtual-gallery-design-medium-c4-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: sequence-builder
tier: Medium
anchor:
  heading: applying-rules-in-four-layers
  position: after
concepts:
  - GDA adaptation cycle
  - state labels and rule layers
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From changing conditions to organized adaptation: the correct sequence of the
  GDA’s core mechanism
validator:
  kind: sequence
  ref: 06-adaptive-virtual-gallery-design-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c4-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c4-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c5-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Recognize the rule’s LHO in the current gallery
  - id: s2
    isMissing: true
  - id: s3
    content: Apply the rule only when both conditions are satisfied
  - id: s4
    isMissing: true
  - id: s5
    content: Apply object design rules
  - id: s6
    isMissing: true
  - id: s7
    content: Apply interaction rules
options:
  - id: o1
    content: >-
      Check whether the rule’s state label is relevant to the GDA’s current
      design goals
  - id: o2
    content: Apply layout rules before object design, navigation, and interaction rules
  - id: o3
    content: Apply the rule whenever it exists in the system
  - id: o4
    content: Attach interactions before defining the relevant objects
  - id: o5
    content: Let random selection resolve every conflict between valid rules
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c5-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
  s6: o2
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c5-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: missing-step
tier: Medium
anchor:
  heading: 7-why-rule-order-matters
  position: after
concepts:
  - dual conditions for rule application
  - fixed grammar rule order
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Fill the missing steps in the rule application and grammar pipeline
validator:
  kind: mapping
  ref: 06-adaptive-virtual-gallery-design-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c5-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c5-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c6-m1
version: 1
scenario: >-
  The static gallery has been demolished. Configure the reception, studio, two
  exhibition galleries, navigation links, and recognized-object behaviors.
  Controls have side effects, so plan your sequence.
maxTurns: 6
variables:
  - id: v1
    name: Spatial structure
    initialValue: 0
    targetValue: 4
    min: 0
    max: 4
  - id: v2
    name: Exhibition preparation
    initialValue: 0
    targetValue: 2
    min: 0
    max: 2
  - id: v3
    name: Navigation network
    initialValue: 0
    targetValue: 3
    min: 0
    max: 3
  - id: v4
    name: Object interaction behavior
    initialValue: 0
    targetValue: 3
    min: 0
    max: 3
controls:
  - id: c1
    type: button
    label: Infer studio and gallery goals
    effects:
      - variableId: v1
        delta: 1
      - variableId: v2
        delta: 1
  - id: c2
    type: button
    label: Apply additive layout rules
    effects:
      - variableId: v1
        delta: 3
      - variableId: v3
        delta: 1
  - id: c3
    type: switch
    label: Configure image exhibitions
    activeEffects:
      - variableId: v2
        delta: 1
      - variableId: v4
        delta: 1
  - id: c4
    type: button
    label: Connect spaces and activate hyperlinks
    effects:
      - variableId: v3
        delta: 2
      - variableId: v4
        delta: 2
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c6-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c6-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: system-simulation
tier: Medium
anchor:
  heading: outcome-of-stage-1
  position: after
concepts:
  - adaptive generation
  - layout and object-rule application
  - navigation and interaction behavior
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Bring the adaptive gallery to its configured operating state.
validator:
  kind: invariants
  ref: 06-adaptive-virtual-gallery-design-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 2
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c6-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c6-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c7-m1
version: 1
scenario: >-
  Standard gallery 1 has reached maximum capacity, and the matched label allows
  either X-axis or Y-axis expansion. Choose the expansion strategy that fits the
  scenario and consider its consequences for later gallery geometries.
options:
  - id: a
    content: Apply additive layout rule 4 for X-axis expansion
    pros:
      - resolves the capacity overflow
      - uses one of the two valid additive layout rules
      - creates a distinct future gallery geometry
    cons:
      - does not follow the artist's selected direction
      - changes later gallery geometries differently
      - may create a less suitable connection pattern for the new space
  - id: b
    content: Apply additive layout rule 6 for Y-axis expansion
    pros:
      - resolves the capacity overflow
      - matches the artist's choice in the scenario
      - supports adding a connected standard gallery 1 area
      - preserves the scenario's intended downstream geometry
    cons:
      - commits the design to one branch of the adaptive grammar
      - changes later geometries through rule propagation
  - id: c
    content: Apply both layout rules to expand along both axes
    pros:
      - could provide more physical space
      - uses both rules that are valid in the conflict
      - might offer flexibility for future gallery arrangements
    cons:
      - does not resolve the direct rule conflict by choosing one rule
      - creates a layout not specified by the scenario
      - could alter later geometries in multiple directions
  - id: d
    content: Avoid expansion and redirect visitors without adding a gallery
    pros:
      - avoids committing to an axis
      - could temporarily reduce pressure on the original gallery
      - leaves the existing layout unchanged
    cons:
      - >-
        does not satisfy the hypothesis that an additional gallery area is
        needed
      - does not apply either valid additive layout rule
      - does not create the required new navigation and interaction space
      - fails to add the additional reception connection
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c7-m1
version: 1
kind: rubric
scoring:
  a: 2
  b: 4
  c: 1
  d: 0
hints:
  a: >-
    Both axes are valid, but check which direction the artist actually chose in
    the scenario.
  c: >-
    The conflict requires selecting one valid rule, not combining both expansion
    directions.
  d: >-
    The overflow hypothesis calls for an additional gallery area, not only
    visitor redirection.
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c7-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: why-the-alternative-mattered
  position: after
concepts:
  - rule conflict
  - axis selection
  - propagation of early rule choices
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 06-adaptive-virtual-gallery-design-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c7-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c7-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c8-m1
version: 1
sourceDomain: Studio layout design
targetDomain: Software architecture
scenario: >-
  Transfer the logic of functional reuse from the studio layout to software
  architecture. Which approach actually works?
options:
  - id: a
    content: >-
      Add the new meeting function inside an existing studio module when its
      structure already supports the need, avoiding unnecessary new navigation
      paths
  - id: b
    content: >-
      Create a separate software module but reuse some existing interaction
      rules, even though the new function could fit inside the current module
  - id: c
    content: >-
      Copy the appearance of the studio layout into the software interface
      without integrating the new function into existing structure
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c8-m1
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
      Check whether the approach reuses the existing structure instead of
      creating an unnecessary separate area.
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c8-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: result
  position: after
concepts:
  - functional reuse
  - internal integration
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 06-adaptive-virtual-gallery-design-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c8-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c8-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c9-m1
version: 1
attributes:
  - id: eventSupport
    label: Event Support
  - id: spatialCues
    label: Spatial Cues
  - id: accessLinks
    label: Access Links
components:
  - id: c1
    content: Multi-function area — provides space used as a conference venue
    metrics:
      eventSupport: 5
      spatialCues: 2
      accessLinks: 0
  - id: c2
    content: Visual boundaries — defines the venue's boundaries and cues
    metrics:
      eventSupport: 1
      spatialCues: 4
      accessLinks: 0
  - id: c3
    content: Conference arrangement — arranges the area as a conference venue
    metrics:
      eventSupport: 4
      spatialCues: 1
      accessLinks: 1
  - id: c4
    content: Wayfinding — adds navigation through the gallery
    metrics:
      eventSupport: 0
      spatialCues: 1
      accessLinks: 3
  - id: c5
    content: Hyperlinks — connects locations or information
    metrics:
      eventSupport: 0
      spatialCues: 0
      accessLinks: 3
requirements:
  - attributeId: eventSupport
    operator: '>='
    value: 9
  - attributeId: spatialCues
    operator: '>='
    value: 5
  - attributeId: accessLinks
    operator: '=='
    value: 6
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c9-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: eventSupport
    hint: Start with the components that establish and arrange the conference venue.
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c9-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: constraint-construction
tier: Medium
anchor:
  heading: result
  position: after
concepts:
  - event-oriented spatial repurposing
  - additive grammar rules
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Assemble the opening-address venue.
validator:
  kind: invariants
  ref: 06-adaptive-virtual-gallery-design-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c9-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c9-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c10-m1
version: 1
scenario: >-
  Visitor count in standard gallery 2 reaches maximum capacity during Exhibition
  2. The GDA hypothesizes O_exp^F = g2+, meaning an additional standard gallery
  2 area is required. The artist prefers expansion along the Y axis.
startNodeId: n1
nodes:
  - id: n1
    question: What should the GDA do first?
    options:
      - id: a1
        content: >-
          Match the new state labels indicating an additional standard gallery 2
          area is required.
        nextNodeId: n2
      - id: b1
        content: >-
          Keep the current state labels and wait for the original gallery to
          become less crowded.
        nextNodeId: null
      - id: c1
        content: >-
          Replace the exhibition with a different gallery type before changing
          the state.
        nextNodeId: null
  - id: n2
    question: How should the new exhibition area be established?
    options:
      - id: a2
        content: >-
          Mirror Stage 2 by applying layout, object, navigation, and interaction
          rules.
        nextNodeId: n3
      - id: b2
        content: >-
          Apply only a layout rule, since the new area does not need new
          navigation or interaction rules.
        nextNodeId: null
      - id: c2
        content: >-
          Reuse the original gallery without applying any new rules because the
          exhibition is unchanged.
        nextNodeId: null
  - id: n3
    question: Which eligible layout choice best follows the artist's preference?
    options:
      - id: a3
        content: Apply additive layout rule 7 to expand along the local Y axis.
        nextNodeId: n4
      - id: b3
        content: Apply additive layout rule 5 to expand along the local X axis.
        nextNodeId: null
      - id: c3
        content: >-
          Avoid both additive layout rules and place the new area independently
          of the existing gallery.
        nextNodeId: null
  - id: n4
    question: What visitor-flow result should follow the new area?
    options:
      - id: a4
        content: >-
          Future Exhibition 2 visitors are automatically transported to the new
          area until the original gallery falls below the crowding threshold.
        nextNodeId: null
      - id: b4
        content: >-
          All visitors are permanently moved to the new area, even after the
          original gallery is no longer crowded.
        nextNodeId: null
      - id: c4
        content: >-
          Visitors continue entering the original gallery while the new area
          remains unused unless manually selected.
        nextNodeId: null
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c10-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3,a4
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c10-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: prediction
tier: Medium
anchor:
  heading: alternative-layouts
  position: after
concepts:
  - exhibition overflow handling
  - layout rule branching
  - crowd-based navigation
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: What happens next when standard gallery 2 reaches capacity?
validator:
  kind: exact
  ref: 06-adaptive-virtual-gallery-design-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c10-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c10-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c11-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: >-
      The artist adds more items to exhibition 2 and asks the GDA to accommodate
      them.
  - id: s2
    isMissing: true
  - id: s3
    content: >-
      The new layout state is labeled sL = 1 gE2, matching additive layout rules
      12 and 13.
  - id: s4
    isMissing: true
  - id: s5
    content: The new object state labels are sL = 2 cC and sL = 2 gIMS.
  - id: s6
    isMissing: true
  - id: s7
    content: >-
      Navigation rules connect the newly expanded areas, and interaction rules
      are added where needed.
  - id: s8
    content: >-
      Both gallery 2 areas become expanded galleries able to display the
      enlarged exhibition 2.
options:
  - id: o1
    content: >-
      The GDA hypothesizes O_exp^F = gE2, meaning the two standard gallery 2
      areas must be expanded.
  - id: o2
    content: >-
      Subtractive object design rules remove excessive objects left from the
      earlier configuration before reconfiguration.
  - id: o3
    content: >-
      The GDA replaces exhibition 2 with a new exhibition and removes both
      gallery 2 areas.
  - id: o4
    content: >-
      Additive layout rules are applied after the expanded galleries are fully
      configured.
  - id: o5
    content: >-
      Additive object design rules 6 and 21 expand the gallery 2 areas, create
      visual boundaries and cues, and arrange them for the new exhibition
      version.
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c11-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
  s6: o5
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c11-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: missing-step
tier: Medium
anchor:
  heading: result
  position: after
concepts:
  - layout rule application
  - additive and subtractive object design rules
  - exhibition adaptation
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Fill the missing steps in the Exhibition 2 adaptation pipeline
validator:
  kind: mapping
  ref: 06-adaptive-virtual-gallery-design-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c11-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c11-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c12-m1
version: 1
scenario: >-
  Visitor numbers drop and redundant areas appear across the environment.
  Diagnose the system response.
symptoms:
  - Visitor numbers drop.
  - One gallery 1 area becomes empty.
  - Similar redundancy appears in a gallery 2 area and the multi-function area.
diagnoses:
  - id: d1
    content: >-
      Contraction removes redundant areas and their obsolete boundaries, cues,
      navigation aids, and hyperlinks.
  - id: d2
    content: >-
      A temporary empty area should remain available because the problem affects
      only one gallery 1 area.
  - id: d3
    content: >-
      Interaction-rule cleanup is required because the disappearing areas leave
      scripted behaviors behind.
parameters:
  - id: p1
    label: Visitor demand
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Redundancy evidence
    min: 0
    max: 100
    step: 25
  - id: p3
    label: Cleanup scope
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c12-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: <
    targetValue: 50
  - parameterId: p2
    operator: '>='
    targetValue: 50
hints:
  - id: hint-1
    matcher:
      wrongDiagnosisId: d2
    hint: >-
      Diagnosis d2 is misleading: redundancy appears across gallery 1, gallery
      2, and the multi-function area, indicating contraction.
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c12-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: diagnostic-lab
tier: Medium
anchor:
  heading: meaning-of-stage-7
  position: after
concepts:
  - contraction
  - redundancy removal
  - subtractive rules
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Identify the cause and set the conditions for the correct response.
validator:
  kind: invariants
  ref: 06-adaptive-virtual-gallery-design-medium-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c12-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c12-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c13-m1
version: 1
question: >-
  After the artist disconnects, which outcome best describes the gallery's new
  state?
options:
  - id: a
    content: >-
      The studio is removed, the remaining spatial labels and studio navigation
      cues are cleared, and the gallery becomes a static design with one
      standard gallery 1 area, one expanded gallery 2 area, and a connecting
      reception area.
  - id: b
    content: >-
      The studio remains available, but its visual boundaries are simplified
      while dynamic redesign continues in the background.
  - id: c
    content: >-
      All gallery areas are demolished and replaced by a single reception area
      until the artist reconnects.
  - id: d
    content: >-
      The studio is removed, but the gallery keeps its spatial labels and
      navigation links so visitors can continue accessing the former studio.
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c13-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c13-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: multiple-choice
tier: Medium
anchor:
  heading: final-static-gallery
  position: after
concepts:
  - static design transition
  - layout and object rule application
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 06-adaptive-virtual-gallery-design-medium-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c13-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c13-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-adaptive-virtual-gallery-design-medium-c15-m1
version: 1
scenario: >-
  An adaptive gallery changes in response to sensed conditions and active goals.
  Its design separates spatial structure, object articulation, navigation, and
  behavior scripting, while artists resolve equally valid alternatives.
theories:
  - id: th-a
    content: >-
      Adaptation should be triggered by sensed conditions and tied to a
      hypothesized goal.
  - id: th-b
    content: >-
      Adaptation should be controlled by context, structure recognizability, and
      human judgment.
  - id: th-c
    content: >-
      New functional needs should be handled by reusing or extending existing
      spaces when possible.
clues:
  - id: c1
    content: The gallery changes only after sensed conditions suggest a specific goal.
  - id: c2
    content: >-
      A rule is applied only when the current structure is recognizable and
      relevant to the active goals.
  - id: c3
    content: When two rules are equally valid, the artist chooses which one to use.
  - id: c4
    content: >-
      Crowding is handled by extending or duplicating functional spaces rather
      than only restricting access.
  - id: c5
    content: >-
      The meeting space is created by reconfiguring an existing area inside the
      studio.
  - id: c6
    content: >-
      Spatial structure, object articulation, navigation, and behavior scripting
      are designed as separate concerns.
:::

:::mechanic-private
id: 06-adaptive-virtual-gallery-design-medium-c15-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-b
  c4: th-c
  c5: th-c
  c6: th-b
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-c
    hint: >-
      Read c3 again: it focuses on resolving ambiguity through human choice, not
      on reusing an existing space.
:::

:::mechanic
schemaVersion: 1
id: 06-adaptive-virtual-gallery-design-medium-c15-m1
version: 1
lessonSlug: 06-adaptive-virtual-gallery-design-medium
type: evidence-match
tier: Medium
anchor:
  heading: functional-reuse
  position: after
concepts:
  - goal-driven adaptation
  - context-gated rules
  - functional reuse
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 06-adaptive-virtual-gallery-design-medium-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-adaptive-virtual-gallery-design-medium-c15-m1:public
privateValidatorRef: 06-adaptive-virtual-gallery-design-medium-c15-m1:private
rewardIdentity: 06-adaptive-virtual-gallery-design-medium-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,15],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-what-this-scenario-is-about"},{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"3-static-gallery-vs-adaptive-gallery"},{"mechanicType":"sequence-builder","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"applying-rules-in-four-layers"},{"mechanicType":"missing-step","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"7-why-rule-order-matters"},{"mechanicType":"system-simulation","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"outcome-of-stage-1"},{"mechanicType":"tradeoff-decision","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"why-the-alternative-mattered"},{"mechanicType":"abstract-transfer","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"result"},{"mechanicType":"constraint-construction","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"result"},{"mechanicType":"prediction","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"alternative-layouts"},{"mechanicType":"missing-step","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"result"},{"mechanicType":"diagnostic-lab","__chunkIndex":12,"__version":1,"__tier":"Medium","__anchorId":"meaning-of-stage-7"},{"mechanicType":"multiple-choice","__chunkIndex":13,"__version":1,"__tier":"Medium","__anchorId":"final-static-gallery"},{"mechanicType":"evidence-match","__chunkIndex":15,"__version":1,"__tier":"Medium","__anchorId":"functional-reuse"}]}
:::