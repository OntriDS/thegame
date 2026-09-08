:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c2-m1
version: 1
question: >-
  Why does the lesson argue that virtual worlds should be designed as adaptive
  places rather than merely as 3D scenes?
options:
  - id: a
    content: >-
      Because people inhabit virtual worlds through shifting attention,
      movement, interpretation, and physical-world context, so the environment
      should respond to what inhabitants need.
  - id: b
    content: >-
      Because virtual worlds should reproduce physical places as accurately as
      possible to prevent users from losing their sense of reality.
  - id: c
    content: >-
      Because the main advantage of virtual worlds is that they can display more
      detailed visual environments than physical places.
  - id: d
    content: >-
      Because treating a virtual world as a place mainly helps designers copy
      familiar physics, construction methods, and geography.
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c2-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: multiple-choice
tier: Medium
anchor:
  heading: 1-the-core-thesis-virtual-worlds-should-be-adaptive-places
  position: after
concepts:
  - adaptive places
  - embodied virtual experience
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Choose the correct answer.
validator:
  kind: exact
  ref: 01-adaptive-virtual-world-design-medium-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c2-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c2-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c3-m1
version: 1
categories:
  - id: mostly-physical
    label: Mostly Physical
  - id: hybrid-interwoven
    label: Hybrid/Interwoven
  - id: mostly-digital
    label: Mostly Digital
items:
  - id: i1
    content: An environment with no digital content at all
  - id: i2
    content: Using Google Glass to see digital content overlaid onto physical reality
  - id: i3
    content: A fully digital persona inhabiting a virtual world such as Second Life
  - id: i4
    content: >-
      Participating in World of Warcraft while remaining physically located in a
      room
  - id: i5
    content: Using Sifteo Cubes, where physical gestures modify digital content
  - id: i6
    content: >-
      Being interrupted in a digital interaction when someone enters the
      physical room
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c3-m1
version: 1
kind: mapping
matches:
  i1: mostly-physical
  i2: hybrid-interwoven
  i3: mostly-digital
  i4: hybrid-interwoven
  i5: hybrid-interwoven
  i6: hybrid-interwoven
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c3-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: quick-classification
tier: Medium
anchor:
  heading: 2-the-boundary-between-physical-and-digital-is-fluid
  position: after
concepts:
  - fluid boundary between physical and digital experience
  - hybrid environments and shifting immersion
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Classify each physical-digital experience: Mostly Physical, Hybrid/Interwoven,
  or Mostly Digital
validator:
  kind: mapping
  ref: 01-adaptive-virtual-world-design-medium-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c3-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c3-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c4-m1
version: 1
scenario: >-
  Your team must choose a design direction for a virtual world intended to
  support broad social, educational, and practical activity.
options:
  - id: a
    content: Adaptive place-based design for accessible large-scale participation
    pros:
      - supports real human use
      - can lower access barriers
      - works across geographic distances
    cons:
      - requires careful adaptive design
      - may be difficult to balance competing needs
  - id: b
    content: Focus on immersive avatar-based social interaction
    pros:
      - encourages presence
      - supports role-playing and collaboration
    cons:
      - may not reach broader mainstream uses
      - can emphasize experience over practical access
      - does not by itself address large-scale participation
  - id: c
    content: Build primarily for very large online audiences
    pros:
      - can serve many participants
      - fits activities such as large classes or crowdsourcing
    cons:
      - scale alone does not ensure good design
      - may overlook place-based human needs
  - id: d
    content: Replicate physical spaces as closely as possible
    pros:
      - preserves familiar spatial affordances
    cons:
      - may retain physical cost barriers
      - can remain limited by geography
      - may not take full advantage of virtual scalability
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c4-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 2
  c: 2
  d: 1
hints:
  b: >-
    Immersion matters, but consider whether the design also addresses access,
    scale, and real human use.
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c4-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: tradeoff-decision
tier: Medium
anchor:
  heading: social-organization-beyond-geography
  position: after
concepts:
  - access and affordances
  - scalability
  - social organization beyond geography
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 01-adaptive-virtual-world-design-medium-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c4-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c4-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c5-m1
version: 1
sourceDomain: Architecture and place-making
targetDomain: Virtual environment design
scenario: >-
  Transfer the core logic from architectural place-making to virtual
  environments. Which approach actually works?
options:
  - id: a
    content: >-
      Design digital environments around meaning, activity, orientation,
      identity, social life, and planned change over time.
  - id: b
    content: >-
      Apply architectural principles to virtual environments while treating
      dynamic change mainly as a later technical feature.
  - id: c
    content: >-
      Focus primarily on 3D modeling, rendering infrastructure, and platform
      technology to create meaningful environments.
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c5-m1
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
      Check whether adaptation over time is treated as part of the design
      material rather than as a later technical feature.
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c5-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: abstract-transfer
tier: Medium
anchor:
  heading: 4-why-design-places-instead-of-only-3d-worlds
  position: after
