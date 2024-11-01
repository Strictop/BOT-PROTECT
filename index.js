const { Client, Intents, Collection } = require('discord.js');
const axios = require('axios');
const config = require('./config');
const httpport = require('./oport.js');
const { readdirSync } = require("fs");
const db = require('quick.db');
const { Player } = require('discord-player');
const ms = require("ms");

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_BANS, 
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_INTEGRATIONS, 
        Intents.FLAGS.GUILD_WEBHOOKS, Intents.FLAGS.GUILD_INVITES, Intents.FLAGS.GUILD_VOICE_STATES, 
        Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
        Intents.FLAGS.GUILD_MESSAGE_TYPING, Intents.FLAGS.DIRECT_MESSAGES, 
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ],
    restTimeOffset: 0,
    partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION"]
});

client.commands = new Collection();
global.player = new Player(client, config.app.discordPlayer);

// Log des événements de démarrage avec la même logique que le test
client.on('ready', () => {
    const logChannel = client.channels.cache.get(config.app.logChannelIdReboot);
    
    if (!logChannel) {
        console.error("Erreur : le canal de logs est introuvable. Vérifiez l'ID du salon dans config.js.");
    } else if (!logChannel.permissionsFor(client.user).has('SEND_MESSAGES')) {
        console.error("Erreur : le bot n'a pas la permission d'envoyer des messages dans le canal de logs.");
    } else {
        logChannel.send("🟢 Le bot est maintenant en ligne.")
            .then(() => console.log("Message de démarrage envoyé avec succès dans le canal de logs."))
            .catch(err => console.error("Erreur lors de l'envoi du message de démarrage :", err));
    }
    
    console.log(`Le bot est prêt, connecté en tant que ${client.user.tag}`);
});

// Commande pour déclencher le redéploiement via le webhook Render
client.on('messageCreate', async (message) => {
    if (message.content === '+reboot' && config.app.owners.includes(message.author.id)) {
        const logChannel = client.channels.cache.get(config.app.logChannelIdReboot);
        
        if (!logChannel) {
            console.error("Erreur : le canal de logs est introuvable. Vérifiez l'ID du salon dans config.js.");
            return;
        }

        if (!logChannel.permissionsFor(client.user).has('SEND_MESSAGES')) {
            console.error("Erreur : le bot n'a pas la permission d'envoyer des messages dans le canal de logs.");
            return;
        }

        // Envoie un message indiquant que le bot va redémarrer
        await logChannel.send(`🔴 Le bot va redémarrer via le webhook Render...`);

        // Appel du webhook de déploiement de Render
        try {
            const response = await axios.post(process.env.RENDER_DEPLOY_WEBHOOK);
            if (response.status === 200) {
                console.log("Webhook de déploiement exécuté avec succès.");
                await logChannel.send("🟢 Le déploiement du bot a été déclenché avec succès via Render.");
            } else {
                console.error("Erreur lors de l'exécution du webhook de déploiement :", response.statusText);
                await logChannel.send("❌ Échec du déclenchement du déploiement via Render.");
            }
        } catch (error) {
            console.error("Erreur lors de la requête webhook :", error);
            await logChannel.send("❌ Échec de la requête pour déclencher le déploiement.");
        }
    }
});

// Gestionnaire de commandes et événements (comme avant)
const commandFolders = ['moderation', 'botcontrol', 'gestion', 'utilities', 'logs', 'antiraid'];
for (const folder of commandFolders) {
    const commandFiles = readdirSync(`./${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./${folder}/${file}`);
        client.commands.set(command.name, command);
    }
}

const eventFiles = readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
    }
}

// Anti-crash
process.on("unhandledRejection", (reason, p) => {
    console.log(reason, p);
});
process.on("uncaughtException", (err, origin) => {
    console.log(err, origin);
});
process.on("multipleResolves", (type, promise, reason) => {
    console.log(type, promise, reason);
});

client.login(process.env.TOKEN);
