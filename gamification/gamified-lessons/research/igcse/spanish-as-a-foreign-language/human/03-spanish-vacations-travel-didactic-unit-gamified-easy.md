:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1
version: 1
question: ¿Qué significa descansar?
options:
  - id: a
    content: To rest
  - id: b
    content: To go sightseeing
  - id: c
    content: To get a tan
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: multiple-choice
tier: Easy
anchor:
  heading: near-future-ir-a-infinitivo
  position: after
concepts:
  - holiday vocabulary
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1
version: 1
scenario: >-
  You are planning a short journey between two large Spanish cities and want to
  compare transport options.
options:
  - id: train
    content: Travel by train
    pros:
      - stations are normally in city centres
      - there is no luggage limit
      - you can work while travelling
    cons:
      - the journey may be slower than flying
  - id: plane
    content: Travel by plane
    pros:
      - the journey may be fast
    cons:
      - you usually need to arrive two hours early
      - luggage is limited
      - airports may be far from city centres
      - flying causes environmental pollution
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1
version: 1
kind: rubric
scoring:
  train: 4
  plane: 1
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: plane-train-and-bus-critical-comparison
  position: after
concepts:
  - transport comparison
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1
version: 1
scenario: Match each clue to the accommodation type it clearly describes.
theories:
  - id: th-a
    content: Youth hostel
  - id: th-b
    content: Beach apartment
clues:
  - id: c1
    content: Shared kitchen with strangers
  - id: c2
    content: On the seafront
  - id: c3
    content: Multicultural and youthful atmosphere
  - id: c4
    content: Direct access to sunbathing and swimming
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1
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
id: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: evidence-match
tier: Easy
anchor:
  heading: case-study-hotel-cueva-in-los-monegros
  position: after
concepts:
  - recognising accommodation types
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1
version: 1
categories:
  - id: cat-a
    label: Outdoors
  - id: cat-b
    label: At home
items:
  - id: i1
    content: Senderismo
  - id: i2
    content: Video games
  - id: i3
    content: Escalada
  - id: i4
    content: Reading
  - id: i5
    content: Esquí
  - id: i6
    content: Board games
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-b
  i3: cat-a
  i4: cat-b
  i5: cat-a
  i6: cat-b
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: quick-classification
tier: Easy
anchor:
  heading: activities-by-location
  position: after
concepts:
  - holiday activities by location
skills:
  - recall
domain: igcse
prompt: 'Sort the holiday activities: Outdoors or At home'
validator:
  kind: mapping
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1
version: 1
question: When is the preterite used?
options:
  - id: a
    content: For completed past actions
  - id: b
    content: For present actions
  - id: c
    content: For future actions
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: multiple-choice
tier: Easy
anchor:
  heading: stem-changing-verbs-in-the-preterite
  position: after
concepts:
  - preterite use
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1
version: 1
items:
  - id: i1
    content: 'When: el año pasado'
  - id: i2
    content: 'Where: Fui a España'
  - id: i3
    content: 'Activities: visité el pueblo'
  - id: i4
    content: 'Opinion: Me encantó'
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1
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
id: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: sequence-builder
tier: Easy
anchor:
  heading: 6-describing-a-past-holiday
  position: after
concepts:
  - describing a past holiday
skills:
  - recall
domain: igcse
prompt: How a past holiday narrative unfolds from beginning to end
validator:
  kind: sequence
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1
version: 1
scenario: Tune the weather profile to match a good climate in Spain.
outputs:
  - id: temperature
    label: Temperature (°C)
    baseValue: 10
    targetMin: 18
    targetMax: 22
  - id: humidity
    label: Humidity (%)
    baseValue: 20
    targetMin: 40
    targetMax: 60
  - id: sunshine
    label: Sunshine hours
    baseValue: 1000
    targetMin: 2000
    targetMax: 4000
sliders:
  - id: warmth
    label: Warmth
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: temperature
        multiplier: 1
  - id: moisture
    label: Moisture
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: humidity
        multiplier: 3
  - id: sun
    label: Sunshine
    min: 0
    max: 10
    step: 1
    effects:
      - outputId: sunshine
        multiplier: 200
cards:
  - id: mildClimate
    label: Mild climate
    effects:
      - outputId: temperature
        multiplier: 5
  - id: humidAir
    label: Moderate humidity
    effects:
      - outputId: humidity
        multiplier: 10
  - id: brightDays
    label: Many daylight hours
    effects:
      - outputId: sunshine
        multiplier: 1000
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: climate-in-spain
  position: after
