:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c2-m1
version: 1
question: >-
  Which example best fits the definition of a virtual world described in the
  section?
options:
  - id: a
    content: >-
      Several people meet in a real-time shared environment, communicate through
      avatars, and manipulate objects in that environment.
  - id: b
    content: >-
      Several people exchange messages and video in real time, but cannot
      interact with a shared virtual setting.
  - id: c
    content: >-
      One person explores an immersive digital simulation designed for an
      individual experience.
  - id: d
    content: >-
      Users browse a website containing interactive pages and discussion posts
      that are mostly accessed independently.
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 02-virtual-worlds-as-places-medium-c2-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 1-what-virtual-worlds-are
  position: after
concepts:
  - defining features of virtual worlds
  - differences from nearby digital media
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 02-virtual-worlds-as-places-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 02-virtual-worlds-as-places-medium-c2-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c2-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c3-m1
version: 1
items:
  - id: i1
    content: Cyberspace emerges as a new domain for communication
  - id: i2
    content: Cyberspace becomes a space for imagination
  - id: i3
    content: Cyberspace develops into a new form of social organization
  - id: i4
    content: >-
      The concept expands into human-computer interaction, artificial
      intelligence, graphics, VR/AR, collaboration, and design
  - id: i5
    content: >-
      Virtual worlds are understood as supplementing rather than replacing
      physical reality
  - id: i6
    content: >-
      Ubiquitous computing is recognized as a bridge between virtual and
      physical environments
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c3-m1
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
id: 02-virtual-worlds-as-places-medium-c3-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: sequence-builder
tier: Medium
anchor:
  heading: interface-milestones
  position: after
concepts:
  - conceptual trajectory of virtual worlds
  - relationship between virtual and physical environments
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From cyberspace as an idea to virtual worlds as connected environments: the
  correct conceptual sequence
validator:
  kind: sequence
  ref: 02-virtual-worlds-as-places-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 02-virtual-worlds-as-places-medium-c3-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c3-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c4-m1
version: 1
scenario: >-
  A design team is choosing metaphors to explain and shape a new virtual world.
  Each metaphor highlights certain aspects of digital systems while leaving
  others less visible.
theories:
  - id: th-a
    content: >-
      Giant brain — computing is mainly understood through intelligence and
      processing power.
  - id: th-b
    content: >-
      Information superhighway — computing is mainly understood through
      connectivity and information flow.
  - id: th-c
    content: >-
      Multiple metaphors — computing is understood through several complementary
      views, including knowledge, communication, commerce, and digital worlds.
clues:
  - id: c1
    content: This metaphor helped frame early computing power.
  - id: c2
    content: >-
      This metaphor emphasizes movement between connected places, but does not
      describe lived human effects very well.
  - id: c3
    content: >-
      This approach treats computing as shared knowledge, communication,
      property and commerce, and virtual community.
  - id: c4
    content: This metaphor helped explain connectivity and information flow.
  - id: c5
    content: >-
      This approach requires combining several viewpoints instead of relying on
      one metaphor.
  - id: c6
    content: This metaphor did not successfully predict broader computing futures.
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c4-m1
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
      theoryId: th-a
    hint: >-
      Read c3 carefully: it lists several distinct roles of computing, not just
      intelligence or processing power.
:::

:::mechanic
schemaVersion: 1
id: 02-virtual-worlds-as-places-medium-c4-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: evidence-match
tier: Medium
anchor:
  heading: computing-metaphors-reviewed-by-stefik
  position: after
concepts:
  - design metaphors as cognitive tools
  - Stefik's computing metaphors
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 02-virtual-worlds-as-places-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 02-virtual-worlds-as-places-medium-c4-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c4-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c5-m1
version: 1
sourceDomain: Physical place theory
targetDomain: Information architecture
scenario: >-
  Transfer the core logic from physical place theory to information
  architecture. Which approach actually works?
options:
  - id: a
    content: >-
      Design the information environment as an inhabited place, connecting
      structure with user activity, orientation, context, and meaning.
  - id: b
    content: >-
      Organize information clearly and add some contextual cues, while treating
      user activity and social meaning as secondary.
  - id: c
    content: >-
      Arrange information items efficiently but focus mainly on their locations
      and visual presentation.
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c5-m1
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
      Check whether this preserves the idea that a place combines structure with
      activity, human presence, and meaning.
:::

:::mechanic
schemaVersion: 1
id: 02-virtual-worlds-as-places-medium-c5-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: reverse-influence
  position: after
concepts:
  - place as an inhabited environment
  - social and cultural meaning in design
  - information architecture
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 02-virtual-worlds-as-places-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 02-virtual-worlds-as-places-medium-c5-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c5-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c6-m1
version: 1
categories:
  - id: spatial-context
    label: Spatial Context
  - id: lived-experience
    label: Lived Experience
  - id: digital-possibility
    label: Digital Possibility
items:
  - id: i1
    content: >-
      Designing distinct places whose relationships help users know where they
      are
  - id: i2
    content: Shaping a place around the online activities it is meant to host
  - id: i3
    content: >-
      Creating the feeling of “being there” through engagement with objects and
      people
  - id: i4
    content: Using hyperlink-style navigation to connect places
  - id: i5
    content: Making an environment respond proactively to users
  - id: i6
    content: >-
      Supporting orientation, memory, and differentiation through relative
      location
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c6-m1
version: 1
kind: mapping
matches:
  i1: spatial-context
  i2: lived-experience
  i3: lived-experience
  i4: digital-possibility
  i5: digital-possibility
  i6: spatial-context
:::

:::mechanic
schemaVersion: 1
id: 02-virtual-worlds-as-places-medium-c6-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: quick-classification
tier: Medium
anchor:
  heading: 4-uniqueness-of-virtual-places
  position: after