concepts:
  - place-making
  - digital content as architecture
  - adaptation over time
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 01-adaptive-virtual-world-design-medium-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c5-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c5-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c6-m1
version: 1
scenario: >-
  The web design analogy explains a virtual world as a layered system. Each
  layer contributes something different: what exists, how it is arranged, what
  can happen, or how the world responds to users.
theories:
  - id: th-a
    content: >-
      The world is mainly defined by its content and structure: the objects,
      forms, and entities that exist.
  - id: th-b
    content: >-
      The world is mainly defined by its arrangement and behavior: how objects
      look, relate spatially, and respond through interaction rules.
  - id: th-c
    content: >-
      The world is mainly defined by adaptation: an agent model senses users and
      changes the environment in response.
clues:
  - id: c1
    content: This layer answers, “What objects or entities are present in the world?”
  - id: c2
    content: >-
      This layer determines spatial arrangement and visual character through
      layout and object design rules.
  - id: c3
    content: This layer senses users and modifies the environment in response to them.
  - id: c4
    content: >-
      This layer defines dynamics, behavior, and responsiveness—what can happen
      in the environment.
  - id: c5
    content: >-
      In the analogy, this layer corresponds most directly to HTML content
      structure.
  - id: c6
    content: >-
      This layer corresponds to application logic around a website, wrapped
      around the world’s underlying grammar.
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c6-m1
version: 1
kind: mapping
matches:
  c1: th-a
  c2: th-b
  c3: th-c
  c4: th-b
  c5: th-a
  c6: th-c
hints:
  - id: hint-1
    matcher:
      clueId: c3
      theoryId: wrong-one
    hint: >-
      Focus on the phrase “senses users and modifies the environment”; that
      describes the adaptive layer.
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c6-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: evidence-match
tier: Medium
anchor:
  heading: 5-the-web-design-analogy
  position: after
concepts:
  - layered virtual-world design
  - web design analogy
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Which theory does each clue match?
validator:
  kind: mapping
  ref: 01-adaptive-virtual-world-design-medium-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c6-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c6-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c7-m1
version: 1
attributes:
  - id: cost
    label: Cost
  - id: responsiveness
    label: Responsiveness
  - id: spatialClarity
    label: Spatial clarity
components:
  - id: c1
    content: 3D models — define the objects and content present in the environment
    metrics:
      cost: 2
      responsiveness: 1
      spatialClarity: 1
  - id: c2
    content: Layout rules — organize placement, connections, and spatial patterns
    metrics:
      cost: 3
      responsiveness: 1
      spatialClarity: 3
  - id: c3
    content: >-
      Navigation rules — govern circulation, accessibility, and traversable
      paths
    metrics:
      cost: 3
      responsiveness: 2
      spatialClarity: 4
  - id: c4
    content: >-
      Interaction rules — encode how users, objects, and situations respond to
      actions
    metrics:
      cost: 4
      responsiveness: 4
      spatialClarity: 2
  - id: c5
    content: Agent model — sense user needs and modify the world in response
    metrics:
      cost: 5
      responsiveness: 6
      spatialClarity: 3
requirements:
  - attributeId: cost
    operator: <=
    value: 10
  - attributeId: responsiveness
    operator: '>='
    value: 7
  - attributeId: spatialClarity
    operator: '>='
    value: 4
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c7-m1
version: 1
kind: invariants
hints:
  - id: hint-1
    matcher:
      attributeId: cost
    hint: Check the total cost before verifying responsiveness and spatial clarity.
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c7-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: constraint-construction
tier: Medium
anchor:
  heading: agent-model
  position: after
concepts:
  - design materials
  - adaptive virtual worlds
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: Find the right combination to meet the constraints.
validator:
  kind: invariants
  ref: 01-adaptive-virtual-world-design-medium-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 3
  maxPayloadBytes: 4096
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c7-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c7-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c8-m1
version: 1
scenario: >-
  A team is designing a virtual world with detailed geometry, rich objects, and
  realistic environments. During testing, users notice that the world does not
  change over time or respond differently to their actions and context.
