# Migration Guide: Express to Cloudflare Worker

This guide will help you migrate your Express-based survey API to a Cloudflare Worker.

## Prerequisites

1. **Cloudflare Account**: Sign up at https://dash.cloudflare.com
2. **Node.js**: Version 16 or higher
3. **Wrangler CLI**: Install with `npm install -g wrangler`

## Step-by-Step Migration

### Step 1: Install Dependencies

```bash
# Install wrangler as a dev dependency
npm install --save-dev wrangler

# Install any missing dependencies
npm install
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate with Cloudflare.

### Step 3: Create KV Namespaces

```bash
# Create production KV namespace
wrangler kv:namespace create SURVEYS

# Create preview KV namespace (for development)
wrangler kv:namespace create SURVEYS --preview
```

**Important**: Save the IDs returned from these commands!

### Step 4: Update wrangler.toml

Replace the placeholder IDs in `wrangler.toml` with the actual IDs from Step 3:

```toml
[[kv_namespaces]]
binding = "SURVEYS"
id = "your-actual-production-kv-id"
preview_id = "your-actual-preview-kv-id"
```

### Step 5: Test Locally

```bash
# Start the worker locally
npm run worker:dev
```

The worker will be available at `http://localhost:8787`

### Step 6: Test All Endpoints

Test each endpoint to ensure they work correctly:

```bash
# Health check
curl http://localhost:8787/api/health

# Create survey
curl -X POST http://localhost:8787/api/surveys \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Survey",
    "questions": [
      {
        "questionText": "What is your favorite color?",
        "type": "single-select",
        "options": ["Red", "Blue", "Green"],
        "required": true
      }
    ]
  }'

# Get all surveys
curl http://localhost:8787/api/surveys

# Get specific survey (replace SURVEY_ID)
curl http://localhost:8787/api/surveys/SURVEY_ID

# Update survey (replace SURVEY_ID)
curl -X PUT http://localhost:8787/api/surveys/SURVEY_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Survey",
    "questions": [
      {
        "questionText": "Updated question?",
        "type": "multiple-choice",
        "options": ["Option 1", "Option 2", "Option 3"],
        "required": false
      }
    ]
  }'

# Submit survey (replace SURVEY_ID)
curl -X POST http://localhost:8787/api/surveys/SURVEY_ID/submit

# Delete survey (replace SURVEY_ID)
curl -X DELETE http://localhost:8787/api/surveys/SURVEY_ID
```

### Step 7: Update Frontend (if needed)

If your frontend is hardcoded to use `localhost:4000`, update the API base URL:

```javascript
// In your React components, change from:
const API_BASE = 'http://localhost:4000';

// To (for production):
const API_BASE = 'https://your-worker-name.your-subdomain.workers.dev';

// Or use environment variables:
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://your-worker-name.your-subdomain.workers.dev'
  : 'http://localhost:8787';
```

### Step 8: Deploy to Production

```bash
# Deploy the worker
npm run worker:deploy
```

### Step 9: Verify Deployment

Check that your worker is deployed and accessible:

```bash
# Test the deployed worker
curl https://your-worker-name.your-subdomain.workers.dev/api/health
```

## Key Differences from Express

### 1. Storage
- **Express**: In-memory array (`let surveys = []`)
- **Worker**: Cloudflare KV storage (`env.SURVEYS`)

### 2. Request Handling
- **Express**: `app.get()`, `app.post()`, etc.
- **Worker**: `fetch(request, env, ctx)` with URL parsing

### 3. CORS
- **Express**: `cors()` middleware
- **Worker**: Manual CORS headers in responses

### 4. Error Handling
- **Express**: Try-catch with `res.status().json()`
- **Worker**: Try-catch with `createErrorResponse()`

## Troubleshooting

### Common Issues

1. **"KV namespace not found"**
   - Ensure KV namespaces are created
   - Check IDs in `wrangler.toml`
   - Verify you're logged in to Cloudflare

2. **"Worker not found"**
   - Check worker name in `wrangler.toml`
   - Ensure deployment was successful
   - Verify account permissions

3. **"CORS errors"**
   - Check CORS headers in worker responses
   - Verify frontend is making requests to correct URL
   - Test with browser dev tools

4. **"Validation errors"**
   - Check request body format
   - Verify Content-Type header
   - Test with Postman or curl

### Debug Commands

```bash
# View worker logs
wrangler tail

# Check worker status
wrangler whoami

# List KV namespaces
wrangler kv:namespace list

# Test specific endpoint
wrangler dev --test-scheduled
```

## Performance Benefits

- **Global Edge Deployment**: Workers run in 200+ locations worldwide
- **Faster Response Times**: Sub-10ms cold starts
- **Automatic Scaling**: No server management required
- **Built-in Caching**: KV provides fast data access

## Cost Considerations

- **Workers**: Free tier includes 100,000 requests/day
- **KV**: Free tier includes 100,000 reads/day, 1,000 writes/day
- **Bandwidth**: Free tier includes 10GB/month

## Next Steps

1. **Monitor Performance**: Use Cloudflare dashboard to monitor worker performance
2. **Set Up Alerts**: Configure alerts for errors or high usage
3. **Optimize**: Consider caching strategies for frequently accessed data
4. **Scale**: Add more KV namespaces if needed for different data types 