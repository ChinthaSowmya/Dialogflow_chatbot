const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

exports.handler = async (event, context) => {
  try {
    console.log('Function invoked!');

    // Safe diagnostic logs (no secrets printed)
    console.log('DF_CLIENT_EMAIL exists:', !!process.env.DF_CLIENT_EMAIL);
    console.log('DF_PRIVATE_KEY exists:', !!process.env.DF_PRIVATE_KEY);
    if (process.env.DF_PRIVATE_KEY) {
      console.log('DF_PRIVATE_KEY starts with BEGIN:', process.env.DF_PRIVATE_KEY.startsWith('-----BEGIN PRIVATE KEY-----'));
      console.log('DF_PRIVATE_KEY ends with END:', process.env.DF_PRIVATE_KEY.includes('-----END PRIVATE KEY-----'));
      console.log('DF_PRIVATE_KEY contains literal \\n:', process.env.DF_PRIVATE_KEY.includes('\\n'));
      console.log('DF_PRIVATE_KEY length (chars):', process.env.DF_PRIVATE_KEY.length);
    }

    // parse body safely
    const body = event.body && typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const text = body.text;
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing "text" in request body' }) };
    }

    // Convert Netlify-stored PEM (literal \n sequences) to real newlines
    const rawKey = process.env.DF_PRIVATE_KEY || '';
    // If the env contains literal backslash + n (as stored in UI), replace them with real newlines.
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    const privateKeyClean = privateKey.trim();

    // Extra safety checks
    if (!process.env.DF_CLIENT_EMAIL) {
      console.error('Missing DF_CLIENT_EMAIL');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: missing DF_CLIENT_EMAIL' }) };
    }
    if (!privateKeyClean || !privateKeyClean.includes('BEGIN PRIVATE KEY')) {
      console.error('Private key looks invalid (length, markers):', privateKeyClean ? privateKeyClean.length : 0);
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: invalid private key' }) };
    }

    // Show whether the cleaned key now contains real newlines (safe to log true/false)
    console.log('privateKeyClean has real newline:', privateKeyClean.includes('\n'));
    console.log('privateKeyClean length:', privateKeyClean.length);

    // Create the Dialogflow SessionsClient with credentials
    const sessionClient = new dialogflow.SessionsClient({
      credentials: {
        private_key: privateKeyClean,
        client_email: process.env.DF_CLIENT_EMAIL
      }
    });

    // Build session path and request
    const sessionId = uuid.v4();
    const projectId = process.env.REACT_APP_PROJECT_ID;
    if (!projectId) {
      console.error('Missing REACT_APP_PROJECT_ID');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured: missing project id' }) };
    }

    // Note: the SessionsClient expects a session string like: projects/<PROJECT_ID>/agent/sessions/<SESSION_ID>
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const req = {
      session: sessionPath,
      queryInput: {
        text: {
          text,
          languageCode: 'en'
        }
      }
    };

    // Call detectIntent
    const res = await sessionClient.detectIntent(req);

    // Defensive: check response shape
    const fulfillmentText = res && res[0] && res[0].queryResult && res[0].queryResult.fulfillmentText
      ? res[0].queryResult.fulfillmentText
      : '';

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: fulfillmentText })
    };

  } catch (e) {
    // Log full stack to Netlify logs (DO NOT log secrets)
    console.error('🔥 SERVER ERROR:', e && e.stack ? e.stack : e);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e && e.message ? e.message : 'Internal server error' })
    };
  }
};