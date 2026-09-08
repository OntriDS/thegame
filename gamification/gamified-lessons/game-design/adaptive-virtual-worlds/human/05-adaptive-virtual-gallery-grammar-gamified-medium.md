:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c2-m1
version: 1
sourceDomain: Virtual gallery design
targetDomain: Educational technology
scenario: >-
  Transfer the core logic from the source domain to educational technology.
  Which approach actually works?
options:
  - id: a
    content: >-
      Design a learning environment that adapts its layout, activities,
      resources, and interactions to different learners and supports forms of
      collaboration that are difficult in a physical classroom
  - id: b
    content: >-
      Recreate a traditional classroom online and add limited personalization
      while keeping the same structure and assumptions
  - id: c
    content: >-
      Digitize classroom materials for remote viewing without changing how
      learning activities, collaboration, or access are organized
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c2-m1
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
      Check whether this treats the digital environment as its own medium rather
      than mainly copying a physical classroom.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c2-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: 1-the-virtual-gallery-as-an-autonomous-medium
  position: after
concepts:
  - virtual gallery as autonomous medium
  - adaptive and programmable environments
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 05-adaptive-virtual-gallery-grammar-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c2-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c2-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c3-m1
version: 1
scenario: >-
  The section argues that galleries and exhibition systems change as social,
  political, economic, and technological conditions change. Virtual galleries
  are presented as part of this longer pattern rather than as a completely new
  museum idea.
theories:
  - id: th-a
    content: >-
      Technology changes what kinds of art can be created and how they must be
      exhibited.
  - id: th-b
    content: >-
      Virtual galleries mainly extend access to existing museum collections
      beyond the limits of physical buildings.
  - id: th-c
    content: >-
      Virtual galleries develop as architectural and social forms that
      distribute exhibition across digital networks.
clues:
  - id: c1
    content: Moving-image media helped media art gain recognition by the 1990s.
  - id: c2
    content: >-
      The Centre for Art and Media Karlsruhe was designed specifically to
      exhibit media art.
  - id: c3
    content: >-
      The virtual Getty Museum makes all of its collections visible in ways that
      most physical galleries cannot.
  - id: c4
    content: >-
      The virtual Getty Museum addresses the limited visibility possible in most
      physical galleries.
  - id: c5
    content: >-
      The Guggenheim Virtual Museum and the New Italian Blood Virtual Museum
      Competition explored the museum as a virtual architectural form.
  - id: c6
    content: >-
      Instagram, YouTube, blogs, wikis, and artist pages can operate as
      distributed virtual-gallery infrastructure.
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c3-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-a
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
      Read c3 again: it focuses on expanding access to collections, which
      supports the access-oriented theory rather than the architectural-network
      theory.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c3-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: evidence-match
tier: Medium
anchor:
  heading: 2-social-and-historical-background
  position: after
concepts:
  - technology and exhibition culture
  - historical evolution of virtual galleries
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 05-adaptive-virtual-gallery-grammar-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c3-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c3-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c4-m1
version: 1
scenario: >-
  The gallery must function as both an artist's personal studio and a public
  space for exhibitions, collaboration, lectures, meetings, and events. Use the
  GDA's observe, goal-setting, rule-selection, and reconfiguration actions to
  keep both roles aligned during use.
maxTurns: 6
variables:
  - id: studio
    name: Studio Support
    initialValue: 35
    targetValue: 70
    min: 0
    max: 100
  - id: public
    name: Public Activity
    initialValue: 35
    targetValue: 70
    min: 0
    max: 100
  - id: alignment
    name: Context Alignment
    initialValue: 25
    targetValue: 80
    min: 0
    max: 100
