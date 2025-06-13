# Discord Bot Setup - Complete Idiot's Guide 🤖

This guide assumes you know absolutely nothing about Discord bots. Follow every step exactly.

## Part 1: Create the Bot on Discord's Website

### Step 1: Go to Discord Developer Portal
1. Open your web browser
2. Go to: https://discord.com/developers/applications
3. **Sign in with your Discord account** (the same one you use for Discord chat)

### Step 2: Create a New Application
1. Click the big blue **"New Application"** button (top right)
2. **Type a name** for your bot (e.g., "Claude Helper Bot")
3. Click **"Create"**
4. You'll see a page with your app details

### Step 3: Create the Bot
1. On the left side, click **"Bot"**
2. Click **"Add Bot"** button
3. Click **"Yes, do it!"** when it asks if you're sure
4. You now have a bot! 🎉

### Step 4: Get Your Bot Token (SUPER IMPORTANT)
1. Under the "Token" section, click **"Reset Token"**
2. Click **"Yes, do it!"** 
3. **COPY THE TOKEN** that appears (it looks like: `MTxxxxx.xxxxxx.xxxxxxxxxxxxxxx`)
4. **⚠️ SAVE THIS TOKEN SOMEWHERE SAFE** - you'll need it later
5. **⚠️ NEVER SHARE THIS TOKEN** - it's like a password for your bot

### Step 5: Enable Required Permissions
Still on the Bot page:
1. Scroll down to **"Privileged Gateway Intents"**
2. **Turn ON** these switches:
   - ☑️ **Message Content Intent** (THIS IS CRITICAL!)
   - ☑️ **Server Members Intent** (recommended)
3. Click **"Save Changes"** at the bottom

## Part 2: Invite Your Bot to Your Discord Server

### Step 6: Generate Invite Link
1. On the left side, click **"OAuth2"**
2. Then click **"URL Generator"** underneath it
3. Under **"Scopes"**, check the box for:
   - ☑️ **bot**
4. Under **"Bot Permissions"**, check these boxes:
   - ☑️ **View Channels**
   - ☑️ **Send Messages**
   - ☑️ **Read Message History**
   - ☑️ **Use Slash Commands** (optional but good to have)
5. **Copy the URL** that appears at the bottom

### Step 7: Actually Invite the Bot
1. **Paste the URL** in a new browser tab and press Enter
2. **Select your Discord server** from the dropdown
   - If you don't see your server, you don't have admin permissions on any servers
   - You need to either:
     - Create your own server (click + in Discord → Create My Own)
     - Ask a server admin to do this for you
3. Click **"Authorize"**
4. Complete any captcha if it appears
5. **Success!** Your bot should now appear in your server's member list (it will be offline until you start it)

## Part 3: Get Your Channel ID

### Step 8: Enable Developer Mode in Discord
1. **Open Discord** (the app or website)
2. Click the **⚙️ gear icon** (User Settings) next to your name
3. On the left, scroll down and click **"Advanced"**
4. **Turn ON** the switch for **"Developer Mode"**
5. Click the **X** to close settings

### Step 9: Get the Channel ID
1. **Go to the channel** where you want your bot to send messages
2. **Right-click on the channel name** (in the channel list on the left)
3. Click **"Copy Channel ID"** at the bottom of the menu
4. **Save this number** - it looks like: `123456789012345678`

## Part 4: Put Everything in Your .env File

### Step 10: Update Your .env File
Open your `.env` file and make it look like this:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=MTxxxxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx
DISCORD_CHANNEL_ID=123456789012345678

# Telegram Configuration (leave empty if not using)
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=

# General Configuration
LOG_LEVEL=info
PORT=3000
```

**Replace:**
- `MTxxxxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx` with YOUR actual bot token from Step 4
- `123456789012345678` with YOUR actual channel ID from Step 9

### Step 11: Save and Test
1. **Save the .env file**
2. In your terminal, run: `npm start`
3. You should see:
   ```
   Discord bot logged in as YourBotName#1234
   Discord platform initialized successfully
   MCP Server started successfully
   ```
4. **Check Discord** - your bot should now show as "Online" (green dot)

## Troubleshooting

### "Used disallowed intents"
- Go back to Step 5 and make sure **Message Content Intent** is turned ON

### "Invalid Token"
- Go back to Step 4 and get a fresh token
- Make sure there are no extra spaces in your .env file

### "Channel not found"
- Go back to Step 9 and get the channel ID again
- Make sure your bot has access to that channel

### Bot shows offline
- Check your bot token is correct
- Make sure you saved the .env file
- Restart the npm start command

### "Missing Permissions"
- Go back to Step 6 and make sure you selected the right permissions
- You might need to kick and re-invite the bot with the new permissions

## You're Done! 🎉

Your Discord bot is now set up and ready to receive messages from Claude Code. When Claude Code uses the communication tools, messages will appear in your chosen Discord channel.

**What's Next:**
- Start using Claude Code normally
- When you're away from your computer, check Discord for updates
- You can respond to prompts by typing in the Discord channel

**Security Note:**
- Never share your bot token
- Don't commit your .env file to version control
- If you accidentally share your token, go to the Discord Developer Portal and reset it