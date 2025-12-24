# n8n Workflows - Football Prediction System

This directory contains n8n workflow definitions for the Football Prediction System.

## Directory Structure

```
n8n-workflows/
├── README.md                    # This file
├── sync/                        # Data synchronization workflows
│   ├── Sync_Fixtures.json
│   ├── Sync_Standings.json
│   ├── Sync_Team_Stats.json
│   ├── Sync_Injuries.json
│   └── ...
└── prediction/                  # AI prediction workflows
    ├── Football_Prediction_AI.json     # Main workflow file
    ├── QUICK_START.md                  # 10-minute setup guide
    ├── README.md                       # Comprehensive documentation
    ├── IMPORT_GUIDE.md                 # Step-by-step import instructions
    ├── WORKFLOW_DIAGRAM.md             # Visual flow diagrams
    ├── WORKFLOW_SUMMARY.md             # Architecture overview
    └── DEPLOYMENT_CHECKLIST.md         # Deployment checklist
```

## Workflows Overview

### Data Sync Workflows (sync/)

These workflows keep your database synchronized with external data sources:

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| Sync_Standings | Daily 06:00 UTC | Update league table |
| Sync_Fixtures_Upcoming | Daily 06:15 UTC | Fetch upcoming matches |
| Sync_Team_Stats | Weekly Sun 05:00 | Update season statistics |
| Sync_Injuries | Daily 07:30 UTC | Update injury lists |
| Sync_Completed_Matches | Daily 08:00 UTC | Fetch finished match data |
| Sync_Odds | Every 4 hours | Update betting odds |
| Sync_Weather | Daily 09:00 UTC | Fetch weather forecasts |
| Sync_Lineups | 1hr before KO | Get team lineups |

### Prediction Workflow (prediction/)

**Football Prediction AI** - The main AI-powered prediction workflow:
- Receives match details via webhook
- Fetches comprehensive team data from Supabase
- Generates prediction using OpenAI GPT-4o
- Returns structured prediction with probabilities, analysis, and betting suggestions

## Quick Links

### For Quick Setup
Start here: [prediction/QUICK_START.md](prediction/QUICK_START.md)

### For Detailed Documentation
- [Prediction Workflow README](prediction/README.md)
- [Import Guide](prediction/IMPORT_GUIDE.md)
- [Visual Diagrams](prediction/WORKFLOW_DIAGRAM.md)

### For Deployment
- [Deployment Checklist](prediction/DEPLOYMENT_CHECKLIST.md)
- [Workflow Summary](prediction/WORKFLOW_SUMMARY.md)

## n8n Instance

**URL**: https://nn.analyserinsights.com/

**Access**: Configured in `.claude/settings.local.json` via MCP server

## Prerequisites

Before deploying any workflow:

1. **n8n Access**: Login credentials for the n8n instance
2. **API Keys**:
   - OpenAI API key (for predictions)
   - API-Football key (for data sync)
   - The Odds API key (for betting odds)
3. **Database**: Supabase instance with proper schema
4. **Environment**: Variables configured in `.env.local`

## Getting Started

### 1. Deploy Prediction Workflow (Recommended First)

This is the core AI prediction engine:

```bash
# Follow the quick start guide
open n8n-workflows/prediction/QUICK_START.md
```

Time: 10 minutes
Prerequisites: OpenAI API key, populated database

### 2. Deploy Data Sync Workflows (Optional)

If you need automated data updates:

```bash
# Import each sync workflow from sync/ directory
# Configure schedules and API keys
# Activate workflows
```

## Common Tasks

### Import a Workflow

1. Open n8n dashboard: https://nn.analyserinsights.com/
2. Click **Workflows** > **Import from File**
3. Select the `.json` file
4. Configure credentials
5. Activate workflow

### Test a Workflow

#### For Webhooks:
```bash
curl -X POST <webhook-url> \
  -H "Content-Type: application/json" \
  -d '{ <payload> }'
```

#### For Scheduled Workflows:
1. Open workflow in n8n
2. Click **Execute Workflow** button
3. View results in execution log

