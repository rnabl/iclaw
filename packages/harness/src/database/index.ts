/**
 * Database Layer for Autonomous Job System
 * 
 * Provides CRUD operations for jobs, businesses, contacts, and logs
 * using better-sqlite3 for synchronous, performant SQLite access.
 */

import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import {
  Job,
  JobStep,
  Business,
  Contact,
  JobLog,
  SCHEMA_SQL,
  serializeJob,
  deserializeJob,
  serializeBusiness,
  deserializeBusiness,
  serializeContact,
  deserializeContact,
  serializeJobLog,
  deserializeJobLog,
} from './schema';

export class JobDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Default to .data/jobs.db if no path specified
    const defaultPath = path.join(process.cwd(), '.data', 'jobs.db');
    const finalPath = dbPath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Initialize database
    this.db = new Database(finalPath);
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('journal_mode = WAL');

    // Create schema
    this.db.exec(SCHEMA_SQL);
  }

  /**
   * Close the database connection
   */
  close() {
    this.db.close();
  }

  //
  // Job Operations
  //

  /**
   * Create a new job
   */
  createJob(data: {
    userId: string;
    description: string;
    plan: JobStep[];
  }): Job {
    const job: Job = {
      id: nanoid(),
      userId: data.userId,
      description: data.description,
      status: 'pending',
      plan: data.plan,
      currentStep: 0,
      totalSteps: data.plan.length,
      startedAt: new Date(),
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const serialized = serializeJob(job);
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, user_id, description, status, plan, current_step, total_steps,
        started_at, completed_at, error, metadata, created_at, updated_at
      ) VALUES (
        @id, @user_id, @description, @status, @plan, @current_step, @total_steps,
        @started_at, @completed_at, @error, @metadata, @created_at, @updated_at
      )
    `);

    stmt.run(serialized);
    return job;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | null {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(jobId);
    return row ? deserializeJob(row) : null;
  }

  /**
   * Get jobs by user ID
   */
  getJobsByUser(userId: string, limit = 50): Job[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(userId, limit);
    return rows.map(deserializeJob);
  }

  /**
   * Update job
   */
  updateJob(
    jobId: string,
    updates: Partial<Omit<Job, 'id' | 'userId' | 'createdAt'>>
  ): Job | null {
    const existing = this.getJob(jobId);
    if (!existing) return null;

    const updated: Job = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    const serialized = serializeJob(updated);
    const stmt = this.db.prepare(`
      UPDATE jobs SET
        status = @status,
        plan = @plan,
        current_step = @current_step,
        total_steps = @total_steps,
        completed_at = @completed_at,
        error = @error,
        metadata = @metadata,
        updated_at = @updated_at
      WHERE id = @id
    `);

    stmt.run(serialized);
    return updated;
  }

  /**
   * Update job status and optional error
   */
  updateJobStatus(
    jobId: string,
    status: Job['status'],
    error?: string
  ): Job | null {
    const updates: Partial<Job> = { status };
    if (error) updates.error = error;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      updates.completedAt = new Date();
    }
    return this.updateJob(jobId, updates);
  }

  /**
   * Advance job to next step
   */
  advanceJobStep(jobId: string): Job | null {
    const job = this.getJob(jobId);
    if (!job) return null;

    const currentStep = job.currentStep + 1;
    return this.updateJob(jobId, { currentStep });
  }

  /**
   * Search jobs by description keyword
   */
  searchJobs(userId: string, keyword: string, limit = 20): Job[] {
    const stmt = this.db.prepare(`
      SELECT * FROM jobs
      WHERE user_id = ? AND description LIKE ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(userId, `%${keyword}%`, limit);
    return rows.map(deserializeJob);
  }

  //
  // Business Operations
  //

  /**
   * Create a new business
   */
  createBusiness(data: Omit<Business, 'id' | 'createdAt'>): Business {
    const business: Business = {
      id: nanoid(),
      ...data,
      createdAt: new Date(),
    };

    const serialized = serializeBusiness(business);
    const stmt = this.db.prepare(`
      INSERT INTO businesses (
        id, job_id, name, address, city, state, zip_code, phone, website,
        rating, review_count, google_maps_url, place_id, metadata, created_at
      ) VALUES (
        @id, @job_id, @name, @address, @city, @state, @zip_code, @phone, @website,
        @rating, @review_count, @google_maps_url, @place_id, @metadata, @created_at
      )
    `);

    stmt.run(serialized);
    return business;
  }

  /**
   * Get businesses by job ID
   */
  getBusinessesByJob(jobId: string): Business[] {
    const stmt = this.db.prepare('SELECT * FROM businesses WHERE job_id = ?');
    const rows = stmt.all(jobId);
    return rows.map(deserializeBusiness);
  }

  /**
   * Bulk create businesses
   */
  createBusinesses(businesses: Array<Omit<Business, 'id' | 'createdAt'>>): Business[] {
    const insert = this.db.prepare(`
      INSERT INTO businesses (
        id, job_id, name, address, city, state, zip_code, phone, website,
        rating, review_count, google_maps_url, place_id, metadata, created_at
      ) VALUES (
        @id, @job_id, @name, @address, @city, @state, @zip_code, @phone, @website,
        @rating, @review_count, @google_maps_url, @place_id, @metadata, @created_at
      )
    `);

    const transaction = this.db.transaction((items: Array<Omit<Business, 'id' | 'createdAt'>>) => {
      const created: Business[] = [];
      for (const item of items) {
        const business: Business = {
          id: nanoid(),
          ...item,
          createdAt: new Date(),
        };
        const serialized = serializeBusiness(business);
        insert.run(serialized);
        created.push(business);
      }
      return created;
    });

    return transaction(businesses);
  }

  /**
   * Search businesses across all jobs
   */
  searchBusinesses(userId: string, query: string, limit = 50): Business[] {
    const stmt = this.db.prepare(`
      SELECT b.* FROM businesses b
      JOIN jobs j ON b.job_id = j.id
      WHERE j.user_id = ? AND (
        b.name LIKE ? OR
        b.city LIKE ? OR
        b.state LIKE ?
      )
      ORDER BY b.created_at DESC
      LIMIT ?
    `);
    const pattern = `%${query}%`;
    const rows = stmt.all(userId, pattern, pattern, pattern, limit);
    return rows.map(deserializeBusiness);
  }

  //
  // Contact Operations
  //

  /**
   * Create a new contact
   */
  createContact(data: Omit<Contact, 'id' | 'createdAt'>): Contact {
    const contact: Contact = {
      id: nanoid(),
      ...data,
      createdAt: new Date(),
    };

    const serialized = serializeContact(contact);
    const stmt = this.db.prepare(`
      INSERT INTO contacts (
        id, business_id, name, email, phone, role, linkedin_url,
        source, confidence, metadata, created_at
      ) VALUES (
        @id, @business_id, @name, @email, @phone, @role, @linkedin_url,
        @source, @confidence, @metadata, @created_at
      )
    `);

    stmt.run(serialized);
    return contact;
  }

  /**
   * Get contacts by business ID
   */
  getContactsByBusiness(businessId: string): Contact[] {
    const stmt = this.db.prepare('SELECT * FROM contacts WHERE business_id = ?');
    const rows = stmt.all(businessId);
    return rows.map(deserializeContact);
  }

  /**
   * Get contacts by job ID (via businesses)
   */
  getContactsByJob(jobId: string): Contact[] {
    const stmt = this.db.prepare(`
      SELECT c.* FROM contacts c
      JOIN businesses b ON c.business_id = b.id
      WHERE b.job_id = ?
      ORDER BY c.confidence DESC
    `);
    const rows = stmt.all(jobId);
    return rows.map(deserializeContact);
  }

  /**
   * Bulk create contacts
   */
  createContacts(contacts: Array<Omit<Contact, 'id' | 'createdAt'>>): Contact[] {
    const insert = this.db.prepare(`
      INSERT INTO contacts (
        id, business_id, name, email, phone, role, linkedin_url,
        source, confidence, metadata, created_at
      ) VALUES (
        @id, @business_id, @name, @email, @phone, @role, @linkedin_url,
        @source, @confidence, @metadata, @created_at
      )
    `);

    const transaction = this.db.transaction((items: Array<Omit<Contact, 'id' | 'createdAt'>>) => {
      const created: Contact[] = [];
      for (const item of items) {
        const contact: Contact = {
          id: nanoid(),
          ...item,
          createdAt: new Date(),
        };
        const serialized = serializeContact(contact);
        insert.run(serialized);
        created.push(contact);
      }
      return created;
    });

    return transaction(contacts);
  }

  //
  // Job Log Operations
  //

  /**
   * Add a log entry
   */
  addLog(data: Omit<JobLog, 'id' | 'timestamp'>): JobLog {
    const log: JobLog = {
      id: nanoid(),
      timestamp: new Date(),
      ...data,
    };

    const serialized = serializeJobLog(log);
    const stmt = this.db.prepare(`
      INSERT INTO job_logs (
        id, job_id, timestamp, level, step, message, metadata
      ) VALUES (
        @id, @job_id, @timestamp, @level, @step, @message, @metadata
      )
    `);

    stmt.run(serialized);
    return log;
  }

  /**
   * Get logs by job ID
   */
  getLogsByJob(jobId: string, limit = 100): JobLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM job_logs
      WHERE job_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(jobId, limit);
    return rows.map(deserializeJobLog);
  }

  /**
   * Get logs by job ID and step
   */
  getLogsByStep(jobId: string, step: number): JobLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM job_logs
      WHERE job_id = ? AND step = ?
      ORDER BY timestamp ASC
    `);
    const rows = stmt.all(jobId, step);
    return rows.map(deserializeJobLog);
  }

  //
  // Utility Operations
  //

  /**
   * Get job statistics for a user
   */
  getJobStats(userId: string): {
    total: number;
    completed: number;
    failed: number;
    running: number;
  } {
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
      FROM jobs
      WHERE user_id = ?
    `);
    return stmt.get(userId) as any;
  }

  /**
   * Delete old jobs (for cleanup)
   */
  deleteOldJobs(daysOld = 90): number {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare(`
      DELETE FROM jobs
      WHERE created_at < ? AND status IN ('completed', 'failed', 'cancelled')
    `);
    const result = stmt.run(cutoff);
    return result.changes;
  }

  /**
   * Run database optimization (should be called periodically)
   */
  optimize() {
    this.db.pragma('optimize');
    this.db.pragma('wal_checkpoint(TRUNCATE)');
  }
}

// Singleton instance
let instance: JobDatabase | null = null;

/**
 * Get the singleton database instance
 */
export function getDatabase(dbPath?: string): JobDatabase {
  if (!instance) {
    instance = new JobDatabase(dbPath);
  }
  return instance;
}

/**
 * Close and reset the singleton instance (mainly for testing)
 */
export function closeDatabase() {
  if (instance) {
    instance.close();
    instance = null;
  }
}
