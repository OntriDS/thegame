:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c2-m1
version: 1
categories:
  - id: cat-vr
    label: VR
  - id: cat-mixed
    label: AR / MR
items:
  - id: i1
    content: Replaces real world fully
  - id: i2
    content: Overlays digital on reality
  - id: i3
    content: Enclosing headset
  - id: i4
    content: Anchors to real surfaces
  - id: i5
    content: User isolated from space
  - id: i6
    content: Digital meets physical
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c2-m1
version: 1
kind: mapping
matches:
  i1: cat-vr
  i2: cat-mixed
  i3: cat-vr
  i4: cat-mixed
  i5: cat-vr
  i6: cat-mixed
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c2-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-paradigm-shift-from-screen-designer-to-spatial-architect
  position: after
concepts:
  - Virtual Reality definition
  - Augmented Reality definition
  - Mixed Reality definition
  - XR technology distinctions
skills:
  - recall
domain: interactive-design-studies
prompt: 'Sort the XR characteristics: VR or AR/MR'
validator:
  kind: mapping
  ref: interaction-design-for-xr-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-for-xr-easy-c2-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c2-m1:private
rewardIdentity: interaction-design-for-xr-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c3-m1
version: 1
question: What if an XR event has no sensory cues?
options:
  - id: a
    content: User still notices it
  - id: b
    content: It effectively never happened
  - id: c
    content: A notification pops up
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c3-m1
version: 1
kind: exact
correctAnswer: b
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c3-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 1-1-mise-en-sc-ne-staging-the-spatial-experience
  position: after
concepts:
  - mise-en-scène in XR
skills:
  - recall
domain: interactive-design-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: interaction-design-for-xr-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-for-xr-easy-c3-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c3-m1:private
rewardIdentity: interaction-design-for-xr-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c4-m1
version: 1
attributes:
  - id: neckStrain
    label: Neck Strain
  - id: readability
    label: Readability
components:
  - id: c1
    content: >-
      Health bar anchored at the bottom center of the FOV, inside the central
      resting gaze
    metrics:
      neckStrain: 1
      readability: 9
  - id: c2
    content: Mini-map positioned in the upper-right within the near-peripheral zone
    metrics:
      neckStrain: 3
      readability: 7
  - id: c3
    content: >-
      Settings panel anchored at the far left edge of the FOV, requires full
      head turn
    metrics:
      neckStrain: 8
      readability: 4
  - id: c4
    content: >-
      Chat log placed at the extreme right side, outside comfortable neck
      rotation
    metrics:
      neckStrain: 9
      readability: 2
requirements:
  - attributeId: neckStrain
    operator: <=
    value: 5
    description: Stay within comfortable neck rotation (roughly 45-60 degrees).
  - attributeId: readability
    operator: '>='
    value: 6
    description: >-
      Keep important content in the high-acuity central and near-peripheral
      zones.
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c4-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c4-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: constraint-construction
tier: Easy
anchor:
  heading: 1-2-the-field-of-view-canvas
  position: after
concepts:
  - Field of View zones in XR
  - Neck rotation comfort limits
  - UI placement within central and near-peripheral gaze
skills:
  - recall
domain: interactive-design-studies
prompt: Select UI components that fit within the comfortable FOV canvas.
validator:
  kind: invariants
  ref: interaction-design-for-xr-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-for-xr-easy-c4-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c4-m1:private
rewardIdentity: interaction-design-for-xr-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c5-m1
version: 1
scenario: >-
  Your team is designing a new VR exploration experience that all users will use
  by default. You must choose the primary locomotion system and weigh the
  ethical responsibility of user comfort against the sense of immersion.
options:
  - id: teleport
    content: Teleportation-based locomotion
    pros:
      - Very low cybersickness risk because no continuous optical flow occurs
      - Accessible to users with vestibular sensitivities
      - Requires fewer mitigation design features
    cons:
      - Less continuous sense of movement through the environment
      - Can feel jarring when used repeatedly
      - May reduce immersion for users who expect smooth travel
  - id: smooth
    content: >-
      Smooth locomotion with mitigation features (vignette, stable horizon, snap
      turns)
    pros:
      - Provides a more natural continuous movement experience
      - Strengthens the sense of presence and immersion
      - Well suited for traversing large open environments
    cons:
      - Higher cybersickness risk from visual-vestibular mismatch
      - Can make sensitive users physically ill
      - Not all users tolerate it equally, even with mitigations
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c5-m1
version: 1
kind: rubric
scoring:
  teleport: 4
  smooth: 1
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c5-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: gorilla-arm-syndrome
  position: after
