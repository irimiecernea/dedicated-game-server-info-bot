import { GameDig } from 'gamedig';
import { REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import 'dotenv/config';
let errorToDisplay;

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
        ];
    }

    async getServerInfo(type, host, port) {
        try {
            const state = await GameDig.query({
                type: type.toLowerCase(),
                host: host,
                port: port,
                givenPortOnly: true // the library will attempt multiple ports in order to ensure success, to avoid this pass this option
            });
            console.log(state);
            return state; // Returning state so it can be used elsewhere
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

    async start() {
        this.client.on('ready', () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
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
                            { name: 'Address:', value: `\`${serverInfo.connect}\``},
                            { name: 'Ping:', value: `${serverInfo.ping}` },
                            { name: 'Password Protected:', value: `${serverInfo.password}` },
                            { name: 'Players:', value: `${serverInfo.numplayers}/${serverInfo.maxplayers}`},
                        )
                        .setFooter({ text: 'Bot created by volkunus#7863.' });

                    await interaction.reply({ embeds: [successEmbed] });
                } else if (String(errorToDisplay).includes("Invalid")) {
                    const invalidGameEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(`${errorToDisplay}`)
                        .setDescription("For more information about the supported games, go to: https://github.com/gamedig/node-gamedig/blob/HEAD/GAMES_LIST.md")
                        .setFooter({ text: 'Bot created by volkunus#7863.' });
                    await interaction.reply({ embeds: [invalidGameEmbed] , ephemeral: true});
                    
                } else {
                    errorToDisplay = "Game server appears to be offline."
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle(`${errorToDisplay}`)
                        .setFooter({ text: 'Bot created by volkunus#7863.' });
                    await interaction.reply({ embeds: [errorEmbed] , ephemeral: true});
                }
            }
        });

        await this.setupCommands();
        await this.client.login(process.env.BOT_TOKEN);
    }
}

const bot = new Bot();
bot.start();
