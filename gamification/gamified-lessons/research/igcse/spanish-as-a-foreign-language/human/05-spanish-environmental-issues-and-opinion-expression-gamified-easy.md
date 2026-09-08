:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1
version: 1
categories:
  - id: cat-a
    label: Causa
  - id: cat-b
    label: Problema
items:
  - id: i1
    content: Tala excesiva
  - id: i2
    content: Deforestación
  - id: i3
    content: Basura en ríos
  - id: i4
    content: Contaminación del agua
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1
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
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: quick-classification
tier: Easy
anchor:
  heading: expresar-opiniones-y-reacciones
  position: after
concepts:
  - vocabulario ambiental
skills:
  - recall
domain: igcse
prompt: 'Sort the environmental concepts: Cause or Problem'
validator:
  kind: mapping
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c2-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1
version: 1
question: ¿Qué contamina los mares?
options:
  - id: a
    content: El petróleo
  - id: b
    content: Los fertilizantes
  - id: c
    content: Los gases de autos
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: multiple-choice
tier: Easy
anchor:
  heading: gram-tica-adjetivos-indefinidos
  position: after
concepts:
  - contaminación marina
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c3-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1
version: 1
scenario: >-
  A household wants to choose a renewable energy source based on its property
  and local conditions.
options:
  - id: solar
    content: Install solar panels
    pros:
      - can be installed on almost any roof
      - is more economical for small amounts of energy
    cons:
      - requires regular cleaning
      - depends on the amount of sunlight
      - changes the appearance of the roof
  - id: wind
    content: Install a wind turbine
    pros:
      - can be more viable for supplying all household appliances
      - requires very little maintenance
    cons:
      - requires a large garden or nearby land
      - depends on the amount of wind
      - has a greater visual impact
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1
version: 1
kind: rubric
scoring:
  solar: 4
  wind: 1
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: tradeoff-decision
tier: Easy
anchor:
  heading: energ-a-solar-y-e-lica-dom-stica
  position: after
concepts:
  - tradeoffs between domestic solar and wind energy
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c4-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1
version: 1
scenario: Relaciona cada pista con la teoría que explica mejor su impacto.
theories:
  - id: th-a
    content: La contaminación lumínica afecta la salud humana y a los animales.
  - id: th-b
    content: >-
      La huella de carbono proviene de actividades que emiten gases de efecto
      invernadero.
clues:
  - id: c1
    content: Puede causar alteraciones del sueño.
  - id: c2
    content: Los automóviles y aviones liberan dióxido de carbono.
  - id: c3
    content: Algunas aves se desorientan por las luces urbanas.
  - id: c4
    content: Las casas mal aisladas consumen más energía para calefacción.
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1
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
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: evidence-match
tier: Easy
anchor:
  heading: la-huella-de-carbono
  position: after
concepts:
  - impacto ambiental y salud
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c5-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1
version: 1
sourceDomain: Food choices and environmental impact
targetDomain: Environmental science
scenario: Apply the principles of responsible food consumption to environmental science.
options:
  - id: a
    content: >-
      Prioritise seasonal, local, fresh foods and reduce resource-intensive
      animal products and long-distance transport.
  - id: b
    content: >-
      Prioritise food appearance and availability regardless of season,
      processing, production method, or transport distance.
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1
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
      Focus on the lesson's links between food production, processing,
      transport, seasonality, and resource use.
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: abstract-transfer
tier: Easy
anchor:
  heading: muletillas-para-hablar-con-naturalidad
  position: after
concepts:
  - environmental effects of food choices
skills:
  - recall
domain: igcse
prompt: Complete the challenge.
validator:
  kind: rubric
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxPayloadBytes: 4096
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c6-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1
version: 1
scenario: Match each city clue to the theory it supports.
theories:
  - id: th-a
    content: Traffic and noise problems
  - id: th-b
    content: Waste and environmental pollution problems
