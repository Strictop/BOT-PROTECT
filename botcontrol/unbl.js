const Discord = require("discord.js");
const db = require("quick.db");
const owner = new db.table("Owner");
const cl = new db.table("Color");
const config = require("../config");

module.exports = {
    name: 'unbl',
    usage: 'unbl <membre>',
    description: `Retire un membre de la blacklist.`,
    async execute(client, message, args) {
        // Vérification si l'auteur du message a les droits de propriétaire
        if (owner.get(`owners.${message.author.id}`) || config.app.owners.includes(message.author.id)) {
            let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;

            // Vérifie si un membre est mentionné
            if (!args[0]) {
                return message.channel.send("Veuillez mentionner un membre à retirer de la blacklist.");
            }
            const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!member) {
                return message.channel.send(`Aucun membre trouvé pour \`${args[0] || "rien"}\``);
            }

            // Vérifie si l'utilisateur est bien dans la blacklist
            if (db.get(`${config.app.blacklist}.${member.id}`) !== member.id) {
                return message.channel.send(`${member.user.username} n'est pas dans la blacklist.`);
            }

            // Supprime l'utilisateur de la blacklist dans la base de données
            db.delete(`${config.app.blacklist}.${member.id}`);
            db.set(`${config.app.blacklist}.blacklist`, db.get(`${config.app.blacklist}.blacklist`).filter(id => id !== member.id));

            // Supprime le rôle de blacklist du membre
            const blacklistRole = message.guild.roles.cache.find(role => role.name === "Blacklist");
            if (blacklistRole && member.roles.cache.has(blacklistRole.id)) {
                await member.roles.remove(blacklistRole);
            }

            // Réinitialise les permissions dans chaque canal pour le rôle blacklist
            message.guild.channels.cache.forEach(async (channel) => {
                if (channel.isTextBased() && blacklistRole) {
                    await channel.permissionOverwrites.edit(blacklistRole, {
                        SEND_MESSAGES: null // Réinitialise la permission d'envoi de messages
                    });
                }
            });

            // Envoie un message de confirmation
            const embed = new Discord.MessageEmbed()
                .setColor(color)
                .setDescription(`<@${member.id}> a été retiré de la blacklist et peut à nouveau envoyer des messages.`);

            return message.channel.send({ embeds: [embed] });
        } else {
            return message.channel.send("Vous n'avez pas la permission d'utiliser cette commande.");
        }
    }
};
