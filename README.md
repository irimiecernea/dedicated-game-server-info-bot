# dedicated-game-server-info-bot
This is a Discord bot for fetching public information about dedicated game servers hosted via Steam.

# Getting started

### 💼 Prerequisites

- git
- brew (https://brew.sh)

### 🔧 Installation

```
brew install nvm
```

## 🧭 Quickstart

Clone the project and then run the following commands:

```
nvm use
npm install
```

Create a `.env` file and add the proper credentials, as in the example below:

```
BOT_TOKEN=12345
CLIENT_ID=12345
```

## Run command

Run `npm run bot` in the terminal to start the bot. You should see the following output, which should contain the name of your bot:

```
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
Logged in as my-bot-name#1234!
```

### Bot commands

```
/serverinfo - needs 3 parameters, game type (e.g. counterstrike2, valheim, etc.), host (e.g. 86.124.33.6) and port (e.g. 27015)
/monitorserveer - needs 3 parameters, game type (e.g. counterstrike2, valheim, etc.), host (e.g. 86.124.33.6) and port (e.g. 27015). updates the current channel every 300 seconds (5 minutes) with the server status.
/stopmonitor - stops the monitoring in the current channel
```

### Supported games

When using either `/serverinfo` or `/monitorserver` commands, the game type needs to exist [here](https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md). If you query for an invalid game type or if the server is offline, the bot will show the appropriate error.
