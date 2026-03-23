#!/usr/bin/env node
/**
 * Exchange authorization code for refresh token
 * Usage: node scripts/exchange-token.mjs YOUR_AUTH_CODE
 */

const code = process.argv[2];

if (!code) {
  console.error('Usage: node scripts/exchange-token.mjs YOUR_AUTH_CODE');
  process.exit(1);
}

const CLIENT_ID = process.env.GOOGLE_ADS_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_ADS_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

console.log('🔄 Exchanging authorization code for tokens...\n');

const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  }),
});

const tokens = await response.json();

if (tokens.error) {
  console.error('❌ Error:', tokens.error_description || tokens.error);
  process.exit(1);
}

console.log('✅ SUCCESS! New Refresh Token:');
console.log('═══════════════════════════════════════════════════════════');
console.log(tokens.refresh_token);
console.log('═══════════════════════════════════════════════════════════');
console.log('\nCopy this token and update GOOGLE_ADS_REFRESH_TOKEN secret.');
