---
type: gamified-lesson-mechanics
lesson_slug: jobs-to-be-done-easy
domain: project-management-studies
---

:::mechanic-data
id: jobs-to-be-done-easy-c2-m1
version: 1
question: What do people do with products in JTBD?
options:
  - id: a
    content: Hire them to make progress
  - id: b
    content: Buy them for features
  - id: c
    content: Collect them as possessions
:::

:::mechanic-private
id: jobs-to-be-done-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: jobs-to-be-done-easy-c2-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-fundamental-premise
  position: after
concepts:
  - JTBD fundamental premise
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: jobs-to-be-done-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: jobs-to-be-done-easy-c2-m1:public
privateValidatorRef: jobs-to-be-done-easy-c2-m1:private
rewardIdentity: jobs-to-be-done-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: jobs-to-be-done-easy-c4-m1
version: 1
categories:
  - id: cat-a
    label: Functional
  - id: cat-b
    label: Emotional
items:
  - id: i1
    content: Mow the lawn
  - id: i2
    content: Send an email
  - id: i3
    content: Fix a broken sink
  - id: i4
    content: Feel proud of home
  - id: i5
    content: Feel confident at work
  - id: i6
    content: Feel relieved after cleaning
:::

:::mechanic-private
id: jobs-to-be-done-easy-c4-m1
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
id: jobs-to-be-done-easy-c4-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: quick-classification
tier: Easy
anchor:
  heading: pillar-1-the-job-statement-the-objective
  position: after
concepts:
  - Job Statement dimensions
  - Functional Jobs
  - Emotional Jobs
skills:
  - recall
domain: project-management-studies
prompt: 'Sort the Job Statement examples: Functional or Emotional'
validator:
  kind: mapping
  ref: jobs-to-be-done-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: jobs-to-be-done-easy-c4-m1:public
privateValidatorRef: jobs-to-be-done-easy-c4-m1:private
rewardIdentity: jobs-to-be-done-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: jobs-to-be-done-easy-c5-m1
version: 1
scenario: >-
  You're sorting user-research notes into the correct Product Tier framework
  pillar.
theories:
  - id: th-struggle
    content: The Struggle (Friction)
  - id: th-vision
    content: The Vision (Ideal Future State)
clues:
  - id: c1
    content: Users abandon the cart because checkout takes too many steps.
  - id: c2
    content: Customers dream of a seamless one-tap purchase experience.
  - id: c3
    content: The current onboarding flow requires five manual form fields.
  - id: c4
    content: Tomorrow's product feels effortless, instant, and invisible to use.
:::

:::mechanic-private
id: jobs-to-be-done-easy-c5-m1
version: 1
kind: mapping
matches:
  c1: th-struggle
  c2: th-vision
  c3: th-struggle
  c4: th-vision
:::

:::mechanic
schemaVersion: 1
id: jobs-to-be-done-easy-c5-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: evidence-match
tier: Easy
anchor:
  heading: pillar-2-the-struggle-the-friction
  position: after
concepts:
  - The Struggle (Friction)
  - Pillar 2 vs. adjacent pillars
skills:
  - recall
domain: project-management-studies
prompt: Which pillar do these clues support?
validator:
  kind: mapping
  ref: jobs-to-be-done-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: jobs-to-be-done-easy-c5-m1:public
privateValidatorRef: jobs-to-be-done-easy-c5-m1:private
rewardIdentity: jobs-to-be-done-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: jobs-to-be-done-easy-c6-m1
version: 1
scenario: >-
  A product team is defining the Desired Outcome for a new photo-editing
  feature. Two ways to phrase the success metric are on the table — each with
  clear tradeoffs.
options:
  - id: a
    content: Frame the outcome as 'users enjoy editing their photos more than before.'
    pros:
      - easy to capture in user interviews
      - reflects the user's emotional experience
    cons:
      - vague and subjective
      - hard to measure objectively
      - leaves the team guessing what 'done' looks like
  - id: b
    content: >-
      Frame the outcome as 'users can remove a photo's background in under 10
      seconds with a single tap, with edges clean enough to zoom to 100% without
      visible artifacts.'
    pros:
      - specific and objectively measurable
      - gives the team a shared definition of 'done'
      - lets users self-verify success
    cons:
      - takes more upfront research to define
      - can feel constraining during early ideation
:::

:::mechanic-private
id: jobs-to-be-done-easy-c6-m1
version: 1
kind: rubric
scoring:
  a: 1
  b: 4
:::

:::mechanic
schemaVersion: 1
id: jobs-to-be-done-easy-c6-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: pillar-3-the-desired-outcome-the-success-metric
  position: after
concepts:
  - desired outcome
  - success metrics
  - measurability
skills:
  - recall