controls:
  - id: observe
    type: button
    label: Observe current conditions
    effects:
      - variableId: alignment
        delta: 15
      - variableId: public
        delta: 5
      - variableId: studio
        delta: -5
  - id: publicGoal
    type: switch
    label: Prioritize public activity
    activeEffects:
      - variableId: public
        delta: 15
      - variableId: studio
        delta: -5
      - variableId: alignment
        delta: 5
  - id: studioRule
    type: button
    label: Apply studio grammar rule
    effects:
      - variableId: studio
        delta: 15
      - variableId: public
        delta: -10
      - variableId: alignment
        delta: 5
  - id: event
    type: button
    label: Host a shared event
    effects:
      - variableId: public
        delta: 15
      - variableId: studio
        delta: 5
      - variableId: alignment
        delta: -10
  - id: reconfigure
    type: slider
    label: Set adaptive reconfiguration level
    bindsTo: alignment
    min: 0
    max: 100
    step: 10
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c4-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c4-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: system-simulation
tier: Medium
anchor:
  heading: 3-the-adaptive-virtual-gallery-model
  position: after
concepts:
  - dual studio and public exhibition roles
  - GDA adaptive reconfiguration
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Bring the adaptive gallery to stable operating levels.
validator:
  kind: invariants
  ref: 05-adaptive-virtual-gallery-grammar-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxActions: 5
  maxReboots: 2
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c4-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c4-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c5-m1
version: 1
scenario: >-
  A gallery interprets artist- and visitor-side changes before adapting its
  arrangement. Adjust the controls so the new design improves activity fit,
  exhibition fit, visitor comfort, circulation, and individualized experience.
outputs:
  - id: out1
    label: Activity and Exhibition Fit
    baseValue: 10
    targetMin: 45
    targetMax: 75
  - id: out2
    label: Visitor Comfort and Circulation
    baseValue: 15
    targetMin: 40
    targetMax: 70
  - id: out3
    label: Individualized Experience
    baseValue: 5
    targetMin: 35
    targetMax: 65
sliders:
  - id: s1
    label: Exhibition Requirements
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 4
      - outputId: out2
        multiplier: 1
  - id: s2
    label: Current Activity
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 2
      - outputId: out2
        multiplier: 3
      - outputId: out3
        multiplier: 1
  - id: s3
    label: Design Preferences
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out1
        multiplier: 1
      - outputId: out3
        multiplier: 4
  - id: s4
    label: Visitor Activity
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: out2
        multiplier: 2
      - outputId: out3
        multiplier: 2
cards:
  - id: c1
    label: Group Dynamics
    effects:
      - outputId: out2
        multiplier: 8
      - outputId: out3
        multiplier: 5
  - id: c2
    label: Individualized Routing
    effects:
      - outputId: out2
        multiplier: 3
      - outputId: out3
        multiplier: 10
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c5-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      outputId: out1
    hint: >-
      Artist-side controls mainly improve fit with the current activity and
      exhibition content.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c5-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: parameter-tuner
tier: Medium
anchor:
  heading: 4-what-triggers-adaptation
  position: after
concepts:
  - artist-side triggers
  - visitor-side triggers
  - goal-driven adaptation
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Tune the gallery so every design objective falls within its target range.
validator:
  kind: invariants
  ref: 05-adaptive-virtual-gallery-grammar-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c5-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c5-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c6-m1
version: 1
items:
  - id: i1
    content: >-
      Layout rules allocate or remove purposeful areas to define the gallery's
      spatial organization.
  - id: i2
    content: >-
      Object design rules add boundaries, furnishings, exhibition supports, and
      other objects to create a 3D environment.
  - id: i3
    content: Navigation rules add movement guidance, paths, openings, and hyperlinks.
  - id: i4
    content: >-
      Interaction rules assign scripted behaviors so visitors can use images,
      installations, documents, projectors, and hyperlinks.
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c6-m1
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
id: 05-adaptive-virtual-gallery-grammar-medium-c6-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: sequence-builder
tier: Medium
anchor:
  heading: 5-the-four-part-grammar
  position: after
concepts:
  - four-part grammar
  - ordered rule sets
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From spatial organization to visitor use: the correct sequence of the
  four-part gallery grammar
validator:
  kind: sequence
  ref: 05-adaptive-virtual-gallery-grammar-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c6-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c6-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c7-m1
version: 1
question: >-
  Why might a rule with a matching LHO pattern still not apply to the current
  design?
