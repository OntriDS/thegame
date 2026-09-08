:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c3-m1
version: 1
question: ¿Qué expresa «¿Podrías abrir la ventana?»?
options:
  - id: a
    content: Una petición cortés
  - id: b
    content: Una orden directa
  - id: c
    content: Una posibilidad pasada
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c3-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c3-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: multiple-choice
tier: Easy
anchor:
  heading: uses-of-the-conditional
  position: after
concepts:
  - uso cortés del condicional
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 04-spanish-ele-professional-world-unit-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c3-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c3-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c4-m1
version: 1
scenario: Match each clue to the theory it supports.
theories:
  - id: th-a
    content: Work is a human right protected by international standards.
  - id: th-b
    content: Job satisfaction depends on pay and personal preferences.
clues:
  - id: c1
    content: Article 23 recognizes the right to work.
  - id: c2
    content: Nearly 60% of workers are unhappy with their salary.
  - id: c3
    content: People have the right to freely choose their employment.
  - id: c4
    content: Different people value different aspects of work.
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c4-m1
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
id: 04-spanish-ele-professional-world-unit-easy-c4-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: evidence-match
tier: Easy
anchor:
  heading: existe-el-trabajo-perfecto
  position: after
concepts:
  - work as a human right and job satisfaction
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 04-spanish-ele-professional-world-unit-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c4-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c4-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c5-m1
version: 1
scenario: >-
  You want to earn money as a student while choosing between flexible work and
  building several clients.
options:
  - id: a
    content: Dar clases particulares a varios clientes por 5 euros la hora
    pros:
      - uses a school subject or instrument you know
      - several clients can provide regular work
    cons:
      - requires finding and coordinating several clients
      - the initial price is low
  - id: b
    content: Trabajar para tus padres ayudando con tareas de la casa
    pros:
      - working hours are highly flexible
      - tasks may include shopping or helping with the car
    cons:
      - the pay may be low
      - work depends on household tasks
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c5-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c5-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: ways-for-students-to-earn-money
  position: after
concepts:
  - ways students can earn money
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-spanish-ele-professional-world-unit-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c5-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c5-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c6-m1
version: 1
attributes:
  - id: universityStudy
    label: University study
  - id: vocationalTraining
    label: Vocational training
components:
  - id: c1
    content: Arquitecto/a — estudiar Arquitectura
    metrics:
      universityStudy: 1
      vocationalTraining: 0
  - id: c2
    content: Médico/a — estudiar Medicina
    metrics:
      universityStudy: 1
      vocationalTraining: 0
  - id: c3
    content: Cocinero/a — formación profesional
    metrics:
      universityStudy: 0
      vocationalTraining: 1
  - id: c4
    content: Electricista — formación profesional
    metrics:
      universityStudy: 0
      vocationalTraining: 1
requirements:
  - attributeId: universityStudy
    operator: '>='
    value: 1
  - attributeId: vocationalTraining
    operator: '>='
    value: 1
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c6-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c6-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: constraint-construction
tier: Easy
anchor:
  heading: formaci-n-profesional
  position: after
concepts:
  - profession-study correspondence
  - educational routes
skills:
  - recall
domain: igcse
prompt: Select professions representing both educational routes.
validator:
  kind: invariants
  ref: 04-spanish-ele-professional-world-unit-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c6-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c6-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c7-m1
version: 1
question: ¿Qué sigue a «si» en español?
options:
  - id: a
    content: El presente
  - id: b
    content: El futuro
  - id: c
    content: El infinitivo
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c7-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c7-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: multiple-choice
tier: Easy
anchor:
  heading: uses-of-the-future
  position: after
concepts:
  - future conditional
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 04-spanish-ele-professional-world-unit-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c7-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c7-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c9-m1
version: 1
layout: linear
sequence:
  - id: s1
    content: 'Carlos dijo: «Tengo bicicleta».'
  - id: s2
    isMissing: true
  - id: s3
    content: Carlos dijo que tenía bicicleta.
  - id: s4
    isMissing: true
  - id: s5
    content: esta puede cambiar a esa.
