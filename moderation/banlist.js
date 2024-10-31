const Discord = require("discord.js");
const db = require("quick.db");
const owner = new db.table("Owner");
const config = require("../config");
const moment = require("moment");
const fs = require("fs");
const { createObjectCsvWriter } = require("csv-writer");

const banLogDB = new db.table("BanLog");

module.exports = {
    name: 'banlist',
    usage: '+banlist [export]',
    description: `Affiche la liste des utilisateurs bannis avec leurs informations. Ajoutez "export" pour obtenir un fichier CSV.`,

    async execute(client, message, args) {
        const isOwner = owner.get(`owners.${message.author.id}`) || 
                        config.app.owners.includes(message.author.id);

        if (!isOwner) {
            return message.reply("Vous n'avez pas la permission d'utiliser cette commande.");
        }

        try {
            const banList = await message.guild.bans.fetch();
            if (banList.size === 0) {
                return message.reply("Il n'y a actuellement aucun utilisateur banni sur ce serveur.");
            }

            // Option d'exportation vers un fichier CSV
            if (args[0] === "export") {
                // Chemin temporaire pour le fichier CSV
                const csvFilePath = `/tmp/banlist_${message.guild.id}.csv`;

                // Création de l'écrivain CSV
                const csvWriter = createObjectCsvWriter({
                    path: csvFilePath,
                    header: [
                        { id: 'username', title: 'Nom d\'utilisateur' },
                        { id: 'id', title: 'ID' },
                        { id: 'banDate', title: 'Date du bannissement' },
                        { id: 'duration', title: 'Durée depuis le bannissement' }
                    ]
                });

                // Préparation des données pour le fichier CSV
                const records = banList.map(ban => {
                    const user = ban.user;
                    const banInfo = banLogDB.get(`${message.guild.id}.${user.id}`);
                    const banDate = banInfo ? moment(banInfo.date) : null;
                    const banDuration = banDate ? `${banDate.fromNow()}` : "Date inconnue";

                    return {
                        username: user.tag,
                        id: user.id,
                        banDate: banDate ? banDate.format("DD/MM/YYYY HH:mm") : "Inconnue",
                        duration: banDuration
                    };
                });

                // Écriture dans le fichier CSV
                await csvWriter.writeRecords(records);

                // Envoi du fichier CSV dans le canal Discord
                await message.channel.send({
                    content: "Voici la liste des utilisateurs bannis en format CSV :",
                    files: [csvFilePath]
                });

                // Suppression du fichier temporaire
                fs.unlinkSync(csvFilePath);
                return;
            }

            // Affichage normal de la liste des bannis (sans export)
            const bansPerPage = 5;
            const totalPages = Math.ceil(banList.size / bansPerPage);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * bansPerPage;
                const currentBans = Array.from(banList.values()).slice(start, start + bansPerPage);

                const embed = new Discord.MessageEmbed()
                    .setColor("#FF0000")
                    .setTitle(`Liste des utilisateurs bannis - Page ${page + 1}/${totalPages}`)
                    .setFooter({ text: client.user.username, iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                currentBans.forEach(ban => {
                    const user = ban.user;
                    const banInfo = banLogDB.get(`${message.guild.id}.${user.id}`);
                    const banDate = banInfo ? moment(banInfo.date) : null;
                    const banDuration = banDate ? `${banDate.fromNow()} (${banDate.format("DD/MM/YYYY HH:mm")})` : "Date inconnue";

                    embed.addFields(
                        { name: "Nom d'utilisateur", value: `${user.tag}`, inline: true },
                        { name: "ID", value: `${user.id}`, inline: true },
                        { name: "Banni depuis", value: banDuration, inline: true }
                    );
                });

                return embed;
            };

            const embedMessage = await message.channel.send({ embeds: [generateEmbed(currentPage)] });

            if (totalPages > 1) {
                await embedMessage.react('⬅️');
                await embedMessage.react('➡️');

                const filter = (reaction, user) => {
                    return ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
                };

                const collector = embedMessage.createReactionCollector({ filter, time: 60000 });

                collector.on('collect', (reaction) => {
                    reaction.users.remove(message.author);

                    if (reaction.emoji.name === '➡️') {
                        if (currentPage < totalPages - 1) {
                            currentPage++;
                            embedMessage.edit({ embeds: [generateEmbed(currentPage)] });
                        }
                    } else if (reaction.emoji.name === '⬅️') {
                        if (currentPage > 0) {
                            currentPage--;
                            embedMessage.edit({ embeds: [generateEmbed(currentPage)] });
                        }
                    }
                });

                collector.on('end', () => {
                    embedMessage.reactions.removeAll();
                });
            }

        } catch (error) {
            console.error("Erreur lors de la récupération de la liste des bannis :", error);
            message.reply("Une erreur s'est produite lors de la récupération de la liste des bannis.");
        }
    }
};