concepts:
  - cybersickness prevention
  - locomotion design ethics
  - inclusive XR design
skills:
  - recall
domain: interactive-design-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: interaction-design-for-xr-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-for-xr-easy-c5-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c5-m1:private
rewardIdentity: interaction-design-for-xr-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c6-m1
version: 1
scenario: >-
  Match each clue to the VR/MR psychological impact concept or the AR privacy
  concept it illustrates.
theories:
  - id: th-a
    content: Psychological Weight of Immersive Environments
  - id: th-b
    content: Privacy in Augmented Reality
clues:
  - id: c1
    content: >-
      A VR jump scare triggers a genuine fight-or-flight response because the
      brain cannot dismiss it as 'just a movie.'
  - id: c2
    content: >-
      An AR app scanning a living room may capture images of bystanders who
      never agreed to be recorded.
  - id: c3
    content: >-
      Standing on a virtual ledge produces real vertigo even though the user is
      physically safe on the floor.
  - id: c4
    content: >-
      Spatial mapping data can reveal intimate details of a user's home layout,
      possessions, and daily routines.
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c6-m1
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
id: 01-xr-interaction-design-spatial-ux-easy-c6-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: evidence-match
tier: Easy
anchor:
  heading: privacy-in-augmented-reality
  position: after
concepts:
  - psychological weight of immersive environments
  - AR privacy considerations
skills:
  - recall
domain: interactive-design-studies
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: interaction-design-for-xr-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-for-xr-easy-c6-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c6-m1:private
rewardIdentity: interaction-design-for-xr-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c7-m1
version: 1
scenario: >-
  Users feel nauseous and disoriented after about 15 minutes in a VR training
  experience.
symptoms:
  - Users report nausea and disorientation after 10-15 minutes of use
diagnoses:
  - id: d1
    content: Missing comfort options like vignette and snap-turn
  - id: d2
    content: Graphics rendering is too low-fidelity
  - id: d3
    content: The onboarding tutorial is too complex
parameters:
  - id: p1
    label: Comfort vignette intensity
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Snap-turn movement strength
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c7-m1
version: 1
kind: invariants
correctDiagnosis: d1
requirements:
  - parameterId: p1
    operator: '>='
    targetValue: 50
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c7-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: 2-3-evaluating-xr-experiences
  position: after
concepts:
  - Physical comfort in XR
  - Cybersickness mitigation
skills:
  - recall
domain: interactive-design-studies
prompt: Diagnose the cause of user discomfort and adjust the controls to fix it.
validator:
  kind: invariants
  ref: interaction-design-for-xr-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-for-xr-easy-c7-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c7-m1:private
rewardIdentity: interaction-design-for-xr-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c8-m1
version: 1
question: What is an equirectangular sketch?
options:
  - id: a
    content: A 360° view as an unwrapped sphere
  - id: b
    content: A flat 2D wireframe of a room
  - id: c
    content: A 3D model rendered in VR
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c8-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c8-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: multiple-choice
tier: Easy
anchor:
  heading: equirectangular-sketching
  position: after
concepts:
  - equirectangular sketch
skills:
  - recall
domain: interactive-design-studies
prompt: Pick the right one.
validator:
  kind: exact
  ref: interaction-design-for-xr-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-for-xr-easy-c8-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c8-m1:private
rewardIdentity: interaction-design-for-xr-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c9-m1
version: 1
items:
  - id: i1
    content: Define the interaction scenario you want to test
  - id: i2
    content: Physically act it out in an empty room, using props if helpful
  - id: i3
    content: Note physical discomfort, hesitation, or confusion during the enactment
  - id: i4
    content: Iterate the interaction concept and repeat the session
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c9-m1
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
id: 01-xr-interaction-design-spatial-ux-easy-c9-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: sequence-builder
tier: Easy
anchor:
  heading: 3-3-bodystorming
  position: after
