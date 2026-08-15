# V1 Entity Cutover

The shared KV wrapper now provides the compatibility boundary for entity records.

- Reads for `thegame:data:{entity}:{id}` prefer `thegame:v1:data:{entity}:{id}` and fall back to the canonical legacy key when no V1 shadow exists.
- Bulk reads use the same preference logic.
- V1-shaped writes update both keys while the compatibility period is active.
- Legacy-shaped writes update the canonical key and remove the staged V1 key, preventing stale V1 data from masking a newer legacy write.
- Deletes remove both representations.
- Non-entity settings and operational keys are unaffected.

The V1 shadow namespace was used only during promotion and has now been removed after canonical verification. The compatibility fallback remains intentionally available so any unconverted or legacy-shaped future write can be read safely while writers are being finalized.
