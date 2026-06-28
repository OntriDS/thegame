// thegame/lib/redis/gamification-lua.ts

/**
 * Atomic MP Minting Lua Script
 * 
 * Ensures that MP is only minted if the reward hasn't been claimed yet.
 * KEYS[1] = Reward Claim Key (ecosystem:classes:user:{userId}:reward:{rewardIdentity})
 * KEYS[2] = User Profile Key (ecosystem:gamification:user:{userId}:profile)
 * KEYS[3] = MP Ledger Key (ecosystem:gamification:user:{userId}:mp:ledger)
 * KEYS[4] = User Mechanic State Key (ecosystem:classes:user:{userId}:mechanic:{mechanicId}:{version})
 * KEYS[5] = Mechanics Telemetry Key (ecosystem:classes:telemetry:mechanics)
 * 
 * ARGV[1] = MP Amount
 * ARGV[2] = Ledger Entry JSON
 * ARGV[3] = Telemetry Entry JSON
 * ARGV[4] = Timestamp
 */
export const mintMpScript = `
  local rewardClaimKey = KEYS[1]
  local profileKey = KEYS[2]
  local mpLedgerKey = KEYS[3]
  local userMechanicStateKey = KEYS[4]
  local telemetryKey = KEYS[5]
  
  local mpAmount = tonumber(ARGV[1])
  local ledgerEntry = ARGV[2]
  local telemetryEntry = ARGV[3]
  local timestamp = ARGV[4]

  -- 1. Claim reward with NX
  local claimed = redis.call('SETNX', rewardClaimKey, timestamp)
  if claimed == 0 then
    return { err = "REWARD_ALREADY_CLAIMED" }
  end

  -- 2. Increment balances
  redis.call('HINCRBY', profileKey, 'mpBalance', mpAmount)
  redis.call('HINCRBY', profileKey, 'lifetimeMp', mpAmount)
  
  -- 3. Append to MP ledger
  redis.call('RPUSH', mpLedgerKey, ledgerEntry)
  
  -- 4. Update mechanic state
  redis.call('HSET', userMechanicStateKey, 'solved', 'true', 'solvedAt', timestamp)
  
  -- 5. Append telemetry
  redis.call('RPUSH', telemetryKey, telemetryEntry)

  return { ok = true }
`;

/**
 * Atomic MP to CP Exchange Lua Script
 * 
 * KEYS[1] = User Profile Key (ecosystem:gamification:user:{userId}:profile)
 * KEYS[2] = Exchange Idempotency Key
 * KEYS[3] = MP Ledger Key (ecosystem:gamification:user:{userId}:mp:ledger)
 * KEYS[4] = CP Ledger Key (ecosystem:gamification:user:{userId}:cp:ledger)
 * KEYS[5] = Economy Telemetry Key (ecosystem:gamification:telemetry:economy)
 * 
 * ARGV[1] = MP Amount to deduct
 * ARGV[2] = CP Amount to credit
 * ARGV[3] = MP Debit Ledger Entry JSON
 * ARGV[4] = CP Credit Ledger Entry JSON
 * ARGV[5] = Telemetry Entry JSON
 * ARGV[6] = Timestamp
 */
export const exchangeMpToCpScript = `
  local profileKey = KEYS[1]
  local idempotencyKey = KEYS[2]
  local mpLedgerKey = KEYS[3]
  local cpLedgerKey = KEYS[4]
  local telemetryKey = KEYS[5]
  
  local mpDeduct = tonumber(ARGV[1])
  local cpCredit = tonumber(ARGV[2])
  local mpLedgerEntry = ARGV[3]
  local cpLedgerEntry = ARGV[4]
  local telemetryEntry = ARGV[5]
  local timestamp = ARGV[6]

  -- 1. Claim idempotency key
  local claimed = redis.call('SETNX', idempotencyKey, timestamp)
  if claimed == 0 then
    return { err = "EXCHANGE_ALREADY_PROCESSED" }
  end

  -- 2. Verify sufficient MP balance
  local currentMp = tonumber(redis.call('HGET', profileKey, 'mpBalance') or '0')
  if currentMp < mpDeduct then
    redis.call('DEL', idempotencyKey) -- rollback idempotency if insufficient
    return { err = "INSUFFICIENT_MP" }
  end

  -- 3. Execute Exchange
  redis.call('HINCRBY', profileKey, 'mpBalance', -mpDeduct)
  redis.call('HINCRBY', profileKey, 'cpBalance', cpCredit)
  
  -- 4. Append ledgers
  redis.call('RPUSH', mpLedgerKey, mpLedgerEntry)
  redis.call('RPUSH', cpLedgerKey, cpLedgerEntry)
  
  -- 5. Append telemetry
  redis.call('RPUSH', telemetryKey, telemetryEntry)

  return { ok = true }
`;
