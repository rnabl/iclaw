/**
 * Task Queue System
 * 
 * Manages async task execution with ephemeral tokens for security.
 * Supports queuing, prioritization, and concurrent processing.
 * Uses EventEmitter for real-time task completion notifications.
 */

import { nanoid } from 'nanoid';
import { QueuedTask } from './types';
import { createEphemeralToken, revokeToken } from '../auth/ephemeral-tokens';
import { runner } from '../../execution';
import { EventEmitter } from 'events';

export interface QueueOptions {
  maxConcurrency?: number;
  priorityLevels?: number;
  storage?: 'memory' | 'redis' | 'sqlite';
}

export class TaskQueue extends EventEmitter {
  private queue: Map<string, QueuedTask> = new Map();
  private running: Set<string> = new Set();
  private maxConcurrency: number;
  private processing: boolean = false;

  constructor(options: QueueOptions = {}) {
    super();
    this.maxConcurrency = options.maxConcurrency || 5;
  }

  /**
   * Enqueue a new task
   */
  async enqueue(params: {
    executionId: string;
    stepId: string;
    tool: string;
    input: Record<string, any>;
    tenantId: string;
    tokenTTL?: number;  // In seconds
    maxAttempts?: number;
  }): Promise<string> {
    const {
      executionId,
      stepId,
      tool,
      input,
      tenantId,
      tokenTTL = 1800,  // 30 minutes default
      maxAttempts = 2
    } = params;

    // Create ephemeral token for this task
    const token = await createEphemeralToken({
      tenantId,
      workflowId: tool,
      expiresIn: tokenTTL,
      scopes: [`execute:${tool}`]
    });

    const task: QueuedTask = {
      id: nanoid(),
      executionId,
      stepId,
      tool,
      input,
      token: token.token,
      tokenExpiresAt: token.expiresAt,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
      status: 'pending'
    };

    this.queue.set(task.id, task);
    
    // Start processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }

    return task.id;
  }

  /**
   * Start processing queue
   */
  private async startProcessing(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;

    while (this.queue.size > 0 || this.running.size > 0) {
      // Process tasks up to max concurrency
      while (this.running.size < this.maxConcurrency && this.queue.size > 0) {
        const task = this.getNextTask();
        if (!task) break;

        this.running.add(task.id);
        this.processTask(task).catch(console.error);
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * Get next pending task
   */
  private getNextTask(): QueuedTask | null {
    for (const task of this.queue.values()) {
      if (task.status === 'pending') {
        return task;
      }
    }
    return null;
  }

  /**
   * Process a single task
   */
  private async processTask(task: QueuedTask): Promise<void> {
    try {
      task.status = 'running';
      task.startedAt = new Date();
      task.attempts++;

      // Check token hasn't expired
      if (new Date() > task.tokenExpiresAt) {
        throw new Error('Token expired before task could execute');
      }

      // Execute workflow (secrets will fallback to env vars)
      const result = await runner.execute(task.tool, task.input, {
        tenantId: task.tenantId,
        tier: 'pro'
      });

      task.status = 'completed';
      task.completedAt = new Date();
      task.output = result.output;

      // Emit event for real-time notification
      this.emit('taskCompleted', {
        taskId: task.id,
        executionId: task.executionId,
        output: result.output,
        task
      });

      // Revoke token immediately after completion
      await revokeToken(task.token);

    } catch (error) {
      console.error(`[TaskQueue] Task ${task.id} failed:`, error);
      
      task.error = String(error);

      // Retry if attempts remaining
      if (task.attempts < task.maxAttempts) {
        task.status = 'pending';
        
        // Exponential backoff
        const delay = Math.pow(2, task.attempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        task.status = 'failed';
        task.completedAt = new Date();
        
        // Emit failure event
        this.emit('taskFailed', {
          taskId: task.id,
          executionId: task.executionId,
          error: task.error,
          task
        });
        
        // Revoke token even on failure
        try {
          await revokeToken(task.token);
        } catch (e) {
          // Token might already be expired, ignore
        }
      }
    } finally {
      this.running.delete(task.id);
      
      // Remove from queue if completed or failed
      if (task.status === 'completed' || task.status === 'failed') {
        this.queue.delete(task.id);
      }
    }
  }

  /**
   * Get task status
   */
  getTask(taskId: string): QueuedTask | undefined {
    return this.queue.get(taskId);
  }

  /**
   * Get all tasks for an execution
   */
  getTasksForExecution(executionId: string): QueuedTask[] {
    return Array.from(this.queue.values()).filter(
      task => task.executionId === executionId
    );
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.queue.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      // Can't cancel running tasks (would need job cancellation)
      return false;
    }

    task.status = 'failed';
    task.error = 'Cancelled by user';
    
    // Revoke token
    try {
      await revokeToken(task.token);
    } catch (e) {
      // Ignore
    }

    this.queue.delete(taskId);
    return true;
  }

  /**
   * Get queue stats
   */
  getStats() {
    const tasks = Array.from(this.queue.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      maxConcurrency: this.maxConcurrency,
      currentConcurrency: this.running.size
    };
  }
}

// Singleton instance
export const taskQueue = new TaskQueue({ maxConcurrency: 5 });
