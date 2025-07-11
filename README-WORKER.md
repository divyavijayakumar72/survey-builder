# Survey API Cloudflare Worker

This is a Cloudflare Worker implementation of the Survey API, replacing the Express.js server with serverless functions using Cloudflare KV storage.

## Features

- ✅ All original API endpoints maintained
- ✅ Cloudflare KV storage instead of in-memory storage
- ✅ CORS support
- ✅ Input validation
- ✅ Error handling
- ✅ Proper HTTP status codes

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/surveys` | Create new survey |
| GET | `/api/surveys` | Get all surveys |
| GET | `/api/surveys/:id` | Get specific survey |
| PUT | `/api/surveys/:id` | Update survey |
| POST | `/api/surveys/:id/submit` | Mark survey as submitted |
| DELETE | `/api/surveys/:id` | Delete survey |

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Wrangler CLI (if not already installed)

```bash
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler login
```

### 4. Create KV Namespaces

Create the production KV namespace:
```bash
npm run worker:kv:create
```

Create the preview KV namespace:
```bash
npm run worker:kv:create:preview
```

### 5. Update wrangler.toml

After creating the KV namespaces, update the `wrangler.toml` file with the actual namespace IDs:

```toml
[[kv_namespaces]]
binding = "SURVEYS"
id = "your-actual-production-kv-id"
preview_id = "your-actual-preview-kv-id"
```

### 6. Development

Run the worker locally for development:
```bash
npm run worker:dev
```

### 7. Deployment

Deploy to Cloudflare Workers:
```bash
npm run worker:deploy
```

## Configuration

### wrangler.toml

The `wrangler.toml` file contains:
- Worker name and entry point
- KV namespace bindings
- Environment configurations
- Compatibility settings

### Environment Variables

The worker uses the `SURVEYS` KV namespace binding for data storage.

## Data Structure

Surveys are stored in KV as JSON strings with the following structure:

```json
{
  "id": "timestamp",
  "title": "Survey Title",
  "questions": [
    {
      "questionText": "Question text",
      "type": "multiple-choice|single-select|free-text",
      "options": ["option1", "option2"],
      "required": true
    }
  ],
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "submitted": false,
  "submittedAt": "ISO timestamp"
}
```

## Migration from Express

### Key Changes

1. **Storage**: In-memory array → Cloudflare KV
2. **Runtime**: Node.js → Cloudflare Workers
3. **Entry Point**: Express app → Worker fetch handler
4. **Dependencies**: Express/CORS → Native fetch API

### API Compatibility

The Worker maintains full API compatibility with the original Express server:
- Same request/response formats
- Same validation logic
- Same error handling
- Same HTTP status codes

## Development Workflow

1. **Local Development**: Use `npm run worker:dev` for local testing
2. **Testing**: Test all endpoints locally before deployment
3. **Deployment**: Use `npm run worker:deploy` to deploy to production
4. **Monitoring**: Use Cloudflare dashboard to monitor worker performance

## Troubleshooting

### Common Issues

1. **KV Namespace Not Found**: Ensure KV namespaces are created and IDs are correct in `wrangler.toml`
2. **CORS Errors**: The worker includes CORS headers, but check if your frontend is configured correctly
3. **Deployment Failures**: Check that you're logged in to Cloudflare and have proper permissions

### Debugging

- Use `wrangler tail` to view real-time logs
- Check Cloudflare dashboard for error logs
- Use browser dev tools to inspect network requests

## Performance

Cloudflare Workers provide:
- Global edge deployment
- Sub-10ms cold start times
- Automatic scaling
- Built-in caching capabilities

## Security

- Input validation on all endpoints
- CORS headers for cross-origin requests
- Proper error handling without exposing internals
- KV access limited to worker scope 