/**
 * Workflow Template System
 * 
 * Declarative workflows for common agency tasks.
 * Supports queuing, caching, and ephemeral token security.
 */

import { z } from 'zod';

// =============================================================================
// TEMPLATE SCHEMA
// =============================================================================

/**
 * Strategy for executing a step
 */
export const ExecutionStrategy = z.enum([
  'sync',     // Execute immediately, wait for result
  'queue',    // Queue each item (for loops), process async
  'parallel', // Execute multiple items in parallel
]);

/**
 * Condition for step execution
 */
export const StepCondition = z.object({
  if: z.string().optional(),      // e.g., "!params.cities" (skip if cities provided)
  unless: z.string().optional(),  // e.g., "step1.failed"
});

/**
 * Individual workflow step
 */
export const WorkflowStep = z.object({
  id: z.string(),
  tool: z.string(),                    // Tool/workflow ID from registry
  description: z.string().optional(),
  
  // Input
  input: z.record(z.any()).optional(), // Static input
  params: z.string().optional(),       // Dynamic input from params/previous steps
  
  // Execution
  strategy: ExecutionStrategy.default('sync'),
  forEach: z.string().optional(),      // e.g., "cities" - loop over array
  maxConcurrency: z.number().optional().default(5),
  
  // Conditions
  condition: StepCondition.optional(),
  
  // Caching
  cache: z.boolean().default(false),
  cacheKey: z.string().optional(),
  cacheTTL: z.number().optional(),     // TTL in seconds
  
  // Security
  tokenTTL: z.number().default(1800),  // 30 minutes default
  scopes: z.array(z.string()).optional(),
  
  // Retry
  retryAttempts: z.number().default(2),
  retryDelay: z.number().default(5000),
  
  // Output
  output: z.string().optional(),       // Variable name to store result
});

export type WorkflowStep = z.infer<typeof WorkflowStep>;

/**
 * Workflow template definition
 */
export const WorkflowTemplate = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string().default('1.0.0'),
  
  // Tags for intent matching
  tags: z.array(z.string()).default([]),
  
  // Input parameters
  params: z.record(z.any()),
  
  // Workflow steps
  steps: z.array(WorkflowStep),
  
  // Schedule (for cron jobs)
  schedule: z.string().optional(),     // Cron expression
  
  // Metadata
  estimatedDurationMs: z.number().optional(),
  estimatedCostUsd: z.number().optional(),
  
  // Human-in-the-loop
  requiresApproval: z.boolean().default(false),
  approvalSteps: z.array(z.string()).optional(), // Step IDs requiring approval
});

export type WorkflowTemplate = z.infer<typeof WorkflowTemplate>;

// =============================================================================
// EXECUTION STATE
// =============================================================================

export interface WorkflowExecution {
  id: string;
  templateId: string;
  tenantId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  
  // Input
  params: Record<string, any>;
  
  // State
  currentStep: number;
  stepResults: Record<string, any>;  // Results from each step
  cache: Record<string, any>;        // Cached data
  
  // Queue
  queuedTasks: string[];             // Task IDs in queue
  completedTasks: string[];          // Completed task IDs
  
  // Timing
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;
  
  // Cost
  estimatedCostUsd: number;
  actualCostUsd: number;
  
  // Output
  output?: Record<string, any>;
  error?: string;
}

// =============================================================================
// TASK QUEUE ITEM
// =============================================================================

export interface QueuedTask {
  id: string;
  executionId: string;
  stepId: string;
  tool: string;
  input: Record<string, any>;
  
  // Security
  token: string;              // Ephemeral access token
  tokenExpiresAt: Date;
  
  // Retry
  attempts: number;
  maxAttempts: number;
  
  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Result
  output?: any;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// =============================================================================
// HELPER TYPES
// =============================================================================

export interface TemplateMatchResult {
  template: WorkflowTemplate;
  params: Record<string, any>;
  confidence: number;  // 0-1 score of how well it matches
}
