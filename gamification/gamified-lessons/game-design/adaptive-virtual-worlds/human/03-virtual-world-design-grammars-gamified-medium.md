:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c2-m1
version: 1
question: >-
  Why is a generative design grammar especially useful for creating 3D virtual
  worlds?
options:
  - id: a
    content: >-
      It encodes a coherent design logic that can generate and analyze places
      using objects, properties, and behaviors.
  - id: b
    content: >-
      It ensures that every virtual place uses the same fixed arrangement of
      geometric shapes.
  - id: c
    content: >-
      It replaces design rules with manually constructed environments that are
      unique and unrelated.
  - id: d
    content: >-
      It focuses only on extracting visual shapes from existing places without
      generating new designs.
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c2-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 1-what-a-generative-design-grammar-is
  position: after
concepts:
  - generative design grammar
  - virtual world place-making
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 03-virtual-world-design-grammars-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c2-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c2-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c3-m1
version: 1
items:
  - id: i1
    content: Define a vocabulary of shapes
  - id: i2
    content: Define the spatial relations common to the style
  - id: i3
    content: Define rules that act on those relations
  - id: i4
    content: Provide an initial shape
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c3-m1
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
id: 03-virtual-world-design-grammars-medium-c3-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: sequence-builder
tier: Medium
anchor:
  heading: typical-steps-for-building-a-style-grammar
  position: after
concepts:
  - shape grammar construction
  - shape grammar components
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From vocabulary to complete grammar: the correct sequence for building a style
  grammar
validator:
  kind: sequence
  ref: 03-virtual-world-design-grammars-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c3-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c3-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c4-m1
version: 1
scenario: >-
  You are designing a virtual world where places are composed of objects,
  transformed by rules, and shaped by how users move through them. Choose the
  strategy that best fits the chapter's framework.
options:
  - id: a
    content: >-
      Encode goals and constraints directly into restricted, context-sensitive
      grammar rules.
    pros:
      - makes outputs more predictable
      - supports rule-governed object composition
      - can express behavior and user movement
    cons:
      - requires clear goals during grammar construction
  - id: b
    content: >-
      Generate broadly with a grammar, then use human judgment or automated
      evaluation to filter results.
    pros:
      - allows broader exploration
      - can postpone selection decisions
    cons:
      - selection happens later
      - less direct control over outputs
      - depends on evaluation after generation
  - id: c
    content: >-
      Generate freely with a genetic algorithm and select the most promising
      virtual places afterward.
    pros:
      - supports broad exploration
      - can use later evaluation
    cons:
      - does not use restricted grammar rules as the primary control
      - may require search and testing after generation
      - does not directly represent rule-governed transformations
  - id: d
    content: >-
      Use cellular automata or swarm intelligence to generate places without
      explicit grammar constraints.
    pros:
      - provides an alternative generative system
      - may produce varied results
    cons:
      - does not directly encode the chapter's preferred control strategy
      - >-
        is less clearly suited to compositions of objects and rule-governed
        transformations
      - may leave behavior and user movement less explicitly represented
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c4-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 1
  d: 0
hints:
  b: >-
    Broader exploration is useful, but the framework favors controlling outcomes
    through rules before generation.
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c4-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: 4-why-grammars-fit-virtual-worlds
  position: after
concepts:
  - encoding constraints directly into grammar rules
  - generate-then-evaluate strategy
  - grammar suitability for virtual worlds
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 03-virtual-world-design-grammars-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 03-virtual-world-design-grammars-medium-c4-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c4-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c6-m1
version: 1
sourceDomain: Virtual world design
targetDomain: Architectural design
scenario: >-
  Transfer the distinction between syntax and semantics to architectural design.
  Which approach actually works?
options:
  - id: a
    content: >-
      Design the building's spatial composition and visible elements together
      with how people navigate it, interpret it, and use its features.
  - id: b
    content: >-
      Focus mainly on the building's spatial composition, then add a few
      usability features without treating them as part of the design.
  - id: c
    content: >-
      Copy the building's visual arrangement while assuming that use, movement,
      and meaning will emerge automatically.
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c6-m1
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
      Check whether the approach treats spatial form and supported behavior as
      inseparable parts of design.
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c6-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: interpretation-syntax-and-semantics
  position: after
concepts:
  - syntax and semantics
  - form and behavior
  - inseparable design phases
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 03-virtual-world-design-grammars-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 03-virtual-world-design-grammars-medium-c6-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c6-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c7-m1
version: 1
scenario: >-
  A framework for designing virtual worlds addresses both place-like visual
  structure and behavior assigned to support intended activities. It also draws
  on grammar theories that extend beyond form toward semantics.
theories:
  - id: th-a
    content: >-
      The framework addresses visual/spatial requirements through strengths
      inherited from architectural shape grammars.
  - id: th-b
    content: >-
      The framework addresses non-visual/spatial requirements by assigning
      behavior, with appearance and function artificially coupled.
  - id: th-c
    content: >-
      The framework addresses semantic design through grammar approaches such as
      description and transformation grammars.