clues:
  - id: c1
    content: Traffic fumes can contribute to asthma.
  - id: c2
    content: Street dirt can attract rats.
  - id: c3
    content: Motorway noise can cause headaches.
  - id: c4
    content: Polluted rivers cannot be used for recreation.
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1
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
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: evidence-match
tier: Easy
anchor:
  heading: 3-los-problemas-de-mi-ciudad
  position: after
concepts:
  - connected environmental and social city problems
skills:
  - recall
domain: igcse
prompt: Which theory do these clues support?
validator:
  kind: mapping
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c7-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1
version: 1
scenario: >-
  En Ciudad de México, la contaminación del aire causa graves problemas de salud
  y sigue aumentando.
startNodeId: n1
nodes:
  - id: n1
    question: ¿Cuál es la principal causa de la contaminación del aire?
    options:
      - id: a1
        content: Los vehículos
        nextNodeId: n2
      - id: b1
        content: La educación ciudadana
        nextNodeId: null
      - id: c1
        content: El transporte en bicicleta
        nextNodeId: null
  - id: n2
    question: ¿Qué puede contribuir a una solución a largo plazo?
    options:
      - id: a2
        content: La acción ciudadana y la educación
        nextNodeId: null
      - id: b2
        content: Aumentar el número de coches
        nextNodeId: null
      - id: c2
        content: Permitir más contaminación de los vehículos
        nextNodeId: null
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1
version: 1
kind: exact
correctAnswer: a1,a2
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: prediction
tier: Easy
anchor:
  heading: interjecciones-para-reaccionar
  position: after
concepts:
  - contaminación del aire y soluciones a largo plazo
skills:
  - recall
domain: igcse
prompt: ¿Cómo se desarrolla el problema de contaminación en Ciudad de México?
validator:
  kind: exact
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  timeLimitSeconds: 60
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c8-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1
version: 1
items:
  - id: i1
    content: Explicar los problemas
  - id: i2
    content: Explicar por qué preocupan
  - id: i3
    content: Sugerir soluciones
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1
version: 1
kind: sequence
correctSequence:
  - i1
  - i2
  - i3
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: sequence-builder
tier: Easy
anchor:
  heading: la-carta-formal
  position: after
concepts:
  - estructura de la carta formal
skills:
  - recall
domain: igcse
prompt: La progresión natural de una carta formal
validator:
  kind: sequence
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c9-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1
version: 1
attributes:
  - id: individual
    label: Acción individual
  - id: structural
    label: Acción estructural
components:
  - id: c1
    content: Ducharse en vez de bañarse
    metrics:
      individual: 1
      structural: 0
  - id: c2
    content: Cerrar el grifo al cepillarse los dientes
    metrics:
      individual: 1
      structural: 0
  - id: c3
    content: Bajar el precio del transporte público
    metrics:
      individual: 0
      structural: 1
  - id: c4
    content: Invertir en energías renovables, como la solar y la eólica
    metrics:
      individual: 0
      structural: 1
requirements:
  - attributeId: individual
    operator: '>='
    value: 2
  - attributeId: structural
    operator: '>='
    value: 1
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: constraint-construction
tier: Easy
anchor:
  heading: soluciones-cotidianas-y-estructurales
  position: after
concepts:
  - acciones individuales y estructurales
skills:
  - recall
domain: igcse
prompt: Selecciona acciones individuales y estructurales.
validator:
  kind: invariants
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c10-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1
version: 1
question: ¿Cuál es el mandato de hacer?
options:
  - id: a
    content: haz
  - id: b
    content: haces
  - id: c
    content: no hagas
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: multiple-choice
tier: Easy
anchor:
  heading: verbos-irregulares
  position: after
concepts:
  - imperativo afirmativo
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c11-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1
version: 1
attributes:
  - id: agua
    label: Ahorro de agua (litros)
  - id: energia
    label: Ahorro energético (%)
components:
  - id: c1
    content: >-
      Cerrar el grifo mientras te cepillas los dientes — ahorrar aproximadamente
      4 litros de agua
    metrics:
      agua: 4
      energia: 0
  - id: c2
    content: Ducharse un minuto menos — ahorrar aproximadamente 20 litros de agua
    metrics:
      agua: 20
      energia: 0
  - id: c3
    content: >-
      Bajar el termostato 1 °C en invierno — ahorrar el 10 % de la factura
      energética
    metrics:
      agua: 0
      energia: 10