options:
  - id: a
    content: >-
      Because RHO must already be present before the rule can transform the
      design.
  - id: b
    content: >-
      Because the current design must also have the state label that matches the
      system's active design goal.
  - id: c
    content: >-
      Because state labels only describe objects, while the rule applies
      automatically to any recognized shape.
  - id: d
    content: >-
      Because the system applies a rule only after all possible design goals
      have been satisfied.
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c7-m1
version: 1
kind: exact
correctAnswer: b
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c7-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 6-the-rule-schema-and-state-labels
  position: after
concepts:
  - rule schema
  - state labels
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 05-adaptive-virtual-gallery-grammar-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c7-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c7-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c9-m1
version: 1
attributes:
  - id: receptionLevels
    label: Reception levels
  - id: exhibitionSlots
    label: Exhibition slots
  - id: purposefulAreas
    label: Purposeful areas
components:
  - id: c1
    content: Reception area — organize information, access, and circulation
    metrics:
      receptionLevels: 3
      exhibitionSlots: 0
      purposefulAreas: 1
  - id: c2
    content: Gallery 1 area — host exhibition 1
    metrics:
      receptionLevels: 0
      exhibitionSlots: 1
      purposefulAreas: 1
  - id: c3
    content: Gallery 2 area — host exhibition 2
    metrics:
      receptionLevels: 0
      exhibitionSlots: 1
      purposefulAreas: 1
  - id: c4
    content: >-
      Artist's personal studio area — support private creation, collaboration,
      and meetings
    metrics:
      receptionLevels: 0
      exhibitionSlots: 0
      purposefulAreas: 1
  - id: c5
    content: Multi-function area — support conferences or large-scale installations
    metrics:
      receptionLevels: 0
      exhibitionSlots: 0
      purposefulAreas: 1
requirements:
  - attributeId: receptionLevels
    operator: '=='
    value: 3
    description: Include the three-level reception structure.
  - attributeId: exhibitionSlots
    operator: '=='
    value: 2
    description: Support the two exhibitions allowed at one time.
  - attributeId: purposefulAreas
    operator: '>='
    value: 4
    description: >-
      Include the reception and both exhibition areas plus one additional
      purposeful area.
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c9-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: receptionLevels
    hint: Start with the reception area, which has three levels.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c9-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: constraint-construction
tier: Medium
anchor:
  heading: exhibition-content-types
  position: after
concepts:
  - reception as structural core
  - modular exhibition capacity
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Assemble a layout that preserves reception as the anchor and supports both
  exhibitions.
validator:
  kind: invariants
  ref: 05-adaptive-virtual-gallery-grammar-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c9-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c9-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c10-m1
version: 1
scenario: >-
  A layout system uses state labels to determine which rules apply, what kind of
  space is involved, and whether a space is needed, redundant, or should change.
theories:
  - id: th-a
    content: The label calls for adding or expanding a specific type of space.
  - id: th-b
    content: >-
      The label indicates that an existing space or adaptation is no longer
      needed and should be reduced or removed.
  - id: th-c
    content: >-
      The label controls the system's layout phase or tells the design to stop
      adapting.
clues:
  - id: c1
    content: '`sL=g1+` identifies additional gallery 1 areas.'
  - id: c2
    content: '`sL=gE2` refers to expansion of gallery 2.'
  - id: c3
    content: '`sL=g-` indicates that an initial gallery is not needed.'
  - id: c4
    content: '`sL=r-` means that a reception area is redundant.'
  - id: c5
    content: '`sL=1` means layout rules are the first rules to apply.'
  - id: c6
    content: '`sL=cS` means the current design should become static and stop adapting.'
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c10-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-a
  c3: th-b
  c4: th-b
  c5: th-c
  c6: th-c
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-a
    hint: >-
      The minus sign and the phrase “not needed” indicate subtraction, not a
      request to add space.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c10-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: evidence-match
tier: Medium
anchor:
  heading: 9-layout-state-labels
  position: after
concepts:
  - additive state labels
  - subtractive state labels
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 05-adaptive-virtual-gallery-grammar-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c10-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c10-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c11-m1
version: 1
scenario: >-
  A gallery has an active reception area, with sL=S indicating the condition for
  adding the artist's personal studio. Visitor attendance then increases beyond
  the capacity of the existing gallery modules, while the exhibition content
  also requires more space. Later, attendance decreases and the exhibition scale
  shrinks.