options:
  - id: o1
    content: Usa que y elimina comillas.
  - id: o2
    content: mis puede cambiar a sus.
  - id: o3
    content: Añade signos de interrogación.
  - id: o4
    content: Cambia dijo por pregunta.
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c9-m1
version: 1
kind: mapping
matches:
  s2: o1
  s4: o2
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c9-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: missing-step
tier: Easy
anchor:
  heading: other-changes-in-indirect-speech
  position: after
concepts:
  - indirect speech
skills:
  - recall
domain: igcse
prompt: What's missing from the indirect speech process?
validator:
  kind: mapping
  ref: 04-spanish-ele-professional-world-unit-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c9-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c9-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c10-m1
version: 1
items:
  - id: i1
    content: Encabezado with addresses, date, and subject
  - id: i2
    content: Brief formal greeting
  - id: i3
    content: Body developing the content clearly
  - id: i4
    content: Formal closing followed by name and signature
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c10-m1
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
id: 04-spanish-ele-professional-world-unit-easy-c10-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: sequence-builder
tier: Easy
anchor:
  heading: useful-fixed-expressions
  position: after
concepts:
  - formal letter structure
skills:
  - recall
domain: igcse
prompt: How a formal letter unfolds from beginning to end
validator:
  kind: sequence
  ref: 04-spanish-ele-professional-world-unit-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c10-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c10-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c12-m1
version: 1
categories:
  - id: cat-a
    label: -e endings
  - id: cat-b
    label: -a endings
items:
  - id: i1
    content: trabajar → trabaje
  - id: i2
    content: comer → coma
  - id: i3
    content: trabajar → trabajemos
  - id: i4
    content: vivir → vivamos
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c12-m1
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
id: 04-spanish-ele-professional-world-unit-easy-c12-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: quick-classification
tier: Easy
anchor:
  heading: three-core-uses
  position: after
concepts:
  - present subjunctive endings
skills:
  - recall
domain: igcse
prompt: 'Sort present subjunctive forms: -e endings or -a endings'
validator:
  kind: mapping
  ref: 04-spanish-ele-professional-world-unit-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c12-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c12-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c13-m1
version: 1
items:
  - id: i1
    content: Proofread your CV and cover letter
  - id: i2
    content: Practise your formal self-presentation
  - id: i3
    content: Arrive 10–15 minutes early
  - id: i4
    content: Turn off your mobile phone
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c13-m1
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
id: 04-spanish-ele-professional-world-unit-easy-c13-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: sequence-builder
tier: Easy
anchor:
  heading: 14-world-poverty
  position: after
concepts:
  - job interview protocol
skills:
  - recall
domain: igcse
prompt: How job interview preparation unfolds from beginning to end
validator:
  kind: sequence
  ref: 04-spanish-ele-professional-world-unit-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c13-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c13-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c14-m1
version: 1
attributes:
  - id: ageRequirement
    label: Age requirement stated
  - id: photoRequired
    label: Photo required
components:
  - id: dependiente
    content: >-
      Clothing shop assistant — weekend availability; experience and English
      valued; €12/hour
    metrics:
      ageRequirement: 0
      photoRequired: 0
  - id: encuestador
    content: >-
      Telephone survey interviewer — ages 16–20; good communicator; free
      afternoons and weekends; €5 per completed survey
    metrics:
      ageRequirement: 1
      photoRequired: 0
  - id: casting
    content: >-
      TV series casting — ages 15–22; photogenic; acting talent; fun; no
      experience required
    metrics:
      ageRequirement: 1
      photoRequired: 1
requirements:
  - attributeId: ageRequirement
    operator: '>='
    value: 1
  - attributeId: photoRequired
    operator: '>='
    value: 1
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c14-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c14-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: constraint-construction
tier: Easy
anchor:
  heading: 16-youth-job-advertisements
  position: after
concepts:
  - youth job requirements
skills:
  - recall
domain: igcse
prompt: Select the job offer that meets all constraints.
validator:
  kind: invariants
  ref: 04-spanish-ele-professional-world-unit-easy-c14-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c14-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c14-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c14-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c15-m1
