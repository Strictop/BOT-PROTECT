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
        let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;

        const logChannelIdBan = "1299795446562295869"; // Remplacez par l'ID du channel de logs de ban
        const logChannel = client.channels.cache.get(logChannelIdBan);

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
            } catch (e) {
                return message.reply("Utilisateur introuvable. Assurez-vous de mentionner un utilisateur ou d'utiliser un ID valide.");
            }
        }

        if (member.id === message.author.id) {
            return message.reply("Tu ne peux pas te bannir !");
        }

        if (member.roles && member.roles.highest.position >= message.member.roles.highest.position) {
            return message.reply("Vous ne pouvez pas bannir un membre ayant un rôle supérieur ou égal au vôtre.");
        }

        const reason = args.slice(1).join(" ") || "Aucune raison spécifiée";

        try {
            await member.ban({ reason });
            message.reply({ content: `${member} a été banni du serveur.` });

            const joinDate = member.joinedAt ? moment(member.joinedAt).format('DD/MM/YYYY') : "Inconnu";
            const accountCreationDate = moment(member.user.createdAt).format('DD/MM/YYYY');
            const roles = member.roles ? member.roles.cache.map(role => role.name).join(", ") : "Aucun rôle";

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

            if (logChannel) logChannel.send({ embeds: [banEmbed] }).catch(console.error);
            const modlogChannel = client.channels.cache.get(ml.get(`${message.guild.id}.modlog`));
            if (modlogChannel) modlogChannel.send({ embeds: [banEmbed] }).catch(console.error);

        } catch (error) {
            console.error("Erreur lors du bannissement :", error); // Journalisation de l'erreur dans la console
            message.reply("Une erreur s'est produite lors du bannissement de cet utilisateur. Assurez-vous que le bot possède les permissions nécessaires.");
        }
    }
};