startNodeId: n1
nodes:
  - id: n1
    question: >-
      What spatial change should occur first while the reception area exists and
      sL=S is active?
    options:
      - id: a1
        content: Add the artist's personal studio adjacent to the reception area.
        nextNodeId: n2
      - id: b1
        content: Remove the reception area because the studio condition is active.
        nextNodeId: null
      - id: c1
        content: Shrink the existing gallery modules before adding any auxiliary space.
        nextNodeId: null
  - id: n2
    question: As visitor numbers exceed gallery capacity, how should the layout respond?
    options:
      - id: a2
        content: Add more gallery modules to respond to crowd pressure.
        nextNodeId: n3
      - id: b2
        content: >-
          Remove redundant gallery areas because crowding indicates excess
          space.
        nextNodeId: null
      - id: c2
        content: Keep the gallery unchanged and adapt only by enlarging the studio.
        nextNodeId: null
  - id: n3
    question: When the exhibition content requires more space, what adjustment follows?
    options:
      - id: a3
        content: Expand the gallery modules so they can accommodate the larger content.
        nextNodeId: n4
      - id: b3
        content: >-
          Reduce the gallery modules to standard size so the content is more
          concentrated.
        nextNodeId: null
      - id: c3
        content: >-
          Remove the multi-function area and use it as the only response to
          content pressure.
        nextNodeId: null
  - id: n4
    question: >-
      After attendance decreases and the exhibition scale shrinks, what prevents
      permanent spatial inflation?
    options:
      - id: a4
        content: >-
          Apply subtractive rules to remove unnecessary areas and reduce
          expanded galleries back to standard size.
        nextNodeId: null
      - id: b4
        content: >-
          Keep all added modules and spaces because additive rules should remain
          permanent.
        nextNodeId: null
      - id: c4
        content: >-
          Add further gallery modules so the layout remains prepared for future
          crowd pressure.
        nextNodeId: null
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c11-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3,a4
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c11-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: prediction
tier: Medium
anchor:
  heading: 10-additive-and-subtractive-layout-logic
  position: after
concepts:
  - additive layout logic
  - subtractive layout logic
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: What happens next in this adaptive gallery layout situation?
validator:
  kind: exact
  ref: 05-adaptive-virtual-gallery-grammar-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c11-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c11-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c12-m1
version: 1
scenario: >-
  Your team must choose an operating strategy for a gallery that needs to
  respond to changing visitor behavior, activities, and group dynamics while
  scaling for events and installations.
options:
  - id: a
    content: >-
      Use a closed-loop adaptive architecture driven by interpreted conditions,
      design goals, state labels, and grammar rules
    pros:
      - connects observation to design response
      - supports continuous adaptation
      - makes rule selection operational
      - updates the gallery for the next observation cycle
    cons:
      - requires ongoing observation and interpretation
      - depends on coherent state labels
  - id: b
    content: Adjust the gallery mainly through geometry and continuous resizing
    pros:
      - directly changes available space
      - may respond quickly to capacity pressure
      - keeps the control model relatively simple
    cons:
      - does not center adaptation on design goals
      - handles capacity without modular growth
      - may overlook behavior and group dynamics
  - id: c
    content: Keep a fixed display container and treat events as exceptional disruptions
    pros:
      - preserves a stable everyday layout
      - reduces routine operational changes
      - simplifies short-term planning
    cons:
      - conflicts with viewing the gallery as a live service environment
      - provides little support for large installations
      - underuses the multi-function area as a reusable buffer
      - separates content-driven scaling from normal operation
  - id: d
    content: >-
      Use a standard gallery permanently and avoid switching to expanded or
      static operating states
    pros:
      - maintains a consistent visitor experience
      - reduces state-management overhead
      - limits transition planning
    cons:
      - does not formalize content-driven scaling
      - ignores the transition from dynamic adaptation to static operation
      - can restrict event and installation capacity
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c12-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 0
  d: 1
hints:
  b: >-
    Geometry matters, but the model makes design goals and state labels the
    bridge from observed conditions to rule execution.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c12-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 12-strategic-insights-from-the-layout-system
  position: after
