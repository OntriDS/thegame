:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1
version: 1
question: ¿Qué pregunta es «¿De dónde eres?»?
options:
  - id: a
    content: Pregunta de dónde eres
  - id: b
    content: Pregunta por tu edad
  - id: c
    content: Pregunta por tus aficiones
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: multiple-choice
tier: Easy
anchor:
  heading: the-spanish-alphabet-and-spelling
  position: after
concepts:
  - interrogative words
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1
version: 1
items:
  - id: i1
    content: Me levanto muy temprano.
  - id: i2
    content: Me ducho y desayuno.
  - id: i3
    content: Voy al instituto en autobús.
  - id: i4
    content: Almuerzo en la cafetería.
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1
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
id: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: sequence-builder
tier: Easy
anchor:
  heading: cultural-focus-the-siesta
  position: after
concepts:
  - daily routine
skills:
  - recall
domain: igcse
prompt: How a Spanish daily routine unfolds from morning to school
validator:
  kind: sequence
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1
version: 1
categories:
  - id: cat-a
    label: gusta
  - id: cat-b
    label: gustan
items:
  - id: i1
    content: Me gusta el cine
  - id: i2
    content: Me gustan los gatos
  - id: i3
    content: Me gusta leer
  - id: i4
    content: Me gustan los animales
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1
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
id: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: quick-classification
tier: Easy
anchor:
  heading: cultural-focus-latin-music
  position: after
concepts:
  - gusta vs gustan
skills:
  - recall
domain: igcse
prompt: 'Sort the gustar phrases: gusta or gustan'
validator:
  kind: mapping
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1
version: 1
scenario: >-
  A visitor wants nightlife, tapas, famous boutiques, and Gaudí's architecture,
  while accepting some disadvantages of city life.
options:
  - id: a
    content: Choose a Barcelona city experience
    pros:
      - offers nightlife and tapas bars
      - includes famous boutiques
      - features Gaudí's key works
    cons:
      - may involve pollution
      - may involve more insecurity or danger
  - id: b
    content: Choose a Los Andes and Aconcagua Valley experience
    pros:
      - includes cultural and historical places
      - offers excursions, waterfalls, and mountain landscapes
      - includes vineyards and thermal pools
    cons:
      - does not center on Barcelona nightlife
      - may offer fewer forms of entertainment for young people
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
hints:
  a: >-
    Look for the option that directly matches nightlife, boutiques, and Gaudí's
    architecture.
  b: >-
    This option focuses on cultural sites, excursions, mountains, vineyards, and
    thermal pools.
:::

:::mechanic
schemaVersion: 1
id: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: los-andes-chile
  position: after
concepts:
  - tourism in Barcelona
  - city versus countryside
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1
version: 1
categories:
  - id: cat-a
    label: Materias
  - id: cat-b
    label: Útiles
items:
  - id: i1
    content: Matemáticas
  - id: i2
    content: regla
  - id: i3
    content: Historia
  - id: i4
    content: estuche
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1
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
id: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: quick-classification
tier: Easy
anchor:
  heading: the-spanish-education-system
  position: after
concepts:
  - school vocabulary
skills:
  - recall
domain: igcse
prompt: 'Sort the school vocabulary: Materias or Útiles'
validator:
  kind: mapping
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1
version: 1
scenario: Match each clue to the sports story it describes.
theories:
  - id: th-a
    content: Javier Fernández and figure skating
  - id: th-b
    content: Capoeira
clues:
  - id: c1
    content: He became a world champion in figure skating.
  - id: c2
    content: It combines martial art and dance.
  - id: c3
    content: He trained in the United States and Canada.
  - id: c4
    content: The berimbau controls the rhythm and speed.
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1
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
id: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: evidence-match
tier: Easy
anchor:
  heading: capoeira
  position: after
concepts:
  - sports and sporting activities
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1
version: 1
sourceDomain: Spanish language learning through authentic communication
targetDomain: Second-language acquisition
scenario: >-
  Apply the lesson's progression from authentic input to guided production in a
  new language-learning context.
options:
  - id: a
    content: >-
      Begin with meaningful real-world materials, then guide learners toward
      increasingly independent communication.
  - id: b
    content: >-
      Begin with isolated grammar exercises, then add authentic materials only
      after all rules are mastered.
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
hints:
  - id: hint-1
    matcher:
      selectedOptionId: b
    hint: >-
      Focus on the lesson's movement from authentic input to guided and
      independent production.
:::

:::mechanic
schemaVersion: 1
id: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: 8-learning-through-authentic-communication
  position: after
concepts:
  - authentic communication
  - gradual language production
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1
version: 1
attributes:
  - id: size
    label: Size
  - id: beachDistance
    label: Distance from the beach
components:
  - id: casaCampo
    content: Casa en el campo — grande y muy cómoda
    metrics:
      size: 5
      beachDistance: 10
  - id: apartamentoCosta
    content: Apartamento en la costa — no muy grande y a pocos metros de la playa
    metrics:
      size: 2
      beachDistance: 1
  - id: casaAdosada
    content: Casa adosada — con un pequeño jardín
    metrics:
      size: 3
      beachDistance: 8
  - id: pisoCiudad
    content: Piso en la ciudad — muy luminoso, con balcón
    metrics:
      size: 3
      beachDistance: 7
requirements:
  - attributeId: size
    operator: <=
    value: 3
  - attributeId: beachDistance
    operator: <=
    value: 1
:::

:::mechanic-private
id: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1
version: 1
lessonSlug: 01-spanish-a1-personal-world-fundamentals-easy
type: constraint-construction
tier: Easy
anchor:
  heading: writing-about-your-city
  position: after
concepts:
  - types of home
  - home features
skills:
  - recall
domain: igcse
prompt: Select home features that meet all constraints.
validator:
  kind: invariants
  ref: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1:public
privateValidatorRef: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1:private
rewardIdentity: 01-spanish-a1-personal-world-fundamentals-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9],"sectionMechanics":[{"mechanicType":"multiple-choice","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"the-spanish-alphabet-and-spelling"},{"mechanicType":"sequence-builder","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"cultural-focus-the-siesta"},{"mechanicType":"quick-classification","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"cultural-focus-latin-music"},{"mechanicType":"constraint-construction","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"writing-about-your-city"},{"mechanicType":"tradeoff-decision","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"los-andes-chile"},{"mechanicType":"quick-classification","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"the-spanish-education-system"},{"mechanicType":"evidence-match","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"capoeira"},{"mechanicType":"abstract-transfer","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"8-learning-through-authentic-communication"}]}
:::