concepts:
  - Spanish climate indicators
skills:
  - recall
domain: igcse
prompt: Tune the weather to describe a good climate in Spain.
validator:
  kind: invariants
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1
version: 1
sourceDomain: Spanish past-tense usage
targetDomain: literary studies
scenario: >-
  Apply the distinction between imperfect background and preterite interruption
  to narrative analysis.
options:
  - id: a
    content: >-
      Treat ongoing descriptions, habits, and background as the setting, and
      specific interrupting events as actions that move the narrative forward.
  - id: b
    content: >-
      Treat every past action as an equally specific event, regardless of
      whether it describes background, repetition, or interruption.
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: preterite-or-imperfect
  position: after
concepts:
  - imperfect for background and repeated actions
  - preterite interruption
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1
version: 1
scenario: A holidaymaker feels dizzy after sunbathing.
symptoms:
  - Estoy mareado.
  - He estado tomando el sol.
diagnoses:
  - id: d1
    content: Tengo una insolación.
  - id: d2
    content: Tengo gripe.
parameters:
  - id: p1
    label: Hydration
    min: 0
    max: 100
    step: 25
  - id: p2
    label: Midday sun exposure
    min: 0
    max: 100
    step: 25
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1
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
id: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: diagnostic-lab
tier: Easy
anchor:
  heading: health-and-beauty-establishments
  position: after
concepts:
  - holiday health and beach safety
skills:
  - recall
domain: igcse
prompt: Identify the problem and set the safe controls.
validator:
  kind: invariants
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
  maxPayloadBytes: 4096
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: Choose a reflexive verb
  - id: s2
    isMissing: true
  - id: s3
    content: Use present-tense haber
  - id: s4
    isMissing: true
  - id: s5
    content: Me he roto la pierna
options:
  - id: o1
    content: Put pronoun before haber
  - id: o2
    content: Add its past participle
  - id: o3
    content: Use future-tense haber
  - id: o4
    content: Place pronoun after participle
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: missing-step
tier: Easy
anchor:
  heading: common-irregular-participles
  position: after
concepts:
  - present perfect formation
skills:
  - recall
domain: igcse
prompt: What's missing from the reflexive present perfect process?
validator:
  kind: mapping
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1
version: 1
items:
  - id: i1
    content: Start with the imperfect of estar
  - id: i2
    content: 'Choose the verb ending: -ando, -iendo'
  - id: i3
    content: Add the gerund to estar
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: sequence-builder
tier: Easy
anchor:
  heading: reporting-a-lost-object-to-renfe
  position: after
concepts:
  - imperfect continuous formation
skills:
  - recall
domain: igcse
prompt: How to form the imperfect continuous
validator:
  kind: sequence
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1
version: 1
items:
  - id: i1
    content: A car ignores a CEDA EL PASO sign
  - id: i2
    content: The car crashes at a junction
  - id: i3
    content: Witnesses call for help
  - id: i4
    content: Emergency workers treat injured people
:::

:::mechanic-private
id: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1
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
id: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1
version: 1
lessonSlug: 03-spanish-vacations-travel-didactic-unit-easy
type: sequence-builder
tier: Easy
anchor:
  heading: 14-practice-formats
  position: after
concepts:
  - sequential accident narrative
skills:
  - recall
domain: igcse
prompt: How an accident response unfolds from the crash to emergency arrival
validator:
  kind: sequence
  ref: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1:public
privateValidatorRef: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1:private
rewardIdentity: 03-spanish-vacations-travel-didactic-unit-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"near-future-ir-a-infinitivo"},{"mechanicType":"tradeoff-decision","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"plane-train-and-bus-critical-comparison"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"case-study-hotel-cueva-in-los-monegros"},{"mechanicType":"quick-classification","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"activities-by-location"},{"mechanicType":"multiple-choice","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"stem-changing-verbs-in-the-preterite"},{"mechanicType":"sequence-builder","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"6-describing-a-past-holiday"},{"mechanicType":"parameter-tuner","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"climate-in-spain"},{"mechanicType":"abstract-transfer","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"preterite-or-imperfect"},{"mechanicType":"diagnostic-lab","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"health-and-beauty-establishments"},{"mechanicType":"missing-step","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"common-irregular-participles"},{"mechanicType":"sequence-builder","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"reporting-a-lost-object-to-renfe"},{"mechanicType":"sequence-builder","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"14-practice-formats"}]}
:::