### Monitor Workflows

1. Go to **Executions** in n8n sidebar
2. Filter by workflow name
3. Click any execution to see details
4. Check for errors (red nodes)

### Update a Workflow

1. Make changes in n8n editor
2. Click **Save**
3. Test the changes
4. Export updated workflow: **Workflow** > **Export**
5. Replace the `.json` file in this directory
6. Commit to version control

## Troubleshooting

### Workflow Won't Activate

**Possible Causes**:
- Missing or invalid credentials
- Incorrect node configuration
- Missing required environment variables

**Solution**:
1. Check all nodes for red error icons
2. Verify credentials are configured
3. Test individual nodes

### Execution Fails

**Check**:
1. Execution logs in n8n
2. Error messages in failed nodes
3. External API status (OpenAI, Supabase, etc.)
4. Network connectivity

### Slow Performance

**Common Issues**:
- Large data volumes
- API rate limits
- Sequential vs parallel execution

**Solutions**:
- Use parallel execution where possible
- Implement caching
- Add pagination for large datasets
- Increase timeouts

## Best Practices

### Naming Conventions
- Use descriptive workflow names
- Prefix sync workflows with "Sync_"
- Use PascalCase for workflow names

### Error Handling
- Add error notification nodes (email/Slack)
- Set appropriate timeouts
- Implement retry logic for API calls

### Credentials
- Store API keys in n8n credentials manager
- Never hardcode secrets in workflows
- Use environment variables where possible

### Testing
- Test workflows in n8n editor before activating
- Use realistic test data
- Monitor first executions closely

### Documentation
- Update README when adding new workflows
- Document any custom configurations
- Note any dependencies between workflows

## Workflow Dependencies

```
Sync Workflows → Database → Prediction Workflow
```

**Important**:
- Prediction workflow requires populated database
- Run data sync workflows first if starting fresh
- Ensure team_season_stats table has data

## Costs

### OpenAI (Prediction Workflow)
- GPT-4o: ~$0.01-0.05 per prediction
- Estimate: $1-5 per 100 predictions

### n8n
- Included in your plan
- Check execution limits

### External APIs
- API-Football: Limited free tier
- The Odds API: 500 free requests/month
- Weather API: Free, unlimited

## Support

### Resources
- n8n Documentation: https://docs.n8n.io/
- n8n Community: https://community.n8n.io/
- Project Documentation: `/docs`

### Internal Documentation
- Factor System: `/docs/FACTORS.md`
- Database Schema: `/supabase/migrations`
- API Endpoints: `CLAUDE.md`

### Getting Help
1. Check workflow-specific README files
2. Review n8n execution logs
3. Verify all prerequisites are met
4. Test external API connectivity
5. Check error messages carefully

## Contributing

When adding new workflows:

1. Create workflow in n8n
2. Test thoroughly
3. Export as JSON
4. Add to appropriate directory (sync/ or prediction/)
5. Create README if complex
6. Update this main README
7. Commit to version control

## Version Control

### What to Commit
- ✅ Workflow JSON files
- ✅ Documentation (README, guides)
- ✅ Test scripts
- ✅ Configuration examples

### What NOT to Commit
- ❌ API keys or secrets
- ❌ Credentials
- ❌ .env.local file
- ❌ Personal configurations

## Backup

### Workflow Backup
Workflows are automatically backed up when:
- Exported and committed to git
- Saved in n8n (keeps version history)

### Restore Process
1. Import workflow from JSON file
2. Reconfigure credentials
3. Test before activating
4. Activate workflow

## Next Steps

After deploying workflows:

1. **Monitor Performance**: Track execution success rate
2. **Optimize Costs**: Review API usage and costs
3. **Enhance Workflows**: Add new data sources
4. **Build Dashboards**: Visualize workflow metrics
5. **Document Learnings**: Update docs with insights

---

**Last Updated**: December 24, 2025
**Workflows**: 9 (1 prediction + 8 sync)
**Status**: Production Ready