concepts:
  - bodystorming process
skills:
  - recall
domain: interactive-design-studies
prompt: How a bodystorming session unfolds from start to finish
validator:
  kind: sequence
  ref: interaction-design-for-xr-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: interaction-design-for-xr-easy-c9-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c9-m1:private
rewardIdentity: interaction-design-for-xr-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c10-m1
version: 1
sourceDomain: Paper dioramas as low-fidelity physical prototyping
targetDomain: Architectural design education
scenario: >-
  A first-year architecture professor wants her students to develop spatial
  reasoning before introducing digital CAD tools. Which approach best transfers
  the underlying methodology of paper dioramas into the studio classroom?
options:
  - id: a
    content: >-
      Have students build rapid, disposable cardboard massing models to explore
      volume, light, and circulation through hands-on iteration, tearing them
      down and rebuilding as concepts evolve.
  - id: b
    content: >-
      Provide students with printed paper templates and instruct them to
      carefully cut and assemble precise architectural mock-ups for graded
      submission.
  - id: c
    content: >-
      Issue students paper and cardboard but require them to first produce
      detailed digital renderings of each model before constructing it
      physically.
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c10-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
  c: 0
:::

:::mechanic
schemaVersion: 1
id: 01-xr-interaction-design-spatial-ux-easy-c10-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: 3-5-enhancing-physical-prototypes-with-ar
  position: after
concepts:
  - paper dioramas
  - rapid physical prototyping
  - spatial reasoning through hands-on iteration
skills:
  - recall
domain: interactive-design-studies
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: interaction-design-for-xr-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: interaction-design-for-xr-easy-c10-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c10-m1:private
rewardIdentity: interaction-design-for-xr-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-xr-interaction-design-spatial-ux-easy-c11-m1
version: 1
scenario: >-
  A design team is moving an XR concept from early idea to final shipping build.
  Match each activity to the correct stage.
theories:
  - id: th-a
    content: Immersive Authoring (early VR prototyping)
  - id: th-b
    content: High-Fidelity Production (Unity/Unreal final build)
clues:
  - id: c1
    content: >-
      Designer uses Gravity Sketch to model a 3D environment at true 1:1 scale
      inside VR.
  - id: c2
    content: Developer writes C# scripts in Unity to implement the interaction logic.
  - id: c3
    content: >-
      Team collaborates in ShapesXR to quickly prototype spatial interactions
      and layouts.
  - id: c4
    content: >-
      Engineer optimizes rendering to keep the frame rate smooth and avoid
      motion sickness.
:::

:::mechanic-private
id: 01-xr-interaction-design-spatial-ux-easy-c11-m1
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
id: 01-xr-interaction-design-spatial-ux-easy-c11-m1
version: 1
lessonSlug: interaction-design-for-xr-easy
type: evidence-match
tier: Easy
anchor:
  heading: 4-3-conducting-spatial-user-studies
  position: after
concepts:
  - immersive authoring
  - high-fidelity production
skills:
  - recall
domain: interactive-design-studies
prompt: Which prototyping stage do these clues support?
validator:
  kind: mapping
  ref: interaction-design-for-xr-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: interaction-design-for-xr-easy-c11-m1:public
privateValidatorRef: interaction-design-for-xr-easy-c11-m1:private
rewardIdentity: interaction-design-for-xr-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"the-paradigm-shift-from-screen-designer-to-spatial-architect"},{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"1-1-mise-en-sc-ne-staging-the-spatial-experience"},{"mechanicType":"constraint-construction","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"1-2-the-field-of-view-canvas"},{"mechanicType":"tradeoff-decision","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"gorilla-arm-syndrome"},{"mechanicType":"evidence-match","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"privacy-in-augmented-reality"},{"mechanicType":"diagnostic-lab","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"2-3-evaluating-xr-experiences"},{"mechanicType":"multiple-choice","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"equirectangular-sketching"},{"mechanicType":"sequence-builder","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"3-3-bodystorming"},{"mechanicType":"abstract-transfer","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"3-5-enhancing-physical-prototypes-with-ar"},{"mechanicType":"evidence-match","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"4-3-conducting-spatial-user-studies"}]}
:::