const Discord = require("discord.js");
const db = require('quick.db');
const owner = new db.table("Owner");
const cl = new db.table("Color");
const config = require("../config");
const ml = new db.table("modlog");
const p3 = new db.table("Perm3");

module.exports = {
    name: 'ban',
    usage: 'ban <membre>',
    description: `Permet de bannir un membre.`,
    async execute(client, message, args) {
        let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;

        if (owner.get(`owners.${message.author.id}`) || config.app.owners.includes(message.author.id) || config.app.funny.includes(message.author.id) === true) {
            let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!member) {
                try {
                    member = await client.users.fetch(args[0]);
                } catch (e) {
                    return message.reply("Utilisateur introuvable.");
                }
            }

            if (!member) {
                return message.reply("Merci de mentionner l'utilisateur que vous souhaitez bannir du serveur !");
            }

            if (member.id === message.author.id) {
                return message.reply("Tu ne peux pas te bannir !");
            }

            let reason = args.slice(1).join(" ") || `Aucune raison`;
            try {
                await message.reply(`${member} a été banni du serveur.`);
                await member.send(`Tu as été banni par ${message.author} pour la raison suivante: \n\n${reason}`);
                await member.ban({ reason: reason });

                const joinDate = member.joinedAt ? moment(member.joinedAt).format("DD/MM/YYYY HH:mm:ss") : "Inconnue";
                const creationDate = moment(member.user.createdAt).format("DD/MM/YYYY HH:mm:ss");
                const roles = member.roles.cache.map(role => role.name).join(", ") || "Aucun rôle";

                const banLogEmbed = new Discord.MessageEmbed()
                    .setColor(color)
                    .setTitle("Membre Banni")
                    .addField("Utilisateur", `${member} (${member.id})`, true)
                    .addField("Banni par", `<@${message.author.id}>`, true)
                    .addField("Raison", reason, true)
                    .addField("Date de création du compte", creationDate, true)
                    .addField("Date d'adhésion au serveur", joinDate, true)
                    .addField("Rôles précédents", roles, true)
                    .setTimestamp()
                    .setFooter({ text: `📚` });

                const logChannel = client.channels.cache.get(config.app.logChannelIdBan); // Utilise l'ID du config.js
                if (logChannel) logChannel.send({ embeds: [banLogEmbed] });
            } catch (error) {
                console.error("Erreur lors du bannissement:", error);
            }
        } else if (message.member.roles.cache.has(p3.get(`perm3_${message.guild.id}`)) === true) {
            // Similar check and ban logic for users with permission level 3
            // (repeated code omitted for brevity)
        }
    }
};