version: 1
scenario: >-
  A student is choosing which criteria to prioritize when selecting a career in
  Russia.
options:
  - id: a
    content: Prioritize income and rapid, easy career advancement
    pros:
      - matches the two main criteria reported by young people
    cons:
      - >-
        the section does not identify which professions best satisfy these
        criteria
  - id: b
    content: Prioritize prestige, social status, self-realisation, or helping others
    pros:
      - includes values associated with prestigious careers
    cons:
      - only 10% of graduating students value these factors
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c15-m1
version: 1
kind: rubric
scoring:
  a: 4
  b: 1
:::

:::mechanic
schemaVersion: 1
id: 04-spanish-ele-professional-world-unit-easy-c15-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: 17-case-study-popular-professions-in-russia
  position: after
concepts:
  - career-choice criteria
  - professional prestige
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 04-spanish-ele-professional-world-unit-easy-c15-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c15-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c15-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c15-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c2-m1
version: 1
categories:
  - id: cat-a
    label: Profession
  - id: cat-b
    label: Question
items:
  - id: i1
    content: médico/a
  - id: i2
    content: ¿En qué trabajas?
  - id: i3
    content: jardinero/a
  - id: i4
    content: ¿A qué te dedicas?
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c2-m1
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
id: 04-spanish-ele-professional-world-unit-easy-c2-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: quick-classification
tier: Easy
anchor:
  heading: describing-professional-activity
  position: after
concepts:
  - profession vocabulary
  - asking about professions
skills:
  - recall
domain: igcse
prompt: 'Sort the Spanish terms: profession or question'
validator:
  kind: mapping
  ref: 04-spanish-ele-professional-world-unit-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c2-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c2-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 04-spanish-ele-professional-world-unit-easy-c8-m1
version: 1
categories:
  - id: cat-a
    label: Informal
  - id: cat-b
    label: Formal
items:
  - id: i1
    content: ¿Diga?
  - id: i2
    content: ¿Podría hablar con la Sra. López?
  - id: i3
    content: ¿Está María?
  - id: i4
    content: ¿En qué puedo ayudarle?
:::

:::mechanic-private
id: 04-spanish-ele-professional-world-unit-easy-c8-m1
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
id: 04-spanish-ele-professional-world-unit-easy-c8-m1
version: 1
lessonSlug: 04-spanish-ele-professional-world-unit-easy
type: quick-classification
tier: Easy
anchor:
  heading: formal-and-informal-register
  position: after
concepts:
  - telephone register
skills:
  - recall
domain: igcse
prompt: 'Sort telephone expressions: informal or formal'
validator:
  kind: mapping
  ref: 04-spanish-ele-professional-world-unit-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 04-spanish-ele-professional-world-unit-easy-c8-m1:public
privateValidatorRef: 04-spanish-ele-professional-world-unit-easy-c8-m1:private
rewardIdentity: 04-spanish-ele-professional-world-unit-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,12,13,14,15],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"describing-professional-activity"},{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"uses-of-the-conditional"},{"mechanicType":"evidence-match","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"existe-el-trabajo-perfecto"},{"mechanicType":"tradeoff-decision","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"ways-for-students-to-earn-money"},{"mechanicType":"constraint-construction","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"formaci-n-profesional"},{"mechanicType":"multiple-choice","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"uses-of-the-future"},{"mechanicType":"quick-classification","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"formal-and-informal-register"},{"mechanicType":"missing-step","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"other-changes-in-indirect-speech"},{"mechanicType":"sequence-builder","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"useful-fixed-expressions"},{"mechanicType":"quick-classification","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"three-core-uses"},{"mechanicType":"sequence-builder","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"14-world-poverty"},{"mechanicType":"constraint-construction","__chunkIndex":14,"__version":1,"__tier":"Easy","__anchorId":"16-youth-job-advertisements"},{"mechanicType":"tradeoff-decision","__chunkIndex":15,"__version":1,"__tier":"Easy","__anchorId":"17-case-study-popular-professions-in-russia"}]}
:::