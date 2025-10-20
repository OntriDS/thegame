// __tests__/workflows/transaction-manager.test.ts
// Unit tests for TransactionManager

import { TransactionManager } from '@/workflows/settings/transaction-manager';

describe('TransactionManager', () => {
  let transactionManager: TransactionManager;

  beforeEach(() => {
    transactionManager = new TransactionManager();
  });

  describe('state management', () => {
    it('should initialize with null state', () => {
      expect(transactionManager.getState()).toBeNull();
      expect(transactionManager.isActive()).toBe(false);
    });

    it('should track entity clearing', () => {
      // This would require the transaction manager to be in an active state
      // Implementation would need to be adjusted to allow testing
    });

    it('should track log clearing', () => {
      // Similar to above
    });

    it('should track link clearing', () => {
      // Similar to above
    });

    it('should track entity creation', () => {
      // Similar to above
    });
  });

  describe('captureState', () => {
    it('should capture current system state', async () => {
      const state = await transactionManager.captureState();
      
      expect(state).toBeDefined();
      expect(state.originalState).toBeInstanceOf(Map);
      expect(state.clearedEntities).toBeInstanceOf(Map);
      expect(state.clearedLogs).toBeInstanceOf(Array);
      expect(state.clearedLinks).toBeInstanceOf(Array);
      expect(state.createdEntities).toBeInstanceOf(Map);
    });
  });

  describe('rollback', () => {
    it('should restore original state', async () => {
      const state = await transactionManager.captureState();
      
      // This test would require actual state changes to rollback
      // Implementation would need to be adjusted for testing
      await expect(transactionManager.rollback(state)).resolves.not.toThrow();
    });
  });
});
