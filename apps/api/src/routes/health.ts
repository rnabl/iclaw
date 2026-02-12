// Health check endpoint

import type { Context } from 'hono';
import { createBlueBubblesClient } from '@iclaw/bluebubbles';

export async function healthHandler(c: Context) {
  const checks: Record<string, boolean> = {
    api: true,
    bluebubbles: false,
    database: false,
  };

  // Check BlueBubbles connection
  try {
    const bb = createBlueBubblesClient();
    checks.bluebubbles = await bb.ping();
  } catch {
    checks.bluebubbles = false;
  }

  // Check database connection (basic check)
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    checks.database = !!(url && key);
  } catch {
    checks.database = false;
  }

  const allHealthy = Object.values(checks).every(Boolean);

  return c.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503
  );
}