clues:
  - id: c1
    content: >-
      Palladian, Mughul Gardens, Prairie Houses, and Siza Houses are examples of
      grammars associated with this requirement.
  - id: c2
    content: Touching a virtual canvas in a gallery causes a digital image to appear.
  - id: c3
    content: >-
      In virtual worlds, designers can connect appearance and behavior in ways
      impossible in physical environments.
  - id: c4
    content: >-
      This requirement concerns assigning behavior to support an intended
      activity.
  - id: c5
    content: >-
      Description functions, description grammars, discursive grammar, and
      transformation grammar belong to this line of influence.
  - id: c6
    content: >-
      These requirements resemble architectural design problems because virtual
      worlds often use place-like metaphors.
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c7-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-b
  c4: th-b
  c5: th-c
  c6: th-a
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: th-a
    hint: >-
      Read c3 again: it describes the virtual-world distinction between
      appearance and behavior, so it supports the behavior-focused theory.
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c7-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: evidence-match
tier: Medium
anchor:
  heading: non-visual-spatial-requirements
  position: after
concepts:
  - visual and non-visual/spatial requirements
  - artificial coupling of appearance and behavior
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 03-virtual-world-design-grammars-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c7-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c7-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c8-m1
version: 1
items:
  - id: i1
    content: Apply layout rules to define the place
  - id: i2
    content: Apply object design rules to configure the place with objects
  - id: i3
    content: Apply navigation rules to support movement
  - id: i4
    content: Apply interaction rules to enable behavior
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c8-m1
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
id: 03-virtual-world-design-grammars-medium-c8-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: sequence-builder
tier: Medium
anchor:
  heading: rule-application-order
  position: after
concepts:
  - formal grammar framework
  - rule application order
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  From defining the place to enabling behavior: the correct sequence of design
  rule application
validator:
  kind: sequence
  ref: 03-virtual-world-design-grammars-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c8-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c8-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c9-m1
version: 1
question: >-
  A rule uses the structure LHO + sL → RHO. Which interpretation best explains
  what this extension allows?
options:
  - id: a
    content: >-
      It allows a rule to transform objects based on their arrangements,
      properties, and state labels, including behavior even when appearance
      stays the same.
  - id: b
    content: >-
      It ensures that every rule changes the geometry or placement of an object
      while leaving its behavior unchanged.
  - id: c
    content: >-
      It replaces the left-hand-side object with a right-hand-side object, while
      state labels only describe the object's visual shape.
  - id: d
    content: >-
      It limits rules to changing object composition, because scripted behaviors
      cannot be part of a design rule.
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c9-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c9-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 10-general-structure-of-a-design-rule
  position: after
concepts:
  - virtual-world design rule structure
  - appearance and behavior transformation
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 03-virtual-world-design-grammars-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c9-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c9-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c10-m1
version: 1
scenario: >-
  A virtual-world design already contains a reception area. The current design
  need calls for generating a gallery under specification g1. The system must
  determine which rule can apply and what it should produce first.
startNodeId: n1
nodes:
  - id: n1
    question: What should the system verify before applying the layout rule?
    options:
      - id: a1
        content: >-
          Confirm that the reception area is recognized and that the state
          labels match the gallery requirement g1.
        nextNodeId: n2
      - id: b1
        content: >-
          Apply the rule whenever a reception area exists, regardless of the
          current design need.
        nextNodeId: null
      - id: c1
        content: >-
          Check only whether the virtual space can satisfy physical
          architectural constraints.
        nextNodeId: null
  - id: n2
    question: Once the conditions match, what does the layout rule do first?
    options:
      - id: a2
        content: >-
          Create the structural basis by adding a gallery area adjacent to the
          reception area and marking the layout phase with sL=1.
        nextNodeId: n3
      - id: b2
        content: >-
          Activate visitor behavior requirements before defining any virtual
          area.
        nextNodeId: null
      - id: c2
        content: >-
          Generate exhibition styling first and leave the spatial structure for
          a later rule category.
        nextNodeId: null
  - id: n3
    question: How should the specific gallery-generation context be represented?
    options:
      - id: a3
        content: >-
          Use sL=g1 to identify the specific gallery-generation context while
          allowing adjacency to remain flexible or hyperlinked.
        nextNodeId: null
      - id: b3
        content: >-
          Use a physical-distance constraint to ensure the gallery follows
          conventional architectural adjacency.
        nextNodeId: null
      - id: c3
        content: >-
          Skip contextual labeling because recognizing the reception area is
          sufficient for every gallery rule.
        nextNodeId: null
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c10-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c10-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: prediction
tier: Medium
anchor:
  heading: required-conditions
  position: after
concepts:
  - state labels
  - layout rules
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: What happens next in this layout-rule situation?
validator:
  kind: exact
  ref: 03-virtual-world-design-grammars-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 03-virtual-world-design-grammars-medium-c10-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c10-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c11-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Apply layout rules to establish the place's layout.
  - id: s2
    isMissing: true
  - id: s3
    content: Recognize connectivity within the generated place and to other places.
  - id: s4
    isMissing: true
  - id: s5
    content: >-
      Apply interaction rules as the final rule set, assigning scripted
      behaviors to selected objects.
