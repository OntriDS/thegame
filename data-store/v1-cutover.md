# V1 Entity Cutover

The shared KV wrapper now provides the compatibility boundary for entity records.

- Reads for `thegame:data:{entity}:{id}` prefer `thegame:v1:data:{entity}:{id}` and fall back to the canonical legacy key when no V1 shadow exists.
- Bulk reads use the same preference logic.
- V1-shaped writes update both keys while the compatibility period is active.
- Legacy-shaped writes update the canonical key and remove the staged V1 key, preventing stale V1 data from masking a newer legacy write.
- Deletes remove both representations.
- Non-entity settings and operational keys are unaffected.

Live audit (2026-08-23): 40 V1 mirrors remain active (25 Character, 8
FinancialRecord, 6 Item, 1 Player). Thirty-two differ materially from their
base `thegame:data:*` copies, so the shadow namespace has **not** been removed.
It remains the active read-preferred compatibility boundary until Increment 11
reconciles the base records and retires this wrapper behavior.
