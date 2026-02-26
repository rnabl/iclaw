/**
 * Database Schema for Autonomous Job System
 * 
 * This module defines the TypeScript interfaces and SQLite schema
 * for persisting job data, business information, contacts, and logs.
 */

export interface Job {
  id: string; // UUID
  userId: string; // From daemon identity system
  description: string; // Original user request
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  plan: JobStep[]; // Serialized as JSON
  currentStep: number; // Index of current step (0-based)
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata: Record<string, any>; // Serialized as JSON
  createdAt: Date;
  updatedAt: Date;
}

export interface JobStep {
  id: string;
  order: number; // 1-based ordering
  action: string; // 'discover', 'enrich', 'analyze', 'audit', etc.
  params: Record<string, any>; // Tool-specific parameters
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: any; // Serialized tool output
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface Business {
  id: string; // UUID
  jobId: string; // Foreign key to Job
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviewCount?: number;
  googleMapsUrl?: string;
  placeId?: string;
  metadata: Record<string, any>; // Additional data (hours, categories, etc.)
  createdAt: Date;
}

export interface Contact {
  id: string; // UUID
  businessId: string; // Foreign key to Business
  name?: string;
  email?: string;
  phone?: string;
  role?: string; // 'owner', 'manager', 'contact', etc.
  linkedinUrl?: string;
  source: string; // 'perplexity', 'linkedin', 'website', 'serp'
  confidence: number; // 0-100, confidence score for this contact
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface JobLog {
  id: string; // UUID
  jobId: string; // Foreign key to Job
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  step?: number; // Which step this log belongs to (optional)
  message: string;
  metadata?: Record<string, any>;
}

/**
 * SQL schema creation statements
 */
export const SCHEMA_SQL = `
-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  plan TEXT NOT NULL, -- JSON serialized JobStep[]
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  started_at INTEGER NOT NULL, -- Unix timestamp in milliseconds
  completed_at INTEGER, -- Unix timestamp in milliseconds
  error TEXT,
  metadata TEXT DEFAULT '{}', -- JSON object
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Indexes for jobs
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  website TEXT,
  rating REAL,
  review_count INTEGER,
  google_maps_url TEXT,
  place_id TEXT,
  metadata TEXT DEFAULT '{}', -- JSON object
  created_at INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Indexes for businesses
CREATE INDEX IF NOT EXISTS idx_businesses_job_id ON businesses(job_id);
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses(name);
CREATE INDEX IF NOT EXISTS idx_businesses_city_state ON businesses(city, state);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  linkedin_url TEXT,
  source TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 0 CHECK(confidence >= 0 AND confidence <= 100),
  metadata TEXT DEFAULT '{}', -- JSON object
  created_at INTEGER NOT NULL,
  FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_business_id ON contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Job logs table
CREATE TABLE IF NOT EXISTS job_logs (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL, -- Unix timestamp in milliseconds
  level TEXT NOT NULL CHECK(level IN ('debug', 'info', 'warn', 'error')),
  step INTEGER,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON object
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Indexes for job logs
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
`;

/**
 * Helper functions for serialization
 */
export function serializeJob(job: Partial<Job>): Record<string, any> {
  return {
    id: job.id,
    user_id: job.userId,
    description: job.description,
    status: job.status,
    plan: JSON.stringify(job.plan || []),
    current_step: job.currentStep || 0,
    total_steps: job.totalSteps || 0,
    started_at: job.startedAt ? job.startedAt.getTime() : Date.now(),
    completed_at: job.completedAt?.getTime(),
    error: job.error,
    metadata: JSON.stringify(job.metadata || {}),
    created_at: job.createdAt ? job.createdAt.getTime() : Date.now(),
    updated_at: job.updatedAt ? job.updatedAt.getTime() : Date.now(),
  };
}

export function deserializeJob(row: any): Job {
  return {
    id: row.id,
    userId: row.user_id,
    description: row.description,
    status: row.status,
    plan: JSON.parse(row.plan),
    currentStep: row.current_step,
    totalSteps: row.total_steps,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    error: row.error,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function serializeBusiness(business: Partial<Business>): Record<string, any> {
  return {
    id: business.id,
    job_id: business.jobId,
    name: business.name,
    address: business.address,
    city: business.city,
    state: business.state,
    zip_code: business.zipCode,
    phone: business.phone,
    website: business.website,
    rating: business.rating,
    review_count: business.reviewCount,
    google_maps_url: business.googleMapsUrl,
    place_id: business.placeId,
    metadata: JSON.stringify(business.metadata || {}),
    created_at: business.createdAt ? business.createdAt.getTime() : Date.now(),
  };
}

export function deserializeBusiness(row: any): Business {
  return {
    id: row.id,
    jobId: row.job_id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    phone: row.phone,
    website: row.website,
    rating: row.rating,
    reviewCount: row.review_count,
    googleMapsUrl: row.google_maps_url,
    placeId: row.place_id,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: new Date(row.created_at),
  };
}

export function serializeContact(contact: Partial<Contact>): Record<string, any> {
  return {
    id: contact.id,
    business_id: contact.businessId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    linkedin_url: contact.linkedinUrl,
    source: contact.source,
    confidence: contact.confidence || 0,
    metadata: JSON.stringify(contact.metadata || {}),
    created_at: contact.createdAt ? contact.createdAt.getTime() : Date.now(),
  };
}

export function deserializeContact(row: any): Contact {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    linkedinUrl: row.linkedin_url,
    source: row.source,
    confidence: row.confidence,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: new Date(row.created_at),
  };
}

export function serializeJobLog(log: Partial<JobLog>): Record<string, any> {
  return {
    id: log.id,
    job_id: log.jobId,
    timestamp: log.timestamp ? log.timestamp.getTime() : Date.now(),
    level: log.level,
    step: log.step,
    message: log.message,
    metadata: log.metadata ? JSON.stringify(log.metadata) : null,
  };
}

export function deserializeJobLog(row: any): JobLog {
  return {
    id: row.id,
    jobId: row.job_id,
    timestamp: new Date(row.timestamp),
    level: row.level,
    step: row.step,
    message: row.message,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}
