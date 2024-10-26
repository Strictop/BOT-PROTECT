const Discord = require("discord.js");
const db = require("quick.db");
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
        // Récupération de la couleur du serveur, avec fallback à une couleur par défaut
        let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;
        
        // ID du channel pour les logs de bannissement
        const logChannelIdBan = "ID_DU_CHANNEL_DE_LOGS_BAN"; // Remplacez par l'ID du channel de logs de ban
        const logChannel = client.channels.cache.get(logChannelIdBan);

        // Vérification des permissions de l'auteur du message
        const isOwner = owner.get(`owners.${message.author.id}`) || 
                        config.app.owners.includes(message.author.id) || 
                        config.app.funny.includes(message.author.id);

        if (!isOwner && !message.member.roles.cache.has(p3.get(`perm3_${message.guild.id}`))) {
            return message.reply("Vous n'avez pas la permission de bannir des membres.");
        }

        // Récupération de l'utilisateur à bannir
        let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!member) {
            try {
                member = await client.users.fetch(args[0]);
            } catch (e) {
                return message.reply("Merci de mentionner un utilisateur valide ou de fournir un ID valide !");
            }
        }

        // Interdiction de bannir soi-même
        if (member.id === message.author.id) {
            return message.reply("Tu ne peux pas te bannir !");
        }

        // Vérification des permissions de hiérarchie pour éviter le ban d'un membre ayant des permissions supérieures
        if (member.roles && member.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply("Vous ne pouvez pas bannir un membre ayant un rôle supérieur ou égal au vôtre.");
        }

        // Récupération de la raison du ban
        const reason = args.slice(1).join(" ") || "Aucune raison spécifiée";

        // Envoi d'un message au membre banni (silencieux en cas d'échec)
        member.send({ content: `Vous avez été banni par ${message.author} pour la raison suivante: \n\n ${reason}` })
            .catch(() => null);

        // Bannissement de l'utilisateur
        try {
            await member.ban({ reason });
            message.reply({ content: `${member} a été banni du serveur.` });
        } catch (error) {
            return message.reply("Une erreur s'est produite lors du bannissement de cet utilisateur.");
        }

        // Récupération des informations de l'utilisateur
        const joinDate = member.joinedAt ? moment(member.joinedAt).format('DD/MM/YYYY') : "Inconnu";
        const accountCreationDate = moment(member.user.createdAt).format('DD/MM/YYYY');
        const roles = member.roles.cache.map(role => role.name).join(", ") || "Aucun rôle";

        // Création de l'embed de logs
        const banEmbed = new Discord.MessageEmbed()
            .setColor(color)
            .setTitle("Utilisateur banni")
            .setDescription(`<@${message.author.id}> a \`banni\` ${member} du serveur`)
            .addFields(
                { name: "ID de l'utilisateur", value: member.id, inline: true },
                { name: "Date de création du compte", value: accountCreationDate, inline: true },
                { name: "Date d'arrivée sur le serveur", value: joinDate, inline: true },
                { name: "Raison", value: reason },
                { name: "Rôles précédents", value: roles }
            )
            .setTimestamp()
            .setFooter({ text: `📚` });

        // Envoi de l'embed de logs dans le channel de logs et dans le modlog, si définis
        if (logChannel) logChannel.send({ embeds: [banEmbed] }).catch(() => false);
        const modlogChannel = client.channels.cache.get(ml.get(`${message.guild.id}.modlog`));
        if (modlogChannel) modlogChannel.send({ embeds: [banEmbed] }).catch(() => false);
    }
};
