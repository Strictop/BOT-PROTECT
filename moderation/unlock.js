const Discord = require("discord.js");
const db = require("quick.db");
const owner = new db.table("Owner");
const cl = new db.table("Color");
const ml = new db.table("modlog");
const p3 = new db.table("Perm3");
const config = require("../config");

module.exports = {
    name: "lock",
    usage: "lock",
    description: `Permet de verrouiller un salon.`,
    async execute(client, message, args) {
        let color = cl.fetch(`color_${message.guild.id}`) || config.app.color;

        // Vérification des permissions pour l'utilisateur
        if (
            owner.get(`owners.${message.author.id}`) ||
            config.app.owners.includes(message.author.id) ||
            config.app.funny.includes(message.author.id) ||
            message.member.roles.cache.has(p3.fetch(`perm3_${message.guild.id}`))
        ) {
            if (args[0] === "all") {
                // Verrouiller tous les salons
                try {
                    message.guild.channels.cache.forEach((channel) => {
                        channel.permissionOverwrites.edit(
                            message.guild.id,
                            {
                                SEND_MESSAGES: false,
                            },
                            `Tous les salons verrouillés par ${message.author.tag}`
                        );
                    });

                    message.channel.send(`${message.guild.channels.cache.size} salons verrouillés.`);

                    const channellogs = ml.get(`${message.guild.id}.modlog`);
                    const embed = new Discord.MessageEmbed()
                        .setDescription(
                            `:lock: | ${message.author.tag} a verrouillé tous les salons du serveur.`
                        )
                        .setTimestamp()
                        .setColor(color)
                        .setFooter({ text: `📚` });

                    const logchannel = client.channels.cache.get(channellogs);
                    if (logchannel) logchannel.send({ embeds: [embed] }).catch(() => false);
                } catch (error) {
                    console.error("Erreur lors du verrouillage de tous les salons :", error);
                    message.channel.send("Impossible de verrouiller certains salons. Vérifiez les permissions.");
                }
                return;
            }

            // Verrouiller un salon spécifique
            const channel =
                message.mentions.channels.first() ||
                message.guild.channels.cache.get(args[0]) ||
                message.channel;

            try {
                await channel.permissionOverwrites.edit(
                    message.guild.id,
                    {
                        SEND_MESSAGES: false,
                    },
                    `Salon verrouillé par ${message.author.tag}`
                );
                message.channel.send(`Les membres ne peuvent plus parler dans <#${channel.id}>.`);
            } catch (error) {
                console.error("Erreur lors du verrouillage du salon :", error);
                message.channel.send(
                    `Impossible de verrouiller le salon <#${channel.id}>. Vérifiez les permissions.`
                );
            }

            // Logs
            const logEmbed = new Discord.MessageEmbed()
                .setColor(color)
                .setDescription(
                    `<@${message.author.id}> a \`verrouillé\` le salon <#${channel.id}>.`
                )
                .setTimestamp()
                .setFooter({ text: `📚` });

            const logchannel = client.channels.cache.get(ml.get(`${message.guild.id}.modlog`));
            if (logchannel) logchannel.send({ embeds: [logEmbed] }).catch(() => false);
        } else {
            // Permissions insuffisantes
            message.channel.send("Vous n'avez pas les permissions pour utiliser cette commande.");
        }
    },
};
