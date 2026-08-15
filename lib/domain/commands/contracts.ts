import type { CommandId, UtcIsoString } from '@/types/entities';
import type { EntityType } from '@/types/enums';

export type { CommandId };
export type ActorId = string;

export interface EntityCommandEnvelope<TPayload = any> {
  commandId: CommandId;
  expectedVersion: number;
  actorId: ActorId;
  payload: TPayload;
  occurredAt: UtcIsoString;
}

export interface CommandOutcomeV1 {
  commandId: CommandId;
  aggregate: { type: string; id: string };
  aggregateVersion: number;
  state: 'completed' | 'failed';
  errorCode?: string;
  message?: string;
  createdAt: Date;
}

export interface TransitionFactV1<TType = string, TPayload = any> {
  factId: string;
  eventType: TType;
  aggregate: { type: string; id: string };
  aggregateVersion: number;
  sequence: number;
  commandId: CommandId;
  occurredAt: UtcIsoString;
  schemaVersion: number;
  payload: TPayload;
}

export type TaskCommand = any;
export type SaleCommand = any;
export type FinancialRecordCommand = any;
