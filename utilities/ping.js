const ms = require('ms');
const Discord = require('discord.js');
const config = require("../config");
const db = require('quick.db');
const cl = new db.table("Color");
const footer = config.app.footer;

module.exports = {
    name: 'ping',
    description: `Permet de voir la latence du bot en temps réel.`,

    async execute(client, message, args) {
        let color = cl.fetch(`color_${message.guild.id}`);
        if (color == null) color = config.app.color;

        // Créer l'embed initial
        const embed = new Discord.MessageEmbed()
            .setTitle("Latence du bot")
            .setColor(color)
            .addField('BOT', `${client.ws.ping}ms`, true)
            .addField('API', 'Calcul en cours...', true);

        // Envoyer l'embed initial
        const msg = await message.channel.send({ embeds: [embed] });

        // Mettre à jour la latence en temps réel toutes les 2 secondes
        const interval = setInterval(() => {
            embed.fields[0].value = `${client.ws.ping}ms`;
            embed.fields[1].value = `${Date.now() - message.createdTimestamp}ms`;
            msg.edit({ embeds: [embed] });
        }, 2000);

        // Arrêter la mise à jour après 30 secondes ou si le message est supprimé
        setTimeout(() => clearInterval(interval), 30000);
    }
};
