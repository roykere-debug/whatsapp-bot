# WhatsApp Tickets Bot

This bot handles WhatsApp messages through Green API, manages user state with a PostgreSQL DB (Railway), and runs in Safe Mode so only the developer can use it during tests.

## Features

- 🤖 **State Machine Architecture**: Manages conversation flows with multiple states
- 💬 **Text Message Handling**: Processes incoming text messages via webhooks
- 💾 **Persistent State**: PostgreSQL database for conversation state management
- 📡 **Webhook-Based**: Express server receives webhooks from Green API
- 🔒 **Safe Mode**: During testing, only allows messages from TEST_USER_PHONE
- 🎯 **Modular Design**: Clean separation of concerns (router, state machine, API client)
- 🔒 **Type Safe**: Full TypeScript support with strict mode
- 🎛️ **Control Dashboard**: Web-based dashboard to enable/disable the bot at any time

## 🚀 How to Deploy on Railway

1. **Push this project to GitHub**

2. **Go to https://railway.app → New Project → Deploy from GitHub**

3. **Add Variables:**
   - `GREEN_API_INSTANCE_ID`
   - `GREEN_API_TOKEN`
   - `DATABASE_URL` (Railway will auto-create a PostgreSQL database)
   - `TEST_USER_PHONE` (your WhatsApp number, e.g., `972549762201`)

4. **Railway will give you a URL:**
   ```
   https://YOUR-APP.up.railway.app/webhook/greenapi
   ```

5. **Put that URL in Green API webhook settings**

Done! 🎉

## Local Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or use Railway's database)
- Green API account with instance ID and API token
- Authorized WhatsApp instance

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database**:
   
   Create a PostgreSQL database for the bot:
   ```sql
   CREATE DATABASE whatsapp_bot;
   ```

3. **Configure environment variables**:
   
   Create a `.env` file or set environment variables:
   ```env
   PORT=3000
   GREEN_API_INSTANCE_ID=your_instance_id
   GREEN_API_TOKEN=your_api_token
   DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_bot
   TEST_USER_PHONE=972549762201
   ```

   Get your Green API credentials from: https://green-api.com/

4. **Authorize your WhatsApp instance**:
   
   Follow Green API documentation to authorize your WhatsApp account.

5. **Configure webhook for local development**:
   
   Use a tunneling service like ngrok:
   ```bash
   ngrok http 3000
   ```
   
   Then use the ngrok URL as your webhook URL in Green API dashboard:
   ```
   https://your-ngrok-url.ngrok.io/webhook/greenapi
   ```

6. **Build the project**:
   ```bash
   npm run build
   ```

7. **Run the bot**:
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

## Project Structure

```
.
├── src/
│   ├── index.ts           # Main entry point (Express server)
│   ├── router.ts          # Message routing logic
│   ├── greenApiClient.ts  # Green API client wrapper
│   ├── db.ts              # PostgreSQL database operations
│   ├── stateMachine.ts    # Bot state machine
│   └── types.ts           # TypeScript type definitions
├── public/
│   └── dashboard.html     # Bot control dashboard
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

### Components

1. **GreenApiClient**: Handles all interactions with Green API (sending messages)
2. **BotDatabase**: Manages conversation state persistence using PostgreSQL
3. **BotStateMachine**: Implements the conversation flow logic with different states
4. **MessageRouter**: Routes incoming messages to appropriate handlers (with Safe Mode)
5. **Express Server**: Receives webhooks from Green API

### Safe Mode

When `TEST_USER_PHONE` environment variable is set, the bot will only process messages from that phone number. All other users will be silently ignored. This is useful during development and testing.

- If `TEST_USER_PHONE` is set: Only that number can interact with the bot
- If `TEST_USER_PHONE` is not set: All users can interact with the bot

### State Flow

```
idle → greeting → collecting_info → processing → completed
  ↑                                              ↓
  └──────────────────────────────────────────────┘
