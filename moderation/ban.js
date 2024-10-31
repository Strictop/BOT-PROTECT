const Discord = require("discord.js");
const db = require("quick.db");
const owner = new db.table("Owner");
const cl = new db.table("Color");
const config = require("../config");
const ml = new db.table("modlog");
const p3 = new db.table("Perm3");
const moment = require("moment");

module.exports = {
    name: 'ban',
    usage: 'ban <membre>',
    description: `Permet de bannir un membre.`,
    async execute(client, message, args) {
        let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;
        const logChannelIdBan = "1301377565335748698"; // Remplacez par l'ID du channel de logs de ban
        const logChannel = client.channels.cache.get(logChannelIdBan);
        const botLogo = client.user.displayAvatarURL(); // Logo du bot
        const botName = client.user.username; // Nom du bot
        const banGifUrl = "https://media1.tenor.com/m/EQXD0BbdmzEAAAAC/caseoh-yourebanned.gif"; // Lien vers le GIF de bannissement

        const isOwner = owner.get(`owners.${message.author.id}`) || 
                        config.app.owners.includes(message.author.id) || 
                        config.app.funny.includes(message.author.id);

        if (!isOwner && !message.member.roles.cache.has(p3.get(`perm3_${message.guild.id}`))) {
            return message.reply("Vous n'avez pas la permission de bannir des membres.");
        }

        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            try {
                member = await client.users.fetch(args[0]);
                member = await message.guild.members.fetch(member.id);
            } catch (e) {
                console.error("Erreur lors de la récupération de l'utilisateur :", e);
                return message.reply("Merci de mentionner un utilisateur valide ou de fournir un ID valide !");
            }
        }

        if (member.id === message.author.id) {
            return message.reply("Tu ne peux pas te bannir toi-même !");
        }

        if (member.roles && member.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply("Vous ne pouvez pas bannir un membre ayant un rôle supérieur ou égal au vôtre.");
        }

        const reason = args.slice(1).join(" ") || "Aucune raison spécifiée";

        try {
            if (!member.bannable) {
                console.error("Le bot ne peut pas bannir cet utilisateur en raison d'un problème de hiérarchie.");
                return message.reply("Le bot n'a pas la permission de bannir cet utilisateur.");
            }

            await member.ban({ reason });
            message.reply({ content: `${member.user.tag} a été banni du serveur.` });
        } catch (error) {
            console.error("Erreur lors du bannissement :", error);
            return message.reply("Une erreur s'est produite lors du bannissement de cet utilisateur. Assurez-vous que le bot a les permissions nécessaires.");
        }

        // Envoi du MP à l'utilisateur banni
        const dmEmbed = new Discord.MessageEmbed()
            .setColor("#FF0000")
            .setTitle("🚫 Tu as été banni du serveur")
            .setDescription(`Tu as été banni du serveur **${message.guild.name}** par **${message.author.tag}**.\n\n**Raison :** ${reason}`)
            .setImage(banGifUrl)
            .setFooter({ text: botName, iconURL: botLogo });

        member.send({ embeds: [dmEmbed] }).catch(() => {
            console.error(`Impossible d'envoyer un MP à ${member.user.tag}`);
        });

        // Embed pour les logs du serveur
        const joinDate = member.joinedAt ? moment(member.joinedAt).format('DD/MM/YYYY') : "Inconnu";
        const accountCreationDate = moment(member.user.createdAt).format('DD/MM/YYYY');
        const roles = member.roles.cache.map(role => role.name).join(", ") || "Aucun rôle";

        const banLogEmbed = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("🚫 Utilisateur Banni")
            .setDescription(`**${member.user.tag}** a été banni par <@${message.author.id}>`)
            .addFields(
                { name: "🆔 ID de l'utilisateur", value: member.id, inline: true },
                { name: "📅 Création du compte", value: accountCreationDate, inline: true },
                { name: "📆 Arrivée sur le serveur", value: joinDate, inline: true },
                { name: "🔨 Raison", value: reason },
                { name: "👥 Rôles précédents", value: roles }
            )
            .setTimestamp()
            .setFooter({ text: botName, iconURL: botLogo });

        if (logChannel) logChannel.send({ embeds: [banLogEmbed] }).catch(() => false);
        const modlogChannel = client.channels.cache.get(ml.get(`${message.guild.id}.modlog`));
        if (modlogChannel) modlogChannel.send({ embeds: [banLogEmbed] }).catch(() => false);
    }
};
