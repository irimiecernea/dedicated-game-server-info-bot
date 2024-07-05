import { GameDig } from 'gamedig';
import { REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';

let errorToDisplay;

// Store intervals and last message IDs for each guild and channel
const intervals = new Map();
const lastMessages = new Map();

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

            const guildLastMessages = lastMessages.get(guildId) || new Map();
            const lastMessageID = guildLastMessages.get(channelId);
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
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle(`Name: ${serverInfo.name}`)
                    .addFields(
                        { name: 'Status:', value: `:green_circle:Online` },
                        { name: 'Game:', value: String(serverInfo.raw.folder).toUpperCase() },
                        { name: 'Address:', value: `\`${serverInfo.connect}\`` },
                        { name: 'Ping:', value: `${serverInfo.ping}` },
                        { name: 'Password Protected:', value: `${serverInfo.password}` },
                        { name: 'Players:', value: `${serverInfo.numplayers}/${serverInfo.maxplayers}` },
                        { name: 'Last Updated: ', value: `<t:${String(currentDateTimestamp).split('.')[0]}:R>`}
                    )
                    .setFooter({ text: 'Bot created by volkunus#7863.' });

                const sentMessage = await channel.send({ embeds: [successEmbed] });
                guildLastMessages.set(channelId, sentMessage.id);
                lastMessages.set(guildId, guildLastMessages);
            } else if (String(errorToDisplay).includes("Invalid")) {
                const invalidGameEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`${errorToDisplay}`)
                    .setDescription("For more information about the supported games, go to: https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md")
                    .setFooter({ text: 'Bot created by volkunus#7863.' });

                const sentMessage = await channel.send({ embeds: [invalidGameEmbed] });
                guildLastMessages.set(channelId, sentMessage.id);
                lastMessages.set(guildId, guildLastMessages);
            } else {
                errorToDisplay = "Game server appears to be offline.";
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle(`${errorToDisplay}`)
                    .setFooter({ text: 'Bot created by volkunus#7863.' });

                const sentMessage = await channel.send({ embeds: [errorEmbed] });
                guildLastMessages.set(channelId, sentMessage.id);
                lastMessages.set(guildId, guildLastMessages);
            }
        } catch (error) {
            console.error(`Failed to update server status: ${error}`);
        }
    }

    async start() {
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
            this.client.user.setActivity('Monitoring game servers...');
        });

        this.client.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return;

            if (interaction.commandName === 'serverinfo') {
                const type = interaction.options.getString('type');
                const host = interaction.options.getString('host');
                const port = interaction.options.getInteger('port');

                const serverInfo = await this.getServerInfo(type, host, port);
                if (serverInfo) {
                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle(`Name: ${serverInfo.name}`)
                        .addFields(
                            { name: 'Status:', value: `:green_circle:Online` },
                            { name: 'Game:', value: String(serverInfo.raw.folder).toUpperCase() },
                            { name: 'Address:', value: `\`${serverInfo.connect}\`` },
                            { name: 'Ping:', value: `${serverInfo.ping}` },
                            { name: 'Password Protected:', value: `${serverInfo.password}` },
                            { name: 'Players:', value: `${serverInfo.numplayers}/${serverInfo.maxplayers}` },
                        )
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
                    await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                }
            }

            if (interaction.commandName === 'monitorserver') {
                const type = interaction.options.getString('type');
                const host = interaction.options.getString('host');
                const port = interaction.options.getInteger('port');

                if (!interaction.channelId) {
                    console.log('Interaction channel is null');
                    await interaction.reply({ content: 'Unable to monitor server. Interaction channel is not available.', ephemeral: true });
                    return;
                }

                const guildId = interaction.guildId;
                const channelId = interaction.channelId;

                // Initialize guild maps if they don't exist
                if (!intervals.has(guildId)) intervals.set(guildId, new Map());
                if (!lastMessages.has(guildId)) lastMessages.set(guildId, new Map());

                const guildIntervals = intervals.get(guildId);
                
                // Clear any existing interval to avoid duplicate updates
                if (guildIntervals.has(channelId)) {
                    clearInterval(guildIntervals.get(channelId));
                }

                // Set an interval to update the server status every 5 minutes (300000 milliseconds)
                const intervalID = setInterval(() => {
                    this.updateServerStatus(guildId, channelId, type, host, port);
                }, 300000); // 5 minutes

                guildIntervals.set(channelId, intervalID);
                intervals.set(guildId, guildIntervals);

                await interaction.reply({ content: 'Started monitoring server status. Updates will be sent every 5 minutes.', ephemeral: true });
            }
        });

        await this.setupCommands();
        await this.client.login(process.env.BOT_TOKEN);
    }
}

const bot = new Bot();
bot.start();