concepts:
  - closed-loop adaptive architecture
  - design goals and state labels
  - modular gallery scaling
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 05-adaptive-virtual-gallery-grammar-medium-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c12-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c12-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c13-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Identify the object-design stage using sL=2
  - id: s2
    isMissing: true
  - id: s3
    content: Arrange purposeful 3D objects that support the intended activities
  - id: s4
    isMissing: true
  - id: s5
    content: Apply the function-specific object rules for the selected configuration
  - id: s6
    content: >-
      Remove boundaries and furnishings when the supporting spatial conditions
      no longer exist
options:
  - id: o1
    content: Transform the 2D area layout into a 3D bounded space
  - id: o2
    content: >-
      Interpret the required activity and activate the corresponding
      object-design goal
  - id: o3
    content: Apply the subtractive rules before creating the 3D boundaries
  - id: o4
    content: Use warm-color cubes to determine the area's structural boundaries
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c13-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c13-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: missing-step
tier: Medium
anchor:
  heading: rule-groups-within-object-design
  position: after
concepts:
  - object design stages
  - additive and subtractive object rules
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Fill the missing steps in the object design rules pipeline
validator:
  kind: mapping
  ref: 05-adaptive-virtual-gallery-grammar-medium-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c13-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c13-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c14-m1
version: 1
brokenState:
  - title: Navigation stage
    iconKeyword: alert
    value: sL=3 not applied after layout and object design
  - title: Area connections
    iconKeyword: warning
    value: openings between adjacent areas are missing
  - title: Reception links
    iconKeyword: error
    value: hyperlinks between reception areas and floors are unavailable
  - title: Movement paths
    iconKeyword: route
    value: gallery and adjacent-area paths are missing
tools:
  - id: t1
    title: Activate navigation stage
    iconKeyword: layers
    action: Apply navigation rules after layout and object design
  - id: t2
    title: Restore openings
    iconKeyword: door
    action: Reconnect adjacent areas through openings
  - id: t3
    title: Link reception areas
    iconKeyword: link
    action: Add hyperlinks between reception areas
  - id: t4
    title: Link reception floors
    iconKeyword: stairs
    action: Add hyperlinks between different floors of each reception area
  - id: t5
    title: Lay circulation paths
    iconKeyword: route
    action: Add paths between adjacent areas and inside gallery areas
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c14-m1
version: 1
kind: sequence
correctSequence:
  - t1
  - t2
  - t3
  - t4
  - t5
hints:
  - id: hint-1
    matcher:
      toolId: t4
    hint: >-
      Connect reception floors only after the reception areas themselves are
      linked.
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c14-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: complex-system-repair
tier: Medium
anchor:
  heading: additive-and-subtractive-navigation-rules
  position: after
concepts:
  - hybrid navigation
  - adaptive navigation rules
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Multiple navigation indicators are failing — find the root cause sequence.
validator:
  kind: sequence
  ref: 05-adaptive-virtual-gallery-grammar-medium-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c14-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c14-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c15-m1
version: 1
question: Why does the interaction-rule grammar not need separate subtractive rules?
options:
  - id: a
    content: >-
      Because interactive behaviors are stored as object attributes, so they
      disappear automatically when the related object is removed or changed.
  - id: b
    content: >-
      Because interaction rules only activate hyperlinks and cannot assign
      behaviors to objects.
  - id: c
    content: >-
      Because subtractive rules are unnecessary when all six interaction rules
      apply to every object in the environment.
  - id: d
    content: >-
      Because object removal is handled by a separate interaction stage that
      replaces subtractive rules.
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c15-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c15-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: multiple-choice
tier: Medium
anchor:
  heading: interaction-rule-types
  position: after
concepts:
  - interaction rule structure
  - object-dependent behavior
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 05-adaptive-virtual-gallery-grammar-medium-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c15-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c15-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c16-m1
version: 1
items:
  - id: i1
    content: Generate the layout
  - id: i2
    content: Convert the layout into 3D bounded areas and place purposeful objects
  - id: i3
    content: Add paths and hyperlinks for circulation
  - id: i4
    content: >-
      Attach behaviors to frames, installations, documents, projectors, and
      hyperlinks
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c16-m1
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
id: 05-adaptive-virtual-gallery-grammar-medium-c16-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: sequence-builder
tier: Medium
anchor:
  heading: 16-the-full-rule-system-architecture
  position: after