```

- **idle**: Initial state, responds to greetings
- **greeting**: Understands user intent
- **collecting_info**: Multi-step information collection
- **processing**: Handles async operations
- **completed**: Ready for new requests

### API Endpoints

- `GET /` - Bot information
- `GET /health` - Health check endpoint
- `POST /webhook/greenapi` - Webhook endpoint for Green API notifications
- `GET /dashboard` - Bot control dashboard (web interface)
- `GET /api/bot/status` - Get bot enabled/disabled status
- `POST /api/bot/toggle` - Toggle bot status (enable/disable)

## Bot Control Dashboard

The bot includes a web-based control dashboard that allows you to enable or disable the bot at any time.

### Accessing the Dashboard

Once your bot is running, visit:
```
http://localhost:3000/dashboard
```

Or in production:
```
https://YOUR-APP.up.railway.app/dashboard
```

### Features

- **Real-time Status**: See if the bot is currently enabled or disabled
- **Toggle Control**: Click the toggle switch to enable/disable the bot instantly
- **Auto-refresh**: Status updates automatically every 30 seconds
- **Visual Feedback**: Clear indicators show the current bot status

### How It Works

- When the bot is **enabled**: All incoming messages are processed normally
- When the bot is **disabled**: Incoming messages are received but not processed (webhook returns success but bot ignores the message)

The bot status is stored in the database, so it persists across server restarts.

## Customization

### Adding New States

1. Add the state to `BotState` type in `src/types.ts`
2. Add a handler method in `BotStateMachine`
3. Update the `processMessage` switch statement

### Adding Custom Handlers

```typescript
// In router.ts
router.registerHandler('customType', async (message, state) => {
  // Your custom handler logic
});
```

### Modifying Conversation Flow

Edit the state machine handlers in `src/stateMachine.ts` to customize how the bot responds to messages in each state.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GREEN_API_INSTANCE_ID` | Your Green API instance ID | Yes |
| `GREEN_API_TOKEN` | Your Green API token | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: 3000) | No |
| `TEST_USER_PHONE` | Phone number for Safe Mode (e.g., `972549762201`) | No |

## Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run the compiled bot server
- `npm run dev` - Run in development mode with auto-reload

## Database

The bot uses PostgreSQL to persist conversation states. The database schema is automatically created on first run. Each conversation stores:

- `chat_id`: Unique chat identifier (TEXT PRIMARY KEY)
- `state`: Current conversation state (TEXT)
- `context`: JSONB object with collected data
- `last_activity`: Timestamp of last activity (BIGINT)
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

## Error Handling

The bot includes error handling at multiple levels:

- API errors are caught and logged
- Database errors are handled gracefully
- Invalid messages are filtered out
- Unauthorized users in Safe Mode are silently ignored
- State machine errors reset the conversation to a safe state
- Webhook errors return appropriate HTTP status codes

## Security Considerations

- Never commit `.env` file or database credentials to version control
- Keep your Green API token secure
- Use HTTPS for webhook endpoints in production (Railway provides this automatically)
- Safe Mode restricts bot access during development
- Validate all user input
- Use connection pooling for database connections (already implemented)

## Troubleshooting

### Bot not receiving messages
- Check that your WhatsApp instance is authorized
- Verify `GREEN_API_INSTANCE_ID` and `GREEN_API_TOKEN` are correct
- Ensure webhook URL is correctly configured in Green API dashboard: `https://YOUR-APP.up.railway.app/webhook/greenapi`
- Check that your server is accessible from the internet
- Verify Safe Mode isn't blocking your messages
- Check server logs for errors

### Database connection errors
- Verify `DATABASE_URL` is correct (Railway provides this automatically)
- Ensure PostgreSQL is running (Railway handles this)
- Check database user permissions
- Verify network connectivity to database

### Webhook not working
- Ensure your webhook URL uses HTTPS (required by Green API, Railway provides this)
- Check that the `/webhook/greenapi` endpoint is accessible
- Verify the webhook is set correctly in Green API dashboard
- Check server logs for incoming requests

### Safe Mode blocking legitimate users
- Remove or unset `TEST_USER_PHONE` environment variable to disable Safe Mode
- Verify the phone number format matches (without `@c.us` suffix)

### Type errors
- Run `npm run build` to see detailed errors
- Ensure all dependencies are installed: `npm install`
- Check TypeScript version compatibility

## License

MIT

## Contributing

Feel free to open issues or submit pull requests for improvements.