requirements:
  - attributeId: agua
    operator: '>='
    value: 20
  - attributeId: energia
    operator: '>='
    value: 10
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1
version: 1
kind: invariants
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: constraint-construction
tier: Easy
anchor:
  heading: actividades-de-pr-ctica
  position: after
concepts:
  - datos ambientales cuantificados
skills:
  - recall
domain: igcse
prompt: Selecciona acciones que cumplan todas las restricciones.
validator:
  kind: invariants
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
  maxActions: 2
  maxPayloadBytes: 4096
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c12-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::mechanic-data
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1
version: 1
question: ¿Qué incluye la contaminación?
options:
  - id: a
    content: Aire, agua, tierra y ruido
  - id: b
    content: Solo el aire
  - id: c
    content: Solo reciclar
:::

:::mechanic-private
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1
version: 1
kind: exact
correctAnswer: a
:::

:::mechanic
schemaVersion: 1
id: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1
version: 1
lessonSlug: 05-spanish-environmental-issues-and-opinion-expression-easy
type: multiple-choice
tier: Easy
anchor:
  heading: self-checks
  position: after
concepts:
  - contaminación
skills:
  - recall
domain: igcse
prompt: Pick the right one.
validator:
  kind: exact
  ref: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1:private
  version: '1'
knowledgeBaseline: Lesson content provided up to this point.
limits:
  attemptsPerMinute: 5
publicPayloadRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1:public
privateValidatorRef: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1:private
rewardIdentity: 05-spanish-environmental-issues-and-opinion-expression-easy-c13-m1:v1
presentation:
  supportedModes:
    - pointer
    - keyboard
    - touch
    - screen-reader
active: true
:::

:::gamify-registry
{"gamifiedSections":[2,3,4,5,6,7,8,9,10,11,12,13],"sectionMechanics":[{"mechanicType":"quick-classification","__chunkIndex":2,"__version":1,"__tier":"Easy","__anchorId":"expresar-opiniones-y-reacciones"},{"mechanicType":"multiple-choice","__chunkIndex":3,"__version":1,"__tier":"Easy","__anchorId":"gram-tica-adjetivos-indefinidos"},{"mechanicType":"tradeoff-decision","__chunkIndex":4,"__version":1,"__tier":"Easy","__anchorId":"energ-a-solar-y-e-lica-dom-stica"},{"mechanicType":"evidence-match","__chunkIndex":5,"__version":1,"__tier":"Easy","__anchorId":"la-huella-de-carbono"},{"mechanicType":"abstract-transfer","__chunkIndex":6,"__version":1,"__tier":"Easy","__anchorId":"muletillas-para-hablar-con-naturalidad"},{"mechanicType":"evidence-match","__chunkIndex":7,"__version":1,"__tier":"Easy","__anchorId":"3-los-problemas-de-mi-ciudad"},{"mechanicType":"prediction","__chunkIndex":8,"__version":1,"__tier":"Easy","__anchorId":"interjecciones-para-reaccionar"},{"mechanicType":"sequence-builder","__chunkIndex":9,"__version":1,"__tier":"Easy","__anchorId":"la-carta-formal"},{"mechanicType":"constraint-construction","__chunkIndex":10,"__version":1,"__tier":"Easy","__anchorId":"soluciones-cotidianas-y-estructurales"},{"mechanicType":"multiple-choice","__chunkIndex":11,"__version":1,"__tier":"Easy","__anchorId":"verbos-irregulares"},{"mechanicType":"constraint-construction","__chunkIndex":12,"__version":1,"__tier":"Easy","__anchorId":"actividades-de-pr-ctica"},{"mechanicType":"multiple-choice","__chunkIndex":13,"__version":1,"__tier":"Easy","__anchorId":"self-checks"}]}
:::