concepts:
  - staged design pipeline
  - application order of rule systems
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From layout generation to connected behaviors: the correct sequence of the
  full rule-system architecture
validator:
  kind: sequence
  ref: 05-adaptive-virtual-gallery-grammar-medium-c16-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c16-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c16-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c16-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-adaptive-virtual-gallery-grammar-medium-c8-m1
version: 1
categories:
  - id: composition-operation
    label: Composition Operation
  - id: unimplemented-operation
    label: Possible but Unimplemented Operation
  - id: design-consistency
    label: Shared Design Consistency
items:
  - id: i1
    content: Adding a modular object to revise the gallery composition
  - id: i2
    content: >-
      Replacing one object with another as a possible operation not shown in the
      example
  - id: i3
    content: >-
      Keeping a recognizable interaction style while individual gallery designs
      vary
  - id: i4
    content: Subtracting an object from the virtual gallery
  - id: i5
    content: Transforming an object's properties as a noted but unimplemented operation
  - id: i6
    content: Maintaining a recognizable navigation style across the gallery family
:::

:::mechanic-private
id: 05-adaptive-virtual-gallery-grammar-medium-c8-m1
version: 1
kind: mapping
matches:
  i1: composition-operation
  i2: unimplemented-operation
  i3: design-consistency
  i4: composition-operation
  i5: unimplemented-operation
  i6: design-consistency
:::

:::mechanic
schemaVersion: 1
id: 05-adaptive-virtual-gallery-grammar-medium-c8-m1
version: 1
lessonSlug: 05-adaptive-virtual-gallery-grammar-medium
type: quick-classification
tier: Medium
anchor:
  heading: 7-design-composition-logic
  position: after
concepts:
  - dynamic composition of modular virtual-world objects
  - variation within a shared design language
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each gallery-design idea: Composition Operation, Possible but
  Unimplemented Operation, or Shared Design Consistency
validator:
  kind: mapping
  ref: 05-adaptive-virtual-gallery-grammar-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-adaptive-virtual-gallery-grammar-medium-c8-m1:public
privateValidatorRef: 05-adaptive-virtual-gallery-grammar-medium-c8-m1:private
rewardIdentity: 05-adaptive-virtual-gallery-grammar-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],"sectionMechanics":[{"mechanicType":"abstract-transfer","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-the-virtual-gallery-as-an-autonomous-medium"},{"mechanicType":"evidence-match","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-social-and-historical-background"},{"mechanicType":"system-simulation","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"3-the-adaptive-virtual-gallery-model"},{"mechanicType":"parameter-tuner","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"4-what-triggers-adaptation"},{"mechanicType":"sequence-builder","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"5-the-four-part-grammar"},{"mechanicType":"multiple-choice","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"6-the-rule-schema-and-state-labels"},{"mechanicType":"quick-classification","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"7-design-composition-logic"},{"mechanicType":"constraint-construction","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"exhibition-content-types"},{"mechanicType":"evidence-match","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"9-layout-state-labels"},{"mechanicType":"prediction","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"10-additive-and-subtractive-layout-logic"},{"mechanicType":"tradeoff-decision","__chunkIndex":12,"__version":1,"__tier":"Medium","__anchorId":"12-strategic-insights-from-the-layout-system"},{"mechanicType":"missing-step","__chunkIndex":13,"__version":1,"__tier":"Medium","__anchorId":"rule-groups-within-object-design"},{"mechanicType":"complex-system-repair","__chunkIndex":14,"__version":1,"__tier":"Medium","__anchorId":"additive-and-subtractive-navigation-rules"},{"mechanicType":"multiple-choice","__chunkIndex":15,"__version":1,"__tier":"Medium","__anchorId":"interaction-rule-types"},{"mechanicType":"sequence-builder","__chunkIndex":16,"__version":1,"__tier":"Medium","__anchorId":"16-the-full-rule-system-architecture"}]}
:::