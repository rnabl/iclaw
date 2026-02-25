/**
 * Structured Logger for Sub-Agents
 * 
 * Writes JSONL logs to shared volume for main agent to monitor.
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface LogEntry {
  timestamp: string;
  agentId: string;
  runId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  message: string;
  data?: Record<string, unknown>;
}

export class SubAgentLogger {
  private logDir: string;
  private agentId: string;
  private runId: string;

  constructor(agentId: string, runId: string, logDir?: string) {
    this.agentId = agentId;
    this.runId = runId;
    this.logDir = logDir || process.env.LOG_DIR || '/workspace/logs';

    // Ensure log directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getLogPath(): string {
    const date = new Date().toISOString().split('T')[0];
    return join(this.logDir, `${this.agentId}-${date}.jsonl`);
  }

  private write(entry: LogEntry) {
    const line = JSON.stringify(entry) + '\n';
    appendFileSync(this.getLogPath(), line);
    
    // Also write to stdout for docker logs
    const emoji = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : entry.level === 'info' ? '✅' : '🔍';
    console.log(`[${entry.timestamp}] ${emoji} ${entry.event}: ${entry.message}`);
  }

  debug(event: string, message: string, data?: Record<string, unknown>) {
    this.write({
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      runId: this.runId,
      level: 'debug',
      event,
      message,
      data
    });
  }

  info(event: string, message: string, data?: Record<string, unknown>) {
    this.write({
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      runId: this.runId,
      level: 'info',
      event,
      message,
      data
    });
  }

  warn(event: string, message: string, data?: Record<string, unknown>) {
    this.write({
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      runId: this.runId,
      level: 'warn',
      event,
      message,
      data
    });
  }

  error(event: string, message: string, data?: Record<string, unknown>) {
    this.write({
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      runId: this.runId,
      level: 'error',
      event,
      message,
      data
    });
  }

  // Specific events for outreach
  businessDiscovered(business: { name: string; id: string; city?: string }) {
    this.info('business_discovered', `Found: ${business.name}`, business);
  }

  competitorFound(business: string, competitor: string) {
    this.info('competitor_found', `${competitor} outranks ${business}`, { business, competitor });
  }

  emailGenerated(business: string, recipient: string) {
    this.info('email_generated', `Email ready for ${business}`, { business, recipient });
  }

  emailSent(business: string, recipient: string, messageId?: string) {
    this.info('email_sent', `Sent to ${recipient}`, { business, recipient, messageId });
  }

  emailFailed(business: string, recipient: string, error: string) {
    this.error('email_failed', `Failed for ${recipient}: ${error}`, { business, recipient, error });
  }

  workflowStarted(params: Record<string, unknown>) {
    this.info('workflow_started', 'Outreach workflow starting', params);
  }

  workflowCompleted(stats: { discovered: number; emailed: number; failed: number }) {
    this.info('workflow_completed', `Done! ${stats.emailed}/${stats.discovered} sent`, stats);
  }

  workflowFailed(error: string) {
    this.error('workflow_failed', `Workflow failed: ${error}`, { error });
  }
}