options:
  - id: o1
    content: >-
      Apply object design rules to add boundaries, furniture, displays, cues,
      and interior arrangements.
  - id: o2
    content: >-
      Choose appropriate navigation methods, such as spatial elements, guides,
      or hyperlinks, based on the access structure.
  - id: o3
    content: Apply interaction rules before deciding how users can move between places.
  - id: o4
    content: >-
      Add visual objects only after scripting all environmental and social
      behaviors.
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c11-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c11-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: missing-step
tier: Medium
anchor:
  heading: example-effect
  position: after
concepts:
  - rule-category order
  - object design and navigation logic
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Fill the missing steps in the virtual-place rule application pipeline
validator:
  kind: mapping
  ref: 03-virtual-world-design-grammars-medium-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c11-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c11-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c12-m1
version: 1
attributes:
  - id: cost
    label: Generation Cost
  - id: control
    label: Control
  - id: context
    label: Context Matching
components:
  - id: c1
    content: Restricted rules — limit the available transformations
    metrics:
      cost: 3
      control: 4
      context: 2
  - id: c2
    content: Special state labels — associate rules with design contexts
    metrics:
      cost: 2
      control: 3
      context: 5
  - id: c3
    content: >-
      Four rule sets — apply layout, object design, navigation, and interaction
      rules
    metrics:
      cost: 4
      control: 4
      context: 2
  - id: c4
    content: >-
      Design states — define an initial design and a terminating final design
      state
    metrics:
      cost: 2
      control: 2
      context: 1
  - id: c5
    content: Real-time generation — produce virtual places during interaction
    metrics:
      cost: 5
      control: 3
      context: 2
requirements:
  - attributeId: cost
    operator: <=
    value: 12
  - attributeId: control
    operator: '>='
    value: 13
  - attributeId: context
    operator: '>='
    value: 10
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c12-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: cost
    hint: Check the total generation cost before confirming the other constraints.
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c12-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: constraint-construction
tier: Medium
anchor:
  heading: 19-why-search-and-test-is-rejected
  position: after
concepts:
  - context-driven rule application
  - predictable generative design
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Find the right combination to meet the constraints.
validator:
  kind: invariants
  ref: 03-virtual-world-design-grammars-medium-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 03-virtual-world-design-grammars-medium-c12-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c12-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-virtual-world-design-grammars-medium-c5-m1
version: 1
categories:
  - id: object-type
    label: Object Type
  - id: visual-spatial
    label: Visual/Spatial Role
  - id: functional
    label: Functional Role
items:
  - id: i1
    content: A gallery that serves as the whole place container
  - id: i2
    content: A wall whose 3D appearance helps create an inhabitable environment
  - id: i3
    content: An information desk that supports an activity in the place
  - id: i4
    content: Scripted actions that enable users to interact with an object
  - id: i5
    content: A place metaphor that makes the environment understandable as a place
  - id: i6
    content: Behaviors that enable interaction between users
:::

:::mechanic-private
id: 03-virtual-world-design-grammars-medium-c5-m1
version: 1
kind: mapping
matches:
  i1: object-type
  i2: visual-spatial
  i3: object-type
  i4: functional
  i5: visual-spatial
  i6: functional
:::

:::mechanic
schemaVersion: 1
id: 03-virtual-world-design-grammars-medium-c5-m1
version: 1
lessonSlug: 03-virtual-world-design-grammars-medium
type: quick-classification
tier: Medium
anchor:
  heading: 5-virtual-place-as-objects-in-relations
  position: after
concepts:
  - objects in relations
  - visual form
  - functional behavior
  - place metaphor
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each virtual-place design concept: Object Type, Visual/Spatial Role,
  or Functional Role
validator:
  kind: mapping
  ref: 03-virtual-world-design-grammars-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-virtual-world-design-grammars-medium-c5-m1:public
privateValidatorRef: 03-virtual-world-design-grammars-medium-c5-m1:private
rewardIdentity: 03-virtual-world-design-grammars-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-what-a-generative-design-grammar-is"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"typical-steps-for-building-a-style-grammar"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"4-why-grammars-fit-virtual-worlds"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"5-virtual-place-as-objects-in-relations"},{"mechanicType":"abstract-transfer","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"interpretation-syntax-and-semantics"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"non-visual-spatial-requirements"},{"mechanicType":"sequence-builder","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"rule-application-order"},{"mechanicType":"multiple-choice","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"10-general-structure-of-a-design-rule"},{"mechanicType":"prediction","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"required-conditions"},{"mechanicType":"missing-step","__chunkIndex":11,"__version":1,"__tier":"Medium","__anchorId":"example-effect"},{"mechanicType":"constraint-construction","__chunkIndex":12,"__version":1,"__tier":"Medium","__anchorId":"19-why-search-and-test-is-rejected"}]}
:::