concepts:
  - functional virtual places
  - sense of location
  - sense of presence
  - uniqueness of virtual places
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each virtual place-making characteristic: Spatial Context, Lived
  Experience, or Digital Possibility
validator:
  kind: mapping
  ref: 02-virtual-worlds-as-places-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 02-virtual-worlds-as-places-medium-c6-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c6-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c7-m1
version: 1
items:
  - id: i1
    content: 'MUDs: text-based worlds using typed commands'
  - id: i2
    content: 'MOOs: text worlds extended with object-oriented structures'
  - id: i3
    content: '2D graphical worlds: images, icons, and maps enhanced text interaction'
  - id: i4
    content: >-
      3D virtual worlds: modeled environments with avatar interaction and
      scripting
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c7-m1
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
id: 02-virtual-worlds-as-places-medium-c7-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: sequence-builder
tier: Medium
anchor:
  heading: muds-and-moos
  position: after
concepts:
  - platform generations
  - evolution of interaction modes and constraints
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From text commands to modeled environments: the correct sequence of
  virtual-world platform generations
validator:
  kind: sequence
  ref: 02-virtual-worlds-as-places-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 02-virtual-worlds-as-places-medium-c7-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c7-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c8-m1
version: 1
attributes:
  - id: accessibility
    label: Design accessibility
  - id: flexibility
    label: Flexibility
  - id: collaboration
    label: Collaboration
components:
  - id: active-worlds
    content: >-
      Active Worlds — construct places from an object library with triggers,
      commands, and SDK extensions
    metrics:
      accessibility: 8
      flexibility: 3
      collaboration: 2
  - id: second-life
    content: >-
      Second Life — build with geometric primitives and interact through Linden
      Scripting Language
    metrics:
      accessibility: 5
      flexibility: 8
      collaboration: 5
  - id: open-cobalt
    content: >-
      Open Cobalt — create virtual places with shared applications and real-time
      object sharing
    metrics:
      accessibility: 5
      flexibility: 6
      collaboration: 9
  - id: 3dvia-studio
    content: >-
      3DVIA Studio — edit models, import large datasets, and create custom
      interactive worlds through graphical programming
    metrics:
      accessibility: 2
      flexibility: 9
      collaboration: 6
requirements:
  - attributeId: accessibility
    operator: <=
    value: 12
  - attributeId: flexibility
    operator: '>='
    value: 14
  - attributeId: collaboration
    operator: '>='
    value: 14
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c8-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: flexibility
    hint: >-
      Check the flexibility and collaboration totals before confirming
      accessibility.
:::

:::mechanic
schemaVersion: 1
id: 02-virtual-worlds-as-places-medium-c8-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: constraint-construction
tier: Medium
anchor:
  heading: shared-traits-of-most-3d-worlds
  position: after
concepts:
  - 3D platform comparison
  - design tradeoffs
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Find the right combination to meet the constraints.
validator:
  kind: invariants
  ref: 02-virtual-worlds-as-places-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 02-virtual-worlds-as-places-medium-c8-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c8-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 02-virtual-worlds-as-places-medium-c9-m1
version: 1
scenario: >-
  Your team can build a technically impressive 3D environment, but it needs to
  become a coherent, legible, purposeful, and meaningful place. Choose the
  design strategy that best addresses the deeper strategic problem.
options:
  - id: a
    content: Prioritize geometry and technical world construction
    pros:
      - creates a tangible 3D environment
      - supports visible spatial detail
    cons:
      - does not ensure meaningful place design
      - may leave the environment incoherent
      - focuses on assembly rather than experience
  - id: b
    content: >-
      Adopt a formal method for designing virtual worlds as places, then connect
      it to construction workflows
    pros:
      - directly addresses the missing design methods
      - separates place meaning from mere geometry
      - can make places more coherent and purposeful
    cons:
      - requires developing new formal approaches
      - may complicate existing production practices
  - id: c
    content: >-
      Keep geometry design and object behavior scripting as separate manual
      tasks
    pros:
      - preserves control over geometry
      - preserves control over object behaviors
    cons:
      - retains the cumbersome workflow
      - forces designers to solve two difficult problems at once
      - does not close the construction-design gap
  - id: d
    content: Add more platforms and tools without changing the design process
    pros:
      - may expand technical capabilities
      - can provide more construction options
    cons:
      - does not address the absence of formal design methods
      - may increase workflow complexity
      - platform availability alone does not create meaningful places
:::

:::mechanic-private
id: 02-virtual-worlds-as-places-medium-c9-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
  c: 2
  d: 0
hints:
  c: >-
    This keeps the two difficult tasks separate, but ask whether it resolves the
    gap between construction and place design.
:::

:::mechanic
schemaVersion: 1
id: 02-virtual-worlds-as-places-medium-c9-m1
version: 1
lessonSlug: 02-virtual-worlds-as-places-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 8-the-major-strategic-design-problem
  position: after
concepts:
  - formal methods for virtual place design
  - gap between world construction and place design
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 02-virtual-worlds-as-places-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 02-virtual-worlds-as-places-medium-c9-m1:public
privateValidatorRef: 02-virtual-worlds-as-places-medium-c9-m1:private
rewardIdentity: 02-virtual-worlds-as-places-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-what-virtual-worlds-are"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"interface-milestones"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"computing-metaphors-reviewed-by-stefik"},{"mechanicType":"abstract-transfer","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"reverse-influence"},{"mechanicType":"quick-classification","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"4-uniqueness-of-virtual-places"},{"mechanicType":"sequence-builder","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"muds-and-moos"},{"mechanicType":"constraint-construction","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"shared-traits-of-most-3d-worlds"},{"mechanicType":"tradeoff-decision","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"8-the-major-strategic-design-problem"}]}
:::