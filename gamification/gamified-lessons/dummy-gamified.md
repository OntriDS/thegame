# Comprehensive Mechanics Test Lesson {#intro}

This lesson tests all 12 mechanics to ensure the gamify compiler strictly passes them without errors.

## 1. Quick Classification {#h1}

:::mechanic-data{id="payload-01"}
categories:
  - "Red"
  - "Blue"
items:
  - id: "item1"
    content: "Apple"
  - id: "item2"
    content: "Sky"
  - id: "item3"
    content: "Cherry"
:::

:::mechanic-private{id="eval-01"}
evaluator:
  acceptedMappings:
    item1: ["Red"]
    item2: ["Blue"]
    item3: ["Red"]
:::

:::mechanic
schemaVersion: 1
id: "test-01"
version: 1
type: "quick-classification"
tier: "Easy"
anchor:
  heading: "h1"
  position: "after"
concepts: ["colors"]
skills: ["identifying"]
domain: "general"
prompt: "Sort by color."
validator:
  kind: "mapping"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-01"
privateValidatorRef: "eval-01"
:::

## 2. Missing Step {#h2}

:::mechanic-data{id="payload-02"}
gap:
  id: "gap1"
  type: "inline"
options:
  - "1"
  - "2"
:::

:::mechanic-private{id="eval-02"}
evaluator:
  correctAnswer: "2"
misconceptionRules:
  - trigger: "1"
    feedbackCode: "WRONG_NUMBER"
:::

:::mechanic
schemaVersion: 1
id: "test-02"
version: 1
type: "missing-step"
tier: "Easy"
anchor:
  heading: "h2"
  position: "after"
concepts: ["math"]
skills: ["addition"]
domain: "general"
prompt: "Fill the gap."
validator:
  kind: "exact"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-02"
privateValidatorRef: "eval-02"
:::

## 3. Sequence Builder {#h3}

:::mechanic-data{id="payload-03"}
items:
  - "Step 1"
  - "Step 2"
  - "Step 3"
  - "Step 4"
:::

:::mechanic-private{id="eval-03"}
evaluator:
  correctOrder: ["Step 1", "Step 2", "Step 3", "Step 4"]
misconceptionRules:
  - trigger: "Step 2"
    feedbackCode: "WRONG_START"
:::

:::mechanic
schemaVersion: 1
id: "test-03"
version: 1
type: "sequence-builder"
tier: "Easy"
anchor:
  heading: "h3"
  position: "after"
concepts: ["logic"]
skills: ["ordering"]
domain: "general"
prompt: "Order these."
validator:
  kind: "sequence"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-03"
privateValidatorRef: "eval-03"
:::

## 4. Parameter Tuner {#h4}

:::mechanic-data{id="payload-04"}
controls:
  - id: "speed"
    min: 0
    max: 10
:::

:::mechanic-private{id="eval-04"}
evaluator:
  acceptedRange:
    speed: { min: 5, max: 7 }
misconceptionRules:
  - trigger: "speed < 5"
    feedbackCode: "TOO_SLOW"
:::

:::mechanic
schemaVersion: 1
id: "test-04"
version: 1
type: "parameter-tuner"
tier: "Medium"
anchor:
  heading: "h4"
  position: "after"
concepts: ["physics"]
skills: ["tuning"]
domain: "general"
prompt: "Tune it."
validator:
  kind: "range"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-04"
privateValidatorRef: "eval-04"
:::

## 5. Prediction {#h5}

:::mechanic-data{id="payload-05"}
domain: "weather"
scenarioRef: "scenario-1"
responseShape: "single-value"
options:
  - "Rain"
  - "Sun"
:::

:::mechanic-private{id="eval-05"}
evaluator:
  acceptedResult: "Rain"
misconceptionRules:
  - trigger: "Sun"
    feedbackCode: "WRONG_WEATHER"
:::

:::mechanic
schemaVersion: 1
id: "test-05"
version: 1
type: "prediction"
tier: "Medium"
anchor:
  heading: "h5"
  position: "after"
concepts: ["weather"]
skills: ["forecasting"]
domain: "general"
prompt: "Predict."
validator:
  kind: "exact"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-05"
privateValidatorRef: "eval-05"
:::

## 6. System Simulation {#h6}

:::mechanic-data{id="payload-06"}
controls:
  - id: "temp"
    min: 0
    max: 100
budgets:
  energy: 100
maxActions: 5
transitionModelRef: "model-1"
:::

:::mechanic-private{id="eval-06"}
evaluator:
  goalState:
    temp: { min: 50, max: 60 }
misconceptionRules:
  - trigger: "temp > 60"
    feedbackCode: "TOO_HOT"
:::

:::mechanic
schemaVersion: 1
id: "test-06"
version: 1
type: "system-simulation"
tier: "Medium"
anchor:
  heading: "h6"
  position: "after"
concepts: ["thermo"]
skills: ["control"]
domain: "general"
prompt: "Simulate."
validator:
  kind: "invariants"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-06"
privateValidatorRef: "eval-06"
:::

## 7. Evidence Match {#h7}

:::mechanic-data{id="payload-07"}
claims:
  - id: "claim1"
    text: "Water boils at 100C"
evidencePool:
  - id: "ev1"
    text: "Experiment A"
:::

:::mechanic-private{id="eval-07"}
acceptedMappings:
  claim1: ["ev1"]
rubric:
  rubricRef: "rubric-1"
  rubricVersion: "1"
  mode: "deterministic"
  requiredDimensions: ["accuracy"]
  deterministicPrechecks: ["length"]
  scoringBands:
    - { minScore: 0, maxScore: 50, mpAward: 0 }
    - { minScore: 51, maxScore: 100, mpAward: 100 }
