  n8n Setup Instructions

  1. Create the Credential in n8n

  1. Go to https://nn.analyserinsights.com/
  2. Navigate to Settings → Credentials → Add Credential
  3. Search for "Header Auth" and select it
  4. Configure:
    - Name: Football API Key
    - Header Name: X-API-Key
    - Header Value: <YOUR_ADMIN_API_KEY from .env.local>
  5. Click Save

  2. Import the Workflows

  1. Go to Workflows → Import from File
  2. Import each JSON file from /n8n-workflows/sync/:
    - Sync_Pre_Match.json
    - Sync_Live_Match.json
    - Sync_Post_Match.json
    - Sync_Daily_Maintenance.json
    - Sync_Lineups_Watcher.json
  3. The workflows will automatically use the "Football API Key" credential

  3. Activate the Workflows

  Toggle each workflow to Active to enable the scheduled triggers.

  How it Works

  - Web app users: Authenticate via cookie (existing login)
  - n8n automation: Authenticates via X-API-Key header

  The API key is already configured on the server (ADMIN_API_KEY in .env.local).