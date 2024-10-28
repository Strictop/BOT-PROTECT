const Discord = require("discord.js");
const db = require("quick.db");
const owner = new db.table("Owner");
const cl = new db.table("Color");
const config = require("../config");
const p3 = new db.table("Perm3");
const moment = require("moment");

module.exports = {
    name: 'ban',
    usage: 'ban <membre>',
    description: `Permet de bannir un membre.`,
    async execute(client, message, args) {
        let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;

        const isOwner = owner.get(`owners.${message.author.id}`) || config.app.owners.includes(message.author.id) || config.app.funny.includes(message.author.id);
        const hasPerm3 = message.member.roles.cache.has(p3.get(`perm3_${message.guild.id}`));

        if (!isOwner && !hasPerm3) {
            return message.reply("Vous n'avez pas la permission de bannir des utilisateurs.");
        }

        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            try {
                member = await message.guild.members.fetch(args[0]);
            } catch (e) {
                return message.reply("Utilisateur introuvable.");
            }
        }

        // Nouvelle vérification des permissions
        if (member.id === message.author.id) {
            return message.reply("Tu ne peux pas te bannir !");
        }
        if (!member.bannable) {
            return message.reply("Impossible de bannir cet utilisateur. Vérifiez les permissions du bot et la hiérarchie des rôles.");
        }

        let reason = args.slice(1).join(" ") || "Aucune raison";

        try {
            await member.send(`Tu as été banni du serveur par ${message.author.tag} pour la raison suivante :\n\n${reason}`).catch(err => console.log("Impossible d'envoyer un DM à l'utilisateur."));

            await member.ban({ reason });
            await message.reply(`${member.user.tag} a été banni du serveur.`);

            const joinDate = member.joinedAt ? moment(member.joinedAt).format("DD/MM/YYYY HH:mm:ss") : "Inconnue";
            const creationDate = moment(member.user.createdAt).format("DD/MM/YYYY HH:mm:ss");
            const roles = member.roles.cache.map(role => role.name).join(", ") || "Aucun rôle";

            const banLogEmbed = new Discord.MessageEmbed()
                .setColor(color)
                .setTitle("Membre Banni")
                .addField("Utilisateur", `${member.user.tag} (${member.id})`, true)
                .addField("Banni par", `<@${message.author.id}>`, true)
                .addField("Raison", reason, true)
                .addField("Date de création du compte", creationDate, true)
                .addField("Date d'adhésion au serveur", joinDate, true)
                .addField("Rôles précédents", roles, true)
                .setTimestamp()
                .setFooter({ text: `📚` });

            const logChannel = client.channels.cache.get(config.app.logChannelIdBan);
            if (logChannel) logChannel.send({ embeds: [banLogEmbed] });
        } catch (error) {
            console.error("Erreur lors du bannissement:", error);
            message.reply("Une erreur s'est produite en essayant de bannir l'utilisateur.");
        }
    }
};