:::

:::mechanic
schemaVersion: 1
id: "test-07"
version: 1
type: "evidence-match"
tier: "Hard"
anchor:
  heading: "h7"
  position: "after"
concepts: ["science"]
skills: ["matching"]
domain: "general"
prompt: "Match evidence."
validator:
  kind: "mapping"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-07"
privateValidatorRef: "eval-07"
:::

## 8. Diagnostic Lab {#h8}

:::mechanic-data{id="payload-08"}
scenario: "Fix the bug."
visibleTests:
  - id: "test1"
    input: "a"
:::

:::mechanic-private{id="eval-08"}
testSuiteRef: "ts-1"
execution:
  sandboxProfile: "edge-safe"
  runtime: "typescript"
  limits:
    cpuTimeMs: 500
    memoryMb: 128
    wallClockMs: 2000
    outputBytes: 1024
    maxSourceBytes: 5000
:::

:::mechanic
schemaVersion: 1
id: "test-08"
version: 1
type: "diagnostic-lab"
tier: "Hard"
anchor:
  heading: "h8"
  position: "after"
concepts: ["coding"]
skills: ["debugging"]
domain: "general"
prompt: "Diagnose."
validator:
  kind: "test-suite"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
limits:
  attemptsPerMinute: 3
publicPayloadRef: "payload-08"
privateValidatorRef: "eval-08"
:::

## 9. Constraint Construction {#h9}

:::mechanic-data{id="payload-09"}
outputShape: "json"
visibleConstraints:
  - "Must have key X"
:::

:::mechanic-private{id="eval-09"}
rubricRef: "rubric-2"
rubric:
  rubricRef: "rubric-2"
  rubricVersion: "1"
  mode: "deterministic"
  requiredDimensions: ["format"]
  deterministicPrechecks: ["json-valid"]
  scoringBands:
    - { minScore: 0, maxScore: 50, mpAward: 0 }
    - { minScore: 51, maxScore: 100, mpAward: 100 }
:::

:::mechanic
schemaVersion: 1
id: "test-09"
version: 1
type: "constraint-construction"
tier: "Hard"
anchor:
  heading: "h9"
  position: "after"
concepts: ["json"]
skills: ["formatting"]
domain: "general"
prompt: "Construct."
validator:
  kind: "rubric"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
publicPayloadRef: "payload-09"
privateValidatorRef: "eval-09"
:::

## 10. Tradeoff Decision {#h10}

:::mechanic-data{id="payload-10"}
scenario: "Choose a path."
options:
  - "Path A"
  - "Path B"
rationaleDimensions: ["cost"]
:::

:::mechanic-private{id="eval-10"}
rubricRef: "rubric-3"
maxAwardMp: 100
rubric:
  rubricRef: "rubric-3"
  rubricVersion: "1"
  mode: "ai-assisted"
  requiredDimensions: ["cost"]
  deterministicPrechecks: ["length"]
  scoringBands:
    - { minScore: 0, maxScore: 50, mpAward: 0 }
    - { minScore: 51, maxScore: 100, mpAward: 100 }
:::

:::mechanic
schemaVersion: 1
id: "test-10"
version: 1
type: "tradeoff-decision"
tier: "Epic"
anchor:
  heading: "h10"
  position: "after"
concepts: ["strategy"]
skills: ["decision"]
domain: "general"
prompt: "Decide."
validator:
  kind: "rubric"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
publicPayloadRef: "payload-10"
privateValidatorRef: "eval-10"
:::

## 11. Complex System Repair {#h11}

:::mechanic-data{id="payload-11"}
systemStateRef: "state-1"
visibleTests:
  - id: "test1"
    input: "run"
:::

:::mechanic-private{id="eval-11"}
testSuiteRef: "ts-2"
execution:
  sandboxProfile: "edge-safe"
  runtime: "typescript"
  limits:
    cpuTimeMs: 500
    memoryMb: 128
    wallClockMs: 2000
    outputBytes: 1024
    maxSourceBytes: 5000
:::

:::mechanic
schemaVersion: 1
id: "test-11"
version: 1
type: "complex-system-repair"
tier: "Epic"
anchor:
  heading: "h11"
  position: "after"
concepts: ["systems"]
skills: ["repair"]
domain: "general"
prompt: "Repair."
validator:
  kind: "test-suite"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
publicPayloadRef: "payload-11"
privateValidatorRef: "eval-11"
:::

## 12. Abstract Transfer {#h12}

:::mechanic-data{id="payload-12"}
sourceConcepts: ["A"]
scenario: "Apply A to B."
requiredOutput:
  kind: "written"
:::

:::mechanic-private{id="eval-12"}
structuralDistanceRef: "sd-1"
invalidAnalogies: ["bad-1"]
principleChecks: ["check-1"]
rubricRef: "rubric-4"
rubric:
  rubricRef: "rubric-4"
  rubricVersion: "1"
  mode: "ai-assisted"
  requiredDimensions: ["accuracy"]
  deterministicPrechecks: ["length"]
  scoringBands:
    - { minScore: 0, maxScore: 50, mpAward: 0 }
    - { minScore: 51, maxScore: 100, mpAward: 100 }
:::

:::mechanic
schemaVersion: 1
id: "test-12"
version: 1
type: "abstract-transfer"
tier: "Epic"
anchor:
  heading: "h12"
  position: "after"
concepts: ["transfer"]
skills: ["applying"]
domain: "general"
prompt: "Transfer."
validator:
  kind: "rubric"
  ref: "core-validator"
  version: "1"
knowledgeBaseline: "None"
publicPayloadRef: "payload-12"
privateValidatorRef: "eval-12"
:::
