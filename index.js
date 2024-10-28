const { Client, Intents, Collection } = require('discord.js');
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

// Commande pour reboot
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
        await logChannel.send(`🔴 Le bot va redémarrer...`);

        // Déconnecte le bot
        console.log("Déconnexion du bot en cours...");
        await client.destroy();

        // Reconnexion après 5 secondes
        setTimeout(async () => {
            try {
                console.log("Tentative de reconnexion...");
                await client.login(process.env.TOKEN);
                console.log("🔄 Reconnexion réussie.");
                await logChannel.send("🟢 Le bot a redémarré avec succès.");
            } catch (error) {
                console.error("Erreur lors de la tentative de reconnexion :", error);
            }
        }, 5000); // Délai de 5 secondes avant la reconnexion
    }
});

// Commande pour mettre à jour le bot via GitHub
client.on('messageCreate', async (message) => {
    if (message.content === '+update' && config.app.owners.includes(message.author.id)) {
        const logChannel = client.channels.cache.get(config.app.logChannelIdReboot);

        if (!logChannel) {
            console.error("Erreur : le canal de logs est introuvable.");
            return;
        }

        if (!logChannel.permissionsFor(client.user).has('SEND_MESSAGES')) {
            console.error("Erreur : le bot n'a pas la permission d'envoyer des messages dans le canal de logs.");
            return;
        }

        // Envoyer un message indiquant qu'un déploiement est attendu
        await logChannel.send("🔄 Mise à jour du bot en cours via GitHub. Render va redéployer le bot.");
        
        // Facultatif : Ajouter des informations sur le déploiement GitHub
        console.log("Pousse les modifications sur GitHub pour déclencher le redéploiement.");
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
