:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c2-m1
version: 1
scenario: Match each greeting clue to the country it describes.
theories:
  - id: th-a
    content: Greetings in Italy or Spain
  - id: th-b
    content: Greetings in Great Britain or Japan
clues:
  - id: c1
    content: People greet with a hug.
  - id: c2
    content: People greet with a handshake.
  - id: c3
    content: People greet with two kisses on the cheek.
  - id: c4
    content: People greet by bowing their head.
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c2-m1
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
id: 06-spanish-global-world-culture-and-technology-easy-c2-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: evidence-match
tier: Easy
anchor:
  heading: greetings-by-country
  position: after
concepts:
  - cultural greetings by country
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 06-spanish-global-world-culture-and-technology-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c2-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c2-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c3-m1
version: 1
categories:
  - id: cat-a
    label: Places
  - id: cat-b
    label: Advice
items:
  - id: i1
    content: Tamil cinema films
  - id: i2
    content: Kangaroo races
  - id: i3
    content: Respect traditions
  - id: i4
    content: Learn the language
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c3-m1
version: 1
kind: mapping
matches:
  i1: cat-a
  i2: cat-a
  i3: cat-b
  i4: cat-b
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c3-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: quick-classification
tier: Easy
anchor:
  heading: vocabulary-for-living-abroad
  position: after
concepts:
  - cultural examples
  - living abroad advice
skills:
  - recall
domain: igcse
prompt: 'Sort the abroad-living content: places or advice'
validator:
  kind: mapping
  ref: 06-spanish-global-world-culture-and-technology-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c3-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c3-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c4-m1
version: 1
question: ¿Qué tiempo describe una acción puntual?
options:
  - id: a
    content: El indefinido
  - id: b
    content: El imperfecto
  - id: c
    content: El perfecto compuesto
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c4-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c4-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: multiple-choice
tier: Easy
anchor:
  heading: weather-in-the-past
  position: after
concepts:
  - past tense use
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 06-spanish-global-world-culture-and-technology-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c4-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c4-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c5-m1
version: 1
items:
  - id: i1
    content: Make a hole in the ground
  - id: i2
    content: Place firewood and hot stones inside
  - id: i3
    content: Cover the hole with banana leaves
  - id: i4
    content: Place the food on top and cover it again
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c5-m1
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
id: 06-spanish-global-world-culture-and-technology-easy-c5-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: sequence-builder
tier: Easy
anchor:
  heading: gastronomy
  position: after
concepts:
  - Umu Rapa Nui cooking method
skills:
  - recall
domain: igcse
prompt: How the Umu Rapa Nui cooking method unfolds
validator:
  kind: sequence
  ref: 06-spanish-global-world-culture-and-technology-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c5-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c5-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c6-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: 'Desayuno: light breakfast'
  - id: s2
    content: 'Almuerzo: coffee and sandwich'
  - id: s3
    isMissing: true
  - id: s4
    content: 'Merienda: light snack'
  - id: s5
    isMissing: true
options:
  - id: o1
    content: 'Comida: main complete meal'
  - id: o2
    content: 'Cena: courses and dessert'
  - id: o3
    content: 'Café solo: black coffee'
  - id: o4
    content: 'Barraquito: coffee with lemon'
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c6-m1
version: 1
kind: mapping
matches:
  s3: o1
  s5: o2
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c6-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: missing-step
tier: Easy
anchor:
  heading: meal-times-in-spain
  position: after
concepts:
  - Spanish meal times
skills:
  - recall
domain: igcse
prompt: What's missing from the Spanish meal-time process?
validator:
  kind: mapping
  ref: 06-spanish-global-world-culture-and-technology-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c6-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c6-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c7-m1
version: 1
scenario: Match each clue to the geographical-reference group it describes.
theories:
  - id: th-a
    content: The Canary Islands
  - id: th-b
    content: Important places in Latin America
clues:
  - id: c1
    content: Valverde is on El Hierro.
  - id: c2
    content: Lago Titicaca is in Bolivia and Peru.
  - id: c3
    content: Arrecife is on Lanzarote.
  - id: c4
    content: Salto Ángel is in Venezuela.
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c7-m1
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
id: 06-spanish-global-world-culture-and-technology-easy-c7-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: evidence-match
tier: Easy
anchor:
  heading: important-places-in-latin-america
  position: after
concepts:
  - geographical references
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 06-spanish-global-world-culture-and-technology-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c7-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c7-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c8-m1
version: 1
categories:
  - id: cat-a
    label: Aparatos
  - id: cat-b
    label: Acciones
items:
  - id: i1
    content: Móvil
  - id: i2
    content: Chatear
  - id: i3
    content: Ordenador
  - id: i4
    content: Bajar música
  - id: i5
    content: Tableta
  - id: i6
    content: Cargar la batería
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c8-m1
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
id: 06-spanish-global-world-culture-and-technology-easy-c8-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: quick-classification
tier: Easy
anchor:
  heading: essential-technology-vocabulary
  position: after
concepts:
  - vocabulario tecnológico
skills:
  - recall
domain: igcse
prompt: 'Clasifica los conceptos tecnológicos: Aparatos o Acciones'
validator:
  kind: mapping
  ref: 06-spanish-global-world-culture-and-technology-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c8-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c8-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c9-m1
