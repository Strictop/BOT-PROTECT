const Discord = require("discord.js");
const db = require("quick.db");
const owner = new db.table("Owner");
const cl = new db.table("Color");
const config = require("../config");

module.exports = {
    name: 'bl',
    usage: 'bl <membre>',
    description: `Ajoute un membre dans la blacklist.`,
    async execute(client, message, args) {
        // Vérification si l'auteur du message a les droits de propriétaire
        if (owner.get(`owners.${message.author.id}`) || config.app.owners.includes(message.author.id)) {
            let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;

            // Cherche ou crée le rôle de blacklist
            let blacklistRole = message.guild.roles.cache.find(role => role.name === "Blacklist");
            if (!blacklistRole) {
                blacklistRole = await message.guild.roles.create({
                    name: 'Blacklist',
                    color: 'RED',
                    permissions: [] // Sans permissions par défaut
                });
            }

            // Vérifie si un membre est mentionné
            if (!args[0]) {
                return message.channel.send("Veuillez mentionner un membre à ajouter dans la blacklist.");
            }
            const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!member) {
                return message.channel.send(`Aucun membre trouvé pour \`${args[0] || "rien"}\``);
            }

            // Vérifie si l'utilisateur est déjà blacklisté
            if (db.get(`${config.app.blacklist}.${member.id}`) === member.id) {
                return message.channel.send(`${member.user.username} est déjà blacklisté.`);
            }

            // Ajoute l'utilisateur à la blacklist dans la base de données
            db.push(`${config.app.blacklist}.blacklist`, member.id);
            db.set(`${config.app.blacklist}.${member.id}`, member.id);

            // Assigne le rôle de blacklist au membre
            await member.roles.add(blacklistRole);
            
            // Restriction des permissions dans chaque canal de texte
            message.guild.channels.cache.forEach(async (channel) => {
                if (channel.isText()) {
                    await channel.permissionOverwrites.edit(blacklistRole, {
                        SEND_MESSAGES: false // Empêche l'envoi de messages
                    });
                }
            });

            // Confirmation d'ajout dans la blacklist
            const embed = new Discord.MessageEmbed()
                .setColor(color)
                .setDescription(`<@${member.id}> a été ajouté à la blacklist et ne peut plus envoyer de messages.`);

            return message.channel.send({ embeds: [embed] });
        } else {
            return message.channel.send("Vous n'avez pas la permission d'utiliser cette commande.");
        }
    }
};
