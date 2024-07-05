import { GameDig } from 'gamedig';
import { REST, Routes } from 'discord.js';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import 'dotenv/config';

class Bot {

    constructor() {
        this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
        this.rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        this.commands = [
            {
                name: 'ping',
                description: 'Replies with Pong!',
            },
            {
                name: 'serverinfo',
                description: 'Replies with server info!',
            },
        ];
    }

    async getServerInfo() {
        try {
            const state = await GameDig.query({
                type: 'valheim',
                host: '192.168.1.157',
                port: 4457, // lets us explicitly specify the query port of this server
                givenPortOnly: true // the library will attempt multiple ports in order to ensure success, to avoid this pass this option
            });
            console.log(state);
            return state; // Returning state so it can be used elsewhere
        } catch (error) {
            console.log(`Server is offline, error: ${error}`);
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

            if (interaction.commandName === 'ping') {
                await interaction.reply('Pong!');
            }

            if (interaction.commandName === 'serverinfo') {
                const serverInfo = await this.getServerInfo();

                if (serverInfo) {
                    //defining a successful embed, where all the data was fetched correctly and can be returned
                    const successEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('Server Status')
                        // .setURL('https://d2runewizard.com/terror-zone-tracker')
                        .setDescription('Detailed information about the dedicated server')
                        .setThumbnail('https://media.moddb.com/images/members/5/4358/4357203/profile/d2r.jpg')
                        .addFields(
                            { name: 'Game', value: String(serverInfo.raw.folder).toUpperCase() },
                            { name: 'Server Name:', value: `${serverInfo.name}` },
                            { name: 'Server Address:', value: `${serverInfo.connect}`, inline: true },
                            { name: 'Ping:', value: `${serverInfo.ping}`, inline: true },
                            { name: 'Password Protected:', value: `${serverInfo.password}` },
                            { name: 'Players:', value: `${serverInfo.numplayers}/${serverInfo.maxplayers}`, inline: true },
                        )
                        .setFooter({ text: 'Bot created by volkunus#7863.' });

                    await interaction.reply({ embeds: [successEmbed] });
                } else {
                    //defining an error embed, which is to be sent when there was something wrong when fetching the data
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('Error')
                        // .setURL('https://d2runewizard.com/terror-zone-tracker')
                        .addFields(
                            { name: 'Error...', value: 'Server is offline or an error occurred.' }
                        )
                        .setTimestamp()
                        .setFooter({ text: 'Bot created by volkunus#7863.' });
                    await interaction.reply({ embeds: [errorEmbed] });
                }
            }
        });

        await this.setupCommands();
        await this.client.login(process.env.BOT_TOKEN);
    }
}

const bot = new Bot();
bot.start();