version: 1
scenario: A student must decide how to use technology while completing homework.
options:
  - id: a
    content: Turn off the phone and concentrate on one activity
    pros:
      - reduces interruptions
      - supports concentration
    cons:
      - may delay responses to calls or messages
  - id: b
    content: Keep the phone active while studying and respond to messages
    pros:
      - allows immediate communication
    cons:
      - interrupts homework
      - can affect work quality
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c9-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c9-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: internet-domains-and-subdomains
  position: after
concepts:
  - responsible technology use
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 06-spanish-global-world-culture-and-technology-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c9-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c9-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c10-m1
version: 1
question: What is one social media advantage?
options:
  - id: a
    content: Global connection
  - id: b
    content: Total distraction
  - id: c
    content: Less family time
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c10-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c10-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: multiple-choice
tier: Easy
anchor:
  heading: connectors-for-opinion-articles
  position: after
concepts:
  - social media advantages
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 06-spanish-global-world-culture-and-technology-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c10-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c10-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c11-m1
version: 1
scenario: Lucía wants more time to practice a sport and imagines what would happen.
startNodeId: n1
nodes:
  - id: n1
    question: Which verb form completes the condition?
    options:
      - id: a1
        content: Si practicara menos videojuegos
        nextNodeId: n2
      - id: b1
        content: Si practicaría menos videojuegos
        nextNodeId: null
      - id: c1
        content: Si practicar menos videojuegos
        nextNodeId: null
  - id: n2
    question: What follows the condition?
    options:
      - id: a2
        content: podría tener más tiempo para hacer deporte
        nextNodeId: null
      - id: b2
        content: podía tener más tiempo para hacer deporte
        nextNodeId: null
      - id: c2
        content: puede tener más tiempo para hacer deporte
        nextNodeId: null
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c11-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c11-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: prediction
tier: Easy
anchor:
  heading: conditional-structure
  position: after
concepts:
  - imperfecto de subjuntivo
  - conditional structure
skills:
  - recall
domain: igcse
prompt: How does the conditional sentence scenario play out?
validator:
  kind: exact
  ref: 06-spanish-global-world-culture-and-technology-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c11-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c11-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c12-m1
version: 1
scenario: >-
  Design a globalised economy that increases prosperity and employment while
  reducing pollution.
outputs:
  - id: prosperity
    label: Prosperity
    baseValue: 40
    targetMin: 55
    targetMax: 85
  - id: employment
    label: Employment
    baseValue: 50
    targetMin: 55
    targetMax: 80
  - id: pollution
    label: Pollution
    baseValue: 60
    targetMin: 20
    targetMax: 45
sliders:
  - id: digitalSkills
    label: Digital skills
    min: 0
    max: 5
    step: 1
    effects:
      - outputId: prosperity
        multiplier: 5
      - outputId: employment
        multiplier: 3
      - outputId: pollution
        multiplier: 1
  - id: environmentalResponsibility
    label: Environmental responsibility
    min: 0
    max: 5
    step: 1
    effects:
      - outputId: prosperity
        multiplier: 2
      - outputId: pollution
        multiplier: -8
cards:
  - id: culturalExchange
    label: Cultural exchange
    effects:
      - outputId: prosperity
        multiplier: 5
      - outputId: employment
        multiplier: 2
  - id: greenPolicy
    label: Green policy
    effects:
      - outputId: prosperity
        multiplier: 3
      - outputId: pollution
        multiplier: -10
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c12-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c12-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: parameter-tuner
tier: Easy
anchor:
  heading: global-issues-for-discussion
  position: after
concepts:
  - globalisation
  - economic growth
  - environmental responsibility
skills:
  - recall
domain: igcse
prompt: >-
  Adjust the controls to support prosperity, employment, and environmental
  responsibility.
validator:
  kind: invariants
  ref: 06-spanish-global-world-culture-and-technology-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c12-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c12-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 06-spanish-global-world-culture-and-technology-easy-c13-m1
version: 1
question: ¿Qué ayuda al equilibrio ecológico?
options:
  - id: a
    content: Consumir solo lo necesario
  - id: b
    content: Usar más recursos naturales
  - id: c
    content: Desperdiciar agua y energía
:::

:::mechanic-private
id: 06-spanish-global-world-culture-and-technology-easy-c13-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 06-spanish-global-world-culture-and-technology-easy-c13-m1
version: 1
lessonSlug: 06-spanish-global-world-culture-and-technology-easy
type: multiple-choice
tier: Easy
anchor:
  heading: 7-the-environment
  position: after
concepts:
  - equilibrio ecológico
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 06-spanish-global-world-culture-and-technology-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 06-spanish-global-world-culture-and-technology-easy-c13-m1:public
privateValidatorRef: 06-spanish-global-world-culture-and-technology-easy-c13-m1:private
rewardIdentity: 06-spanish-global-world-culture-and-technology-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13],"sectionMechanics":[{"mechanicType":"evidence-match","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"greetings-by-country"},{"mechanicType":"quick-classification","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"vocabulary-for-living-abroad"},{"mechanicType":"multiple-choice","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"weather-in-the-past"},{"mechanicType":"sequence-builder","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"gastronomy"},{"mechanicType":"missing-step","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"meal-times-in-spain"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"important-places-in-latin-america"},{"mechanicType":"quick-classification","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"essential-technology-vocabulary"},{"mechanicType":"tradeoff-decision","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"internet-domains-and-subdomains"},{"mechanicType":"multiple-choice","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"connectors-for-opinion-articles"},{"mechanicType":"prediction","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"conditional-structure"},{"mechanicType":"parameter-tuner","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"global-issues-for-discussion"},{"mechanicType":"multiple-choice","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"7-the-environment"}]}
:::