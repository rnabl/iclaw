// OAuth routes for Google (Gmail, Calendar)
// These routes handle the OAuth flow via browser tap-to-auth

import type { Context } from 'hono';
import { getUserByPhone, saveIntegration, updateOnboardingState } from '@iclaw/database';
import { ONBOARDING_STATE, SKILLS } from '@iclaw/core';

// Google OAuth config
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth/google/callback';

/**
 * Generate OAuth URL for Google
 * User taps this link in iMessage, authenticates in browser
 */
export function getGoogleAuthUrl(userId: string, scopes: string[]): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: userId, // Pass user ID through state param
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * GET /oauth/google
 * Initiates Google OAuth - redirects to Google login
 * Query params: ?user=<userId>
 */
export async function googleAuthHandler(c: Context) {
  const userId = c.req.query('user');
  
  if (!userId) {
    return c.html(`
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Error</h1>
          <p>Missing user ID. Please use the link from iMessage.</p>
        </body>
      </html>
    `, 400);
  }

  // Combine scopes for email and calendar
  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  const authUrl = getGoogleAuthUrl(userId, scopes);
  return c.redirect(authUrl);
}

/**
 * GET /oauth/google/callback
 * Google redirects here after user authenticates
 * Exchange code for tokens, store them, show success page
 */
export async function googleCallbackHandler(c: Context) {
  const code = c.req.query('code');
  const state = c.req.query('state'); // This is our userId
  const error = c.req.query('error');

  if (error) {
    console.error('[OAuth] Google auth error:', error);
    return c.html(`
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Authentication Failed</h1>
          <p>Google sign-in was cancelled or failed.</p>
          <p>Go back to iMessage and try again.</p>
        </body>
      </html>
    `, 400);
  }

  if (!code || !state) {
    return c.html(`
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Error</h1>
          <p>Missing authorization code. Please try again from iMessage.</p>
        </body>
      </html>
    `, 400);
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed:', errorData);
      throw new Error('Token exchange failed');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    // Calculate expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Save integration to database
    await saveIntegration(state, 'google', {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scopes: tokens.scope.split(' '),
    });

    console.log(`[OAuth] Successfully saved Google tokens for user ${state}`);

    // Show success page
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              padding: 40px 20px;
              text-align: center;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              margin: 0;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .card {
              background: white;
              border-radius: 20px;
              padding: 40px;
              max-width: 400px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            .emoji {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1a1a1a;
              margin: 0 0 10px 0;
            }
            p {
              color: #666;
              line-height: 1.6;
              margin: 0;
            }
            .connected {
              background: #e8f5e9;
              color: #2e7d32;
              padding: 10px 20px;
              border-radius: 10px;
              margin-top: 20px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="emoji">🎉</div>
            <h1>Connected!</h1>
            <p>Your Google account is now connected to iClaw.</p>
            <div class="connected">✓ Gmail + Calendar</div>
            <p style="margin-top: 20px; font-size: 14px;">
              You can close this tab and go back to iMessage!
            </p>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('[OAuth] Callback error:', error);
    return c.html(`
      <html>
        <body style="font-family: -apple-system, sans-serif; padding: 40px; text-align: center;">
          <h1>❌ Something went wrong</h1>
          <p>We couldn't connect your account. Please try again from iMessage.</p>
        </body>
      </html>
    `, 500);
  }
}

/**
 * Generate the OAuth link to send in iMessage
 */
export function generateOAuthLink(userId: string, baseUrl: string): string {
  return `${baseUrl}/oauth/google?user=${userId}`;
}
