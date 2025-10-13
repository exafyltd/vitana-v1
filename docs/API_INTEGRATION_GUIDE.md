# API Integration Testing - Complete Guide

This guide explains how to add and test new API integrations in the system.

## Quick Start

### 1. Add Integration via Admin UI

1. Navigate to `/admin/integrations`
2. Click "Add Integration" button
3. Fill in the form:
   - **Name**: Descriptive name (e.g., "Shopify Store API")
   - **Base URL**: API base URL (e.g., `https://api.shopify.com`)
   - **Integration Type**: REST API, GraphQL, Webhook, or SOAP
   - **Auth Type**: Choose authentication method
   - **Auth Token**: Provide API credentials (if required)
   - **Test Frequency**: How often to run tests (minimum 5 minutes)
   - **Notes**: Any additional information

4. Click "Create Integration"

### 2. Default Testing

The system will automatically test your integration using the default test runner:
- Tests basic connectivity
- Validates authentication
- Runs every 15 minutes (or your specified frequency)
- Logs results in the database

## Custom Test Runners

For advanced testing needs, create a custom edge function.

### Step 1: Copy the Template

1. Copy `supabase/functions/api-test-template` to a new folder
2. Rename it to match your integration (e.g., `test-shopify-api`)

### Step 2: Customize the Test Logic

Edit the `runTests()` function in your new edge function:

```typescript
async function runTests(integration: any) {
  const startTime = Date.now();
  
  // Your custom test logic here
  const response = await fetch(`${integration.base_url}/your-endpoint`, {
    headers: {
      'Authorization': `Bearer ${integration.auth_token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  return {
    success: response.ok,
    message: response.ok ? 'Test passed' : 'Test failed',
    error: response.ok ? null : data.error,
    responseTime: Date.now() - startTime,
    endpointsTested: ['/your-endpoint'],
    details: data
  };
}
```

### Step 3: Update Integration Record

In the admin UI or database, update the integration:
- Set `test_runner_function` to your function name (e.g., `test-shopify-api`)

### Step 4: Test Your Function

The cron job will automatically use your custom function. You can also:
1. Click "Run Test Now" in the admin UI
2. Manually invoke: `supabase.functions.invoke('test-shopify-api', { body: { integration_id: 'your-id' }})`

## Authentication Types

### None
No authentication required. Public APIs only.

### Bearer Token
```typescript
headers: {
  'Authorization': `Bearer ${integration.auth_token}`
}
```

### API Key
```typescript
headers: {
  'X-API-Key': integration.auth_token
  // or custom header name based on your API
}
```

### OAuth
Store access token in `auth_token` field. Handle refresh logic in custom test runner.

### Basic Auth
Store `username:password` base64 encoded in `auth_token`.

## Test Endpoints Configuration

Store test endpoint configurations in the `test_endpoints` JSONB field:

```json
[
  {
    "path": "/v1/products",
    "method": "GET",
    "expected_status": 200
  },
  {
    "path": "/v1/orders",
    "method": "POST",
    "body": { "test": true },
    "expected_status": 201
  }
]
```

## Monitoring & Alerts

### Viewing Test Results
- Navigate to `/admin/integrations/{id}` to see detailed test history
- Check the "Alerts Panel" on the main integrations page for recent failures

### Alert Configuration
The system automatically creates alerts when:
- 3 consecutive tests fail
- Response time exceeds threshold
- Authentication fails

### Notification Channels
Alerts are logged to `api_test_notifications` table. Configure webhooks or email notifications as needed.

## Database Schema

### api_integrations
Main integration configuration table.

### api_test_logs
Stores all test execution results with:
- Response time
- Success/failure status
- Error logs
- Response body (truncated)

### api_test_notifications
Alert records for failed tests.

## Cron Job

Automated testing runs via Supabase Edge Function cron:
- **Function**: `run-api-tests`
- **Schedule**: Every 15 minutes
- **Logic**: Fetches active integrations, runs tests, logs results

## Best Practices

1. **Start Simple**: Use default test runner first
2. **Custom Functions**: Only create when you need specific test logic
3. **Security**: Never commit API keys; use Supabase Vault for secrets
4. **Monitoring**: Set appropriate test frequencies to avoid rate limits
5. **Logging**: Include detailed logs in custom test runners for debugging
6. **Error Handling**: Always catch and log errors properly

## Examples

### Example 1: Testing a REST API
```typescript
const response = await fetch(`${integration.base_url}/api/status`, {
  method: 'GET',
  headers: { 'Authorization': `Bearer ${integration.auth_token}` }
});

return {
  success: response.status === 200,
  message: `API returned ${response.status}`,
  responseTime: Date.now() - startTime,
  endpointsTested: ['/api/status']
};
```

### Example 2: Testing Multiple Endpoints
```typescript
const endpoints = ['/health', '/users', '/products'];
const results = await Promise.all(
  endpoints.map(path => 
    fetch(`${integration.base_url}${path}`)
  )
);

const allSuccessful = results.every(r => r.ok);

return {
  success: allSuccessful,
  message: `Tested ${endpoints.length} endpoints`,
  endpointsTested: endpoints,
  details: results.map(r => ({ status: r.status }))
};
```

## Troubleshooting

### Tests Always Failing
- Check authentication credentials
- Verify base URL is correct
- Check API rate limits
- Review edge function logs

### Custom Function Not Running
- Verify `test_runner_function` name matches edge function folder name
- Check edge function deployed successfully
- Review Supabase edge function logs

### High Response Times
- Check API server performance
- Consider increasing test frequency
- Review network connectivity

## Support

For issues or questions:
1. Check edge function logs in Supabase dashboard
2. Review `api_test_logs` table for error details
3. Verify integration configuration in admin UI
