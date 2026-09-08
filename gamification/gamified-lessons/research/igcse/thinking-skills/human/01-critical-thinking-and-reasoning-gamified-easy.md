:::mechanic-data
id: 01-critical-thinking-and-reasoning-easy-c2-m1
version: 1
question: Which shows higher-order thinking?
options:
  - id: a
    content: Analysis
  - id: b
    content: Recalling a fact
  - id: c
    content: Expressing a preference
:::

:::mechanic-private
id: 01-critical-thinking-and-reasoning-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-critical-thinking-and-reasoning-easy-c2-m1
version: 1
lessonSlug: 01-critical-thinking-and-reasoning-easy
type: multiple-choice
tier: Easy
anchor:
  heading: learning-through-practice
  position: after
concepts:
  - higher-order thinking
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 01-critical-thinking-and-reasoning-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-critical-thinking-and-reasoning-easy-c2-m1:public
privateValidatorRef: 01-critical-thinking-and-reasoning-easy-c2-m1:private
rewardIdentity: 01-critical-thinking-and-reasoning-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-critical-thinking-and-reasoning-easy-c4-m1
version: 1
categories:
  - id: cat-a
    label: Sceptical
  - id: cat-b
    label: Cynical
items:
  - id: i1
    content: Checks the evidence
  - id: i2
    content: Dismisses the source
  - id: i3
    content: Judges each claim fairly
  - id: i4
    content: Uses prejudgement
:::

:::mechanic-private
id: 01-critical-thinking-and-reasoning-easy-c4-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
:::

:::mechanic
schemaVersion: 1
id: 01-critical-thinking-and-reasoning-easy-c4-m1
version: 1
lessonSlug: 01-critical-thinking-and-reasoning-easy
type: quick-classification
tier: Easy
anchor:
  heading: a-critical-thinking-attitude
  position: after
concepts:
  - scepticism versus cynicism
skills:
  - recall
domain: igcse
prompt: 'Sort the responses to claims: Sceptical or Cynical'
validator:
  kind: mapping
  ref: 01-critical-thinking-and-reasoning-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-critical-thinking-and-reasoning-easy-c4-m1:public
privateValidatorRef: 01-critical-thinking-and-reasoning-easy-c4-m1:private
rewardIdentity: 01-critical-thinking-and-reasoning-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-critical-thinking-and-reasoning-easy-c6-m1
version: 1
items:
  - id: i1
    content: Analyze the claim and its reasons
  - id: i2
    content: Evaluate the evidence and support
  - id: i3
    content: Develop a justified response
:::

:::mechanic-private
id: 01-critical-thinking-and-reasoning-easy-c6-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: 01-critical-thinking-and-reasoning-easy-c6-m1
version: 1
lessonSlug: 01-critical-thinking-and-reasoning-easy
type: sequence-builder
tier: Easy
anchor:
  heading: critical-thinking-framework
  position: after
concepts:
  - critical-thinking framework
skills:
  - recall
domain: igcse
prompt: How critical thinking unfolds from examining a claim to forming a response
validator:
  kind: sequence
  ref: 01-critical-thinking-and-reasoning-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 01-critical-thinking-and-reasoning-easy-c6-m1:public
privateValidatorRef: 01-critical-thinking-and-reasoning-easy-c6-m1:private
rewardIdentity: 01-critical-thinking-and-reasoning-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-critical-thinking-and-reasoning-easy-c7-m1
version: 1
scenario: Match each clue to the type of task it describes.
theories:
  - id: th-a
    content: Problem-solving task
  - id: th-b
    content: Critical-thinking task
clues:
  - id: c1
    content: Uses numerical data to reach a solution.
  - id: c2
    content: Presents information mainly as text.
  - id: c3
    content: May involve shapes, numbers, or patterns.
  - id: c4
    content: Requires verbal reasoning about an argument.
:::

:::mechanic-private
id: 01-critical-thinking-and-reasoning-easy-c7-m1
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
id: 01-critical-thinking-and-reasoning-easy-c7-m1
version: 1
lessonSlug: 01-critical-thinking-and-reasoning-easy
type: evidence-match
tier: Easy
anchor:
  heading: sternberg-s-three-foundational-processes
  position: after
concepts:
  - problem solving and critical thinking
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 01-critical-thinking-and-reasoning-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-critical-thinking-and-reasoning-easy-c7-m1:public
privateValidatorRef: 01-critical-thinking-and-reasoning-easy-c7-m1:private
rewardIdentity: 01-critical-thinking-and-reasoning-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,4,6,7],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"learning-through-practice"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"a-critical-thinking-attitude"},{"mechanicType":"sequence-builder","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"critical-thinking-framework"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"sternberg-s-three-foundational-processes"}]}
:::