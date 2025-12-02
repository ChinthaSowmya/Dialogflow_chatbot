const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

exports.handler = async (event) => {
  try {
    console.log("Function invoked!");

    // Parse incoming request
    const body = event.body ? JSON.parse(event.body) : {};
    const text = body.text;
    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'text' field" })
      };
    }

    // -----------------------------
    // FIX PRIVATE KEY (Netlify flattens newlines)
    // -----------------------------
    const rawKey = process.env.DF_PRIVATE_KEY || "";

    let fixedKey = rawKey;

    // Case 1: key contains literal \n (escaped)
    if (rawKey.includes("\\n")) {
      fixedKey = rawKey.replace(/\\n/g, "\n");
    }

    // Case 2: key has NO real newlines AND no literal "\n"
    // Convert space-separated PEM into proper format
    if (!fixedKey.includes("\n")) {
      fixedKey = rawKey
        .replace(/-----BEGIN PRIVATE KEY-----/, "-----BEGIN PRIVATE KEY-----\n")
        .replace(/-----END PRIVATE KEY-----/, "\n-----END PRIVATE KEY-----")
        .replace(/\s+/g, "\n") // force newline between blocks
        .trim();
    }

    // Log safe diagnostics
    console.log("Key starts with BEGIN:", fixedKey.startsWith("-----BEGIN PRIVATE KEY-----"));
    console.log("Key ends with END:", fixedKey.endsWith("-----END PRIVATE KEY-----"));
    console.log("Key has real newline:", fixedKey.includes("\n"));

    // Validate required env vars
    if (!process.env.DF_CLIENT_EMAIL) {
      console.error("ERROR: Missing DF_CLIENT_EMAIL");
      return { statusCode: 500, body: JSON.stringify({ error: "Missing DF_CLIENT_EMAIL" }) };
    }

    if (!process.env.REACT_APP_PROJECT_ID) {
      console.error("ERROR: Missing REACT_APP_PROJECT_ID");
      return { statusCode: 500, body: JSON.stringify({ error: "Missing REACT_APP_PROJECT_ID" }) };
    }

    // Create Dialogflow client
    const sessionClient = new dialogflow.SessionsClient({
      credentials: {
        private_key: fixedKey,
        client_email: process.env.DF_CLIENT_EMAIL,
      }
    });

    const sessionId = uuid.v4();
    const projectId = process.env.REACT_APP_PROJECT_ID;

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const req = {
      session: sessionPath,
      queryInput: {
        text: {
          text,
          languageCode: "en"
        }
      }
    };

    // Call Dialogflow
    const [response] = await sessionClient.detectIntent(req);
    const fulfillmentText = response.queryResult.fulfillmentText || "";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: fulfillmentText })
    };

  } catch (error) {
    console.error("🔥 SERVER ERROR:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Internal Server Error"
      })
    };
  }
};