domain: project-management-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: jobs-to-be-done-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: jobs-to-be-done-easy-c6-m1:public
privateValidatorRef: jobs-to-be-done-easy-c6-m1:private
rewardIdentity: jobs-to-be-done-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: jobs-to-be-done-easy-c7-m1
version: 1
question: What is Pillar 4 about?
options:
  - id: a
    content: The user's environment
  - id: b
    content: The product's price
  - id: c
    content: The brand's history
:::

:::mechanic-private
id: jobs-to-be-done-easy-c7-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: jobs-to-be-done-easy-c7-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: multiple-choice
tier: Easy
anchor:
  heading: pillar-4-the-context-the-environment
  position: after
concepts:
  - 'Pillar 4: The Context'
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: jobs-to-be-done-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: jobs-to-be-done-easy-c7-m1:public
privateValidatorRef: jobs-to-be-done-easy-c7-m1:private
rewardIdentity: jobs-to-be-done-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: jobs-to-be-done-easy-c9-m1
version: 1
scenario: >-
  A product designer is mapping out why a user might keep or abandon a new
  product. The user must first identify the core task, then consider all the
  dimensions, and finally predict what happens when one dimension is violated.
startNodeId: n1
nodes:
  - id: n1
    question: What should the designer identify first when mapping the user's needs?
    options:
      - id: a1
        content: The Main Job — the primary reason the user hired the product
        nextNodeId: n2
      - id: b1
        content: The product's color and branding
        nextNodeId: null
      - id: c1
        content: The competitor's pricing strategy
        nextNodeId: null
  - id: n2
    question: Beyond the Main Job, what else must the designer account for?
    options:
      - id: a2
        content: >-
          Both the Related Jobs and all four micro-dimensions (Functional,
          Emotional, Personal, Social)
        nextNodeId: n3
      - id: b2
        content: Only the speed at which the Main Job is completed
        nextNodeId: null
      - id: c2
        content: Only how cheap the product is to manufacture
        nextNodeId: null
  - id: n3
    question: >-
      What happens if a product perfectly solves the Functional aspect but
      violates the Social/Emotional aspect?
    options:
      - id: a3
        content: >-
          The user will fire the product, because emotional/social resonance is
          non-negotiable
        nextNodeId: null
      - id: b3
        content: The user will become a lifelong loyal advocate
        nextNodeId: null
      - id: c3
        content: >-
          The user will only care about the efficiency gain and ignore the
          embarrassment
        nextNodeId: null
:::

:::mechanic-private
id: jobs-to-be-done-easy-c9-m1
version: 1
kind: exact
correctAnswer: a1,a2,a3
:::

:::mechanic
schemaVersion: 1
id: jobs-to-be-done-easy-c9-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: prediction
tier: Easy
anchor:
  heading: the-golden-rule-of-hiring-and-firing
  position: after
concepts:
  - main job vs related jobs
  - functional and emotional dimensions
  - golden rule of hiring and firing
skills:
  - recall
domain: project-management-studies
prompt: How does the dimensional hierarchy scenario play out?
validator:
  kind: exact
  ref: jobs-to-be-done-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: jobs-to-be-done-easy-c9-m1:public
privateValidatorRef: jobs-to-be-done-easy-c9-m1:private
rewardIdentity: jobs-to-be-done-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: jobs-to-be-done-easy-c10-m1
version: 1
question: Is JTBD just asking users what they want?
options:
  - id: a
    content: No, it uncovers deeper needs
  - id: b
    content: Yes, that's the main method
  - id: c
    content: Only for new products
:::

:::mechanic-private
id: jobs-to-be-done-easy-c10-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: jobs-to-be-done-easy-c10-m1
version: 1
lessonSlug: jobs-to-be-done-easy
type: multiple-choice
tier: Easy
anchor:
  heading: misconception-5-once-written-a-job-statement-stays-valid-forever
  position: after
concepts:
  - JTBD is not just asking users what they want
skills:
  - recall
domain: project-management-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: jobs-to-be-done-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: jobs-to-be-done-easy-c10-m1:public
privateValidatorRef: jobs-to-be-done-easy-c10-m1:private
rewardIdentity: jobs-to-be-done-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,4,5,6,7,9,10],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"the-fundamental-premise"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"pillar-1-the-job-statement-the-objective"},{"mechanicType":"evidence-match","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"pillar-2-the-struggle-the-friction"},{"mechanicType":"tradeoff-decision","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"pillar-3-the-desired-outcome-the-success-metric"},{"mechanicType":"multiple-choice","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"pillar-4-the-context-the-environment"},{"mechanicType":"constraint-construction","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"putting-it-all-together"},{"mechanicType":"prediction","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"the-golden-rule-of-hiring-and-firing"},{"mechanicType":"multiple-choice","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"misconception-5-once-written-a-job-statement-stays-valid-forever"}]}
:::