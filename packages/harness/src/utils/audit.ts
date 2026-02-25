/**
 * Security Audit Logger
 * 
 * Logs security-sensitive operations (secret access, policy violations, etc.)
 * to a dedicated audit log for compliance and forensics.
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface AuditEvent {
  timestamp: string;
  event: 'secret_stored' | 'secret_retrieved' | 'secret_deleted' | 'secret_access_denied' | 'policy_violation';
  tenantId: string;
  provider?: string;
  tool?: string;
  success: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
}

class AuditLogger {
  private logDir: string;
  private enabled: boolean;

  constructor() {
    // Default to .logs/audit in current directory
    this.logDir = process.env.AUDIT_LOG_DIR || join(process.cwd(), '.logs', 'audit');
    this.enabled = process.env.AUDIT_LOGGING !== 'false'; // Enabled by default
    
    if (this.enabled) {
      this.ensureLogDir();
    }
  }

  private ensureLogDir(): void {
    if (!existsSync(this.logDir)) {
      try {
        mkdirSync(this.logDir, { recursive: true });
      } catch (error) {
        console.error('[AuditLogger] Failed to create audit log directory:', error);
        this.enabled = false;
      }
    }
  }

  /**
   * Log a security audit event
   */
  log(event: AuditEvent): void {
    if (!this.enabled) return;

    const logEntry = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    try {
      // Write to daily log file
      const date = new Date().toISOString().split('T')[0];
      const logFile = join(this.logDir, `audit-${date}.jsonl`);
      
      appendFileSync(logFile, JSON.stringify(logEntry) + '\n', 'utf-8');
      
      // Also log to console for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[Audit]', JSON.stringify(logEntry));
      }
    } catch (error) {
      console.error('[AuditLogger] Failed to write audit log:', error);
    }
  }

  /**
   * Log secret storage
   */
  logSecretStored(tenantId: string, provider: string, success: boolean, reason?: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      event: 'secret_stored',
      tenantId,
      provider,
      success,
      reason,
    });
  }

  /**
   * Log secret retrieval
   */
  logSecretRetrieved(
    tenantId: string,
    provider: string,
    tool: string | undefined,
    success: boolean,
    reason?: string
  ): void {
    this.log({
      timestamp: new Date().toISOString(),
      event: 'secret_retrieved',
      tenantId,
      provider,
      tool,
      success,
      reason,
    });
  }

  /**
   * Log secret deletion
   */
  logSecretDeleted(tenantId: string, provider: string, success: boolean): void {
    this.log({
      timestamp: new Date().toISOString(),
      event: 'secret_deleted',
      tenantId,
      provider,
      success,
    });
  }

  /**
   * Log secret access denial
   */
  logSecretAccessDenied(
    tenantId: string,
    provider: string,
    tool: string | undefined,
    reason: string
  ): void {
    this.log({
      timestamp: new Date().toISOString(),
      event: 'secret_access_denied',
      tenantId,
      provider,
      tool,
      success: false,
      reason,
    });
  }

  /**
   * Log policy violation
   */
  logPolicyViolation(
    tenantId: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log({
      timestamp: new Date().toISOString(),
      event: 'policy_violation',
      tenantId,
      success: false,
      reason,
      metadata,
    });
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
