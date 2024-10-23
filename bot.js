import { GameDig } from 'gamedig';
import { REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';

let errorToDisplay;

// Load and save JSON data
function loadJSONData() {
    try {
        const data = fs.readFileSync('bot_data.json', 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File does not exist, return default structure
            console.log('bot_data.json not found, initializing with empty data.');
            return { intervals: {}, lastMessages: {} };
        } else {
            console.error('Error loading JSON data:', err);
            return { intervals: {}, lastMessages: {} };
        }
    }
}


function saveJSONData(data) {
    try {
        fs.writeFileSync('bot_data.json', JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving JSON data:', err);
    }
}

let botData = loadJSONData();
const intervals = new Map(Object.entries(botData.intervals));
const lastMessages = new Map(Object.entries(botData.lastMessages));

class Bot {
    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        this.commands = [
            new SlashCommandBuilder()
                .setName('serverinfo')
                .setDescription('Replies with server info!')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The type of game server')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('host')
                        .setDescription('The host address of the game server')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('port')
                        .setDescription('The port of the game server')
                        .setRequired(true))
                .toJSON(),
            new SlashCommandBuilder()
                .setName('monitorserver')
                .setDescription('Monitors server status and updates every 5 minutes')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('The type of game server')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('host')
                        .setDescription('The host address of the game server')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('port')
                        .setDescription('The port of the game server')
                        .setRequired(true))
                .toJSON(),
            new SlashCommandBuilder()
                .setName('stopmonitor')
                .setDescription('Stops monitoring the server in the current channel.')
                .toJSON(),
        ];
    }

    async getServerInfo(type, host, port) {
        try {
            const state = await GameDig.query({
                type: type.toLowerCase(),
                host: host,
                port: port,
                givenPortOnly: true
            });
            console.log(state);
            return state;
        } catch (error) {
            errorToDisplay = error;
            console.log(`Error: ${error}`);
            return null;
        }
    }

    async setupCommands() {
        try {
            console.log('Started refreshing application (/) commands.');
            await this.rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: this.commands });
            console.log('Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error(error);
        }
    }

    async updateServerStatus(guildId, channelId, type, host, port) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                console.log(`Channel with ID ${channelId} not found.`);
                return;
            }

            const guildLastMessages = lastMessages.get(guildId) || {};
            const lastMessageID = guildLastMessages[channelId];
            if (lastMessageID) {
                try {
                    const lastMessage = await channel.messages.fetch(lastMessageID);
                    if (lastMessage) {
                        await lastMessage.delete();
                    }
                } catch (err) {
                    console.log(`Failed to delete previous message: ${err}`);
                }
            }

            const serverInfo = await this.getServerInfo(type, host, port);
            if (serverInfo) {
                let currentDateTimestamp = new Date().getTime() / 1000;
                let port = (serverInfo.connect).split(':')[1];
                let address = (serverInfo.connect).includes('-') ? `nomansland.go.ro:${port}` : serverInfo.connect
                let serverLockStatus;
                let playerCount;

                if((serverInfo.raw.folder).includes('AbioticFactor')) {
                    serverLockStatus = (serverInfo.raw.tags[4]).split(':')[1];
                    playerCount = (serverInfo.raw.tags[5]).split(':')[1];
                } else {
                    serverLockStatus = serverInfo.password;
                    playerCount = serverInfo.numplayers;
                }
                
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('Server Information')
                    .addFields(
                        { name: 'Server Name:', value: `*${serverInfo.name}*` },
                        { name: 'Status:', value: `:green_circle: Online`},
                        { name: 'Game:', value: String(serverInfo.raw.folder).toUpperCase() },
                        { name: 'Address:', value: `\`${address}\`` },
                        { name: 'Ping:', value: `${serverInfo.ping}` },
                        { name: 'Password Protected:', value: `${serverLockStatus}` },
                        { name: 'Players:', value: `${playerCount}/${serverInfo.maxplayers}` },
                        { name: 'Last Updated: ', value: `<t:${String(currentDateTimestamp).split('.')[0]}:R>` }
                    )
                    .setFooter({ text: 'Bot created by volkunus#7863.' });

                const sentMessage = await channel.send({ embeds: [successEmbed] });
                guildLastMessages[channelId] = sentMessage.id;
                lastMessages.set(guildId, guildLastMessages);

                // Save updated lastMessages to JSON file
                botData.lastMessages[guildId] = guildLastMessages;
                saveJSONData(botData);
            } else if (String(errorToDisplay).includes("Invalid")) {
                const invalidGameEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`${errorToDisplay}`)
                    .setDescription("For more information about the supported games, go to: https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md")
                    .setFooter({ text: 'Bot created by volkunus#7863.' });

                const sentMessage = await channel.send({ embeds: [invalidGameEmbed] });
                guildLastMessages[channelId] = sentMessage.id;
                lastMessages.set(guildId, guildLastMessages);

                botData.lastMessages[guildId] = guildLastMessages;
                saveJSONData(botData);
            } else {
                errorToDisplay = "Game server appears to be offline.";
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`${errorToDisplay}`)
                    .setFooter({ text: 'Bot created by volkunus#7863.' });

                const sentMessage = await channel.send({ embeds: [errorEmbed] });
                guildLastMessages[channelId] = sentMessage.id;
                lastMessages.set(guildId, guildLastMessages);

                botData.lastMessages[guildId] = guildLastMessages;
                saveJSONData(botData);
            }
        } catch (error) {
            console.error(`Failed to update server status: ${error}`);
        }
    }

    async start() {
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
            this.client.user.setActivity('Monitoring game servers...');

            // Recreate intervals from JSON file
            for (const guildId in botData.intervals) {
                const guildIntervals = botData.intervals[guildId];
                for (const channelId in guildIntervals) {
                    const [type, host, port] = guildIntervals[channelId];
                    const intervalID = setInterval(() => {
                        this.updateServerStatus(guildId, channelId, type, host, port);
                    }, 300000); // 5 minutes
                    if (!intervals.has(guildId)) intervals.set(guildId, {});
                    intervals.get(guildId)[channelId] = intervalID;
                }
            }
        });

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'serverinfo') {
                const type = interaction.options.getString('type');
                const host = interaction.options.getString('host');
                const port = interaction.options.getInteger('port');

                const serverInfo = await this.getServerInfo(type, host, port);
                if (serverInfo) {
                    let port = (serverInfo.connect).split(':')[1];
                    let address = (serverInfo.connect).includes('-') ? `nomansland.go.ro:${port}` : serverInfo.connect
                    let serverLockStatus;
                    let playerCount;

                    if((serverInfo.raw.folder).includes('AbioticFactor')) {
                        serverLockStatus = (serverInfo.raw.tags[4]).split(':')[1];
                        playerCount = (serverInfo.raw.tags[5]).split(':')[1];
                    } else {
                        serverLockStatus = serverInfo.password;
                        playerCount = serverInfo.numplayers;
                    }

                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('Server Information')
                        .addFields(
                            { name: 'Server Name:', value: `*${serverInfo.name}*` },
                            { name: 'Status:', value: `:green_circle: Online` },
                            { name: 'Game:', value: String(serverInfo.raw.folder).toUpperCase() },
                            { name: 'Address:', value: `\`${address}\`` },
                            { name: 'Ping:', value: `${serverInfo.ping}`},
                            { name: 'Password Protected:', value: `${serverLockStatus}` },
                            { name: 'Players:', value: `${playerCount}/${serverInfo.maxplayers}`},
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Bot created by volkunus#7863.' });
                        

                    await interaction.reply({ embeds: [successEmbed] });
                } else if (String(errorToDisplay).includes("Invalid")) {
                    const invalidGameEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(`${errorToDisplay}`)
                        .setDescription("For more information about the supported games, go to: https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md")
                        .setFooter({ text: 'Bot created by volkunus#7863.' });

                    await interaction.reply({ embeds: [invalidGameEmbed], ephemeral: true });
                } else {
                    errorToDisplay = "Game server appears to be offline.";
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(`${errorToDisplay}`)
                        .setFooter({ text: 'Bot created by volkunus#7863.' });

                    await interaction.reply({ embeds: [errorEmbed] });
                }
            }

            if (interaction.commandName === 'monitorserver') {
                const type = interaction.options.getString('type');
                const host = interaction.options.getString('host');
                const port = interaction.options.getInteger('port');
            
                const guildId = interaction.guildId;
                const channelId = interaction.channelId;
            
                if (!intervals.has(guildId)) intervals.set(guildId, {});
                if (!lastMessages.has(guildId)) lastMessages.set(guildId, {});
            
                const guildIntervals = intervals.get(guildId);
            
                if (guildIntervals[channelId]) {
                    clearInterval(guildIntervals[channelId]);  // Stop the existing interval if any
                }
            
                const intervalID = setInterval(() => {
                    this.updateServerStatus(guildId, channelId, type, host, port);
                }, 300000);  // 5 minutes
            
                // Save the interval ID in the intervals Map
                guildIntervals[channelId] = intervalID;
            
                // Store server info (without interval ID) in botData for saving to JSON
                botData.intervals[guildId] = botData.intervals[guildId] || {};
                botData.intervals[guildId][channelId] = [type, host, port];
            
                saveJSONData(botData);  // Save updated data to JSON
            
                await interaction.reply({ content: 'Started monitoring server status.', ephemeral: true });
            }
            

            if (interaction.commandName === 'stopmonitor') {
                const guildId = interaction.guildId;
                const channelId = interaction.channelId;
            
                if (intervals.has(guildId)) {
                    const guildIntervals = intervals.get(guildId);
                    if (guildIntervals[channelId]) {
                        clearInterval(guildIntervals[channelId]);
                        delete guildIntervals[channelId];  // Remove the channel entry from intervals map
            
                        if (Object.keys(guildIntervals).length === 0) {
                            intervals.delete(guildId);  // Remove the guild if no channels are being monitored
                        } else {
                            intervals.set(guildId, guildIntervals);  // Update intervals map
                        }
            
                        // Update botData and save to JSON file
                        if (botData.intervals[guildId]) {
                            delete botData.intervals[guildId][channelId];
                            if (Object.keys(botData.intervals[guildId]).length === 0) {
                                delete botData.intervals[guildId];  // Remove the guild entry if empty
                            }
                            saveJSONData(botData);  // Save updated data
                        }
            
                        await interaction.reply({ content: 'Stopped monitoring server status in this channel.', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'No server monitoring is active in this channel.', ephemeral: true });
                    }
                } else {
                    await interaction.reply({ content: 'No server monitoring is active in this channel.', ephemeral: true });
                }
            }
            
        });

        await this.setupCommands();
        this.client.login(process.env.BOT_TOKEN);
    }
}

const bot = new Bot();
bot.start();