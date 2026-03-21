/** Shared response shape for MCP integrity audits (serverless-safe: capped issues). */

export const INTEGRITY_ISSUES_CAP = 10;

export type IntegrityIssue = {
  code: string;
  entityType?: string;
  entityId?: string;
  detail: string;
};

export type IntegrityAuditResult = {
  ok: boolean;
  audit: string;
  scope: { month: number; year: number; mmyy: string };
  summary: {
    totalIssueCount: number;
    truncated: boolean;
    notes?: string;
  };
  issues: IntegrityIssue[];
};