startNodeId: n1
nodes:
  - id: n1
    question: What should the team recognize about the current design?
    options:
      - id: a1
        content: It emphasizes representation but underdevelops adaptation.
        nextNodeId: n2
      - id: b1
        content: >-
          It already provides adaptation because the environment is visually
          detailed.
        nextNodeId: null
      - id: c1
        content: >-
          It mainly needs more objects and geometry before user response
          matters.
        nextNodeId: null
  - id: n2
    question: What capability should the team add to address the problem?
    options:
      - id: a2
        content: >-
          Systems that support change over time, user interaction, and
          context-sensitive response.
        nextNodeId: n3
      - id: b2
        content: A larger collection of static environments that users can inspect.
        nextNodeId: null
      - id: c2
        content: More polished visual effects while keeping the world’s behavior fixed.
        nextNodeId: null
  - id: n3
    question: How should the team frame the design of future virtual worlds?
    options:
      - id: a3
        content: >-
          As systems of response designed from the start, not merely systems of
          display.
        nextNodeId: null
      - id: b3
        content: >-
          As systems of display first, with adaptation added only if time
          remains.
        nextNodeId: null
      - id: c3
        content: >-
          As visually complete worlds where user response is secondary to
          realism.
        nextNodeId: null
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c8-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c8-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: prediction
tier: Medium
anchor:
  heading: 7-representation-versus-adaptation
  position: after
concepts:
  - representation versus adaptation
  - responsive virtual worlds
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: What happens next in this representation-versus-adaptation situation?
validator:
  kind: exact
  ref: 01-adaptive-virtual-world-design-medium-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c8-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c8-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c9-m1
version: 1
categories:
  - id: syntactic
    label: Syntactic Concerns
  - id: semantic
    label: Semantic Concerns
items:
  - id: i1
    content: Visualization
  - id: i2
    content: Navigation
  - id: i3
    content: Object design
  - id: i4
    content: Interaction
  - id: i5
    content: Layout, because it shapes how the world is perceived
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c9-m1
version: 1
kind: mapping
matches:
  i1: syntactic
  i2: semantic
  i3: syntactic
  i4: semantic
  i5: syntactic
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c9-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: quick-classification
tier: Medium
anchor:
  heading: semantic-concerns
  position: after
concepts:
  - syntactic concerns
  - semantic concerns
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: 'Classify each design concern: Syntactic or Semantic'
validator:
  kind: mapping
  ref: 01-adaptive-virtual-world-design-medium-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c9-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c9-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-adaptive-virtual-world-design-medium-c10-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Define rules for generating and organizing design elements
  - id: s2
    isMissing: true
  - id: s3
    content: Wrap a Generative Design Agent around the grammar
  - id: s4
    isMissing: true
  - id: s5
    content: Combine structured generation with user-sensitive adaptation
options:
  - id: o1
    content: Use the grammar to generate arrangements, structures, and behaviors
  - id: o2
    content: Let the GDA sense users and alter the world accordingly
  - id: o3
    content: Specify every final design detail manually before generation
  - id: o4
    content: Place the grammar around the GDA so it controls user sensing
:::

:::mechanic-private
id: 01-adaptive-virtual-world-design-medium-c10-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 01-adaptive-virtual-world-design-medium-c10-m1
version: 1
lessonSlug: 01-adaptive-virtual-world-design-medium
type: missing-step
tier: Medium
anchor:
  heading: 9-generative-design-grammars-and-the-gda
  position: after
concepts:
  - generative design grammars
  - GDA sensing and response
skills:
  - recall
domain: adaptive-virtual-worlds
prompt: >-
  Fill the missing steps in the Generative Design Grammar and GDA adaptation
  pipeline
validator:
  kind: mapping
  ref: 01-adaptive-virtual-world-design-medium-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-adaptive-virtual-world-design-medium-c10-m1:public
privateValidatorRef: 01-adaptive-virtual-world-design-medium-c10-m1:private
rewardIdentity: 01-adaptive-virtual-world-design-medium-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Medium","__anchorId":"1-the-core-thesis-virtual-worlds-should-be-adaptive-places"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Medium","__anchorId":"2-the-boundary-between-physical-and-digital-is-fluid"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Medium","__anchorId":"social-organization-beyond-geography"},{"mechanicType":"abstract-transfer","__chunkIndex":5,"__version":1,"__tier":"Medium","__anchorId":"4-why-design-places-instead-of-only-3d-worlds"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Medium","__anchorId":"5-the-web-design-analogy"},{"mechanicType":"constraint-construction","__chunkIndex":7,"__version":1,"__tier":"Medium","__anchorId":"agent-model"},{"mechanicType":"prediction","__chunkIndex":8,"__version":1,"__tier":"Medium","__anchorId":"7-representation-versus-adaptation"},{"mechanicType":"quick-classification","__chunkIndex":9,"__version":1,"__tier":"Medium","__anchorId":"semantic-concerns"},{"mechanicType":"missing-step","__chunkIndex":10,"__version":1,"__tier":"Medium","__anchorId":"9-generative-design-grammars-and-the-gda"}]}
:::