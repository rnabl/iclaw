/**
 * Main Agent Log Monitor
 * 
 * Watches sub-agent log files and provides:
 * - Real-time status updates
 * - Error alerting
 * - Workflow progress tracking
 * - Summary generation
 */

import { watch, existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

export interface LogEntry {
  timestamp: string;
  agentId: string;
  runId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface AgentStatus {
  agentId: string;
  runId: string;
  status: 'running' | 'completed' | 'failed' | 'unknown';
  lastEvent: string;
  lastUpdate: string;
  stats?: Record<string, number>;
  errors: string[];
}

export class AgentLogMonitor extends EventEmitter {
  private logDir: string;
  private watchers: Map<string, ReturnType<typeof watch>> = new Map();
  private agentStatuses: Map<string, AgentStatus> = new Map();
  private filePositions: Map<string, number> = new Map();
  private isWatching = false;

  constructor(logDir?: string) {
    super();
    this.logDir = logDir || process.env.AGENT_LOG_DIR || './logs/agents';
  }

  start(): void {
    if (this.isWatching) return;
    
    if (!existsSync(this.logDir)) {
      console.log(`[LogMonitor] Log directory ${this.logDir} does not exist, creating...`);
      return;
    }

    this.isWatching = true;
    console.log(`[LogMonitor] Watching: ${this.logDir}`);

    // Watch for new files
    const dirWatcher = watch(this.logDir, (eventType, filename) => {
      if (filename && filename.endsWith('.jsonl')) {
        this.watchFile(join(this.logDir, filename));
      }
    });
    this.watchers.set('__dir__', dirWatcher);

    // Watch existing files
    const files = readdirSync(this.logDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      this.watchFile(join(this.logDir, file));
    }

    this.emit('started');
  }

  stop(): void {
    if (!this.isWatching) return;
    
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.isWatching = false;
    
    this.emit('stopped');
    console.log('[LogMonitor] Stopped');
  }

  private watchFile(filepath: string): void {
    if (this.watchers.has(filepath)) return;

    // Initialize position to end of file (only read new entries)
    const stats = statSync(filepath);
    this.filePositions.set(filepath, stats.size);

    const fileWatcher = watch(filepath, () => {
      this.readNewEntries(filepath);
    });
    
    this.watchers.set(filepath, fileWatcher);
    console.log(`[LogMonitor] Watching file: ${filepath}`);
  }

  private readNewEntries(filepath: string): void {
    try {
      const currentPos = this.filePositions.get(filepath) || 0;
      const stats = statSync(filepath);
      
      if (stats.size <= currentPos) return;

      const content = readFileSync(filepath, 'utf-8');
      const newContent = content.substring(currentPos);
      const lines = newContent.split('\n').filter(l => l.trim());

      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          this.processEntry(entry);
        } catch {
          // Skip malformed lines
        }
      }

      this.filePositions.set(filepath, stats.size);
    } catch (err) {
      console.error(`[LogMonitor] Error reading ${filepath}:`, err);
    }
  }

  private processEntry(entry: LogEntry): void {
    const key = `${entry.agentId}:${entry.runId}`;
    
    let status = this.agentStatuses.get(key);
    if (!status) {
      status = {
        agentId: entry.agentId,
        runId: entry.runId,
        status: 'running',
        lastEvent: entry.event,
        lastUpdate: entry.timestamp,
        errors: []
      };
      this.agentStatuses.set(key, status);
      this.emit('agent_started', status);
    }

    // Update status
    status.lastEvent = entry.event;
    status.lastUpdate = entry.timestamp;

    // Track errors
    if (entry.level === 'error') {
      status.errors.push(entry.message);
      this.emit('agent_error', { ...status, error: entry.message, data: entry.data });
    }

    // Detect workflow completion/failure
    if (entry.event === 'workflow_completed') {
      status.status = 'completed';
      status.stats = entry.data as Record<string, number>;
      this.emit('agent_completed', status);
    } else if (entry.event === 'workflow_failed') {
      status.status = 'failed';
      this.emit('agent_failed', status);
    }

    // Emit generic event
    this.emit('log', entry);
  }

  getStatus(agentId?: string): AgentStatus[] {
    const statuses = Array.from(this.agentStatuses.values());
    if (agentId) {
      return statuses.filter(s => s.agentId === agentId);
    }
    return statuses;
  }

  getActiveAgents(): AgentStatus[] {
    return this.getStatus().filter(s => s.status === 'running');
  }

  getRecentLogs(agentId: string, runId: string, limit = 50): LogEntry[] {
    const entries: LogEntry[] = [];
    
    const files = readdirSync(this.logDir)
      .filter(f => f.startsWith(agentId) && f.endsWith('.jsonl'))
      .sort()
      .reverse();

    for (const file of files) {
      const content = readFileSync(join(this.logDir, file), 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines.reverse()) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          if (entry.runId === runId) {
            entries.push(entry);
            if (entries.length >= limit) break;
          }
        } catch {
          // Skip
        }
      }
      
      if (entries.length >= limit) break;
    }

    return entries.reverse();
  }

  // Summary for LLM context
  generateSummary(): string {
    const statuses = this.getStatus();
    const active = statuses.filter(s => s.status === 'running');
    const completed = statuses.filter(s => s.status === 'completed');
    const failed = statuses.filter(s => s.status === 'failed');

    let summary = `## Sub-Agent Status\n\n`;
    summary += `- Active: ${active.length}\n`;
    summary += `- Completed: ${completed.length}\n`;
    summary += `- Failed: ${failed.length}\n\n`;

    if (active.length > 0) {
      summary += `### Currently Running\n`;
      for (const s of active) {
        summary += `- **${s.agentId}** (${s.runId}): ${s.lastEvent}\n`;
      }
      summary += '\n';
    }

    if (completed.length > 0) {
      summary += `### Recently Completed\n`;
      for (const s of completed.slice(-5)) {
        const stats = s.stats ? JSON.stringify(s.stats) : 'no stats';
        summary += `- **${s.agentId}** (${s.runId}): ${stats}\n`;
      }
      summary += '\n';
    }

    if (failed.length > 0) {
      summary += `### Recent Failures\n`;
      for (const s of failed.slice(-3)) {
        summary += `- **${s.agentId}** (${s.runId}): ${s.errors.slice(-1)[0] || 'unknown error'}\n`;
      }
    }

    return summary;
  }
}

// Singleton for harness
export const agentMonitor = new AgentLogMonitor();
