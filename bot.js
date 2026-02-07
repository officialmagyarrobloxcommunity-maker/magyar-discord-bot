require('dotenv').config();
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.commands = new Collection();
client.cooldowns = new Collection();

// Számoló játék változók
const countingChannels = new Map();
const countingData = new Map(); // { channelId: { currentNumber, lastUser, startTime } }
const userStats = new Map(); // { userId: { correctCount, mistakes } }

// Prefix
const PREFIX = '!';

// Események
client.once('ready', () => {
    console.log(`✅ ${client.user.tag} sikeresen elindult!`);
    client.user.setActivity('!help | Magyar Bot', { type: 'PLAYING' });
});

// Hibakezelés
client.on('error', console.error);
client.on('warn', console.warn);

// Üdvözlő üzenet
client.on('guildMemberAdd', (member) => {
    const channel = member.guild.channels.cache.find(ch => ch.name === 'általános' || ch.name === 'üdvözlő');
    if (channel) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('Üdv a szerveren! 🎉')
            .setDescription(`Szia **${member.user.tag}**! Üdvözöljük a(z) **${member.guild.name}** szerverén!`)
            .addFields(
                { name: '📋 Szabályok', value: 'Olvasd el a szabályokat!', inline: true },
                { name: '💬 Parancsok', value: 'Írd be: !help', inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setTimestamp();
        channel.send({ embeds: [welcomeEmbed] });
    }
});

// Számoló játék ellenőrzése
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const channelId = message.channelId;

    // Ha ez egy számoló csatorna
    if (countingChannels.has(channelId)) {
        const expectedNumber = countingData.get(channelId)?.currentNumber || 1;

        // Ellenőrizzük, hogy a szám egyezik-e
        const messageNumber = parseInt(message.content);

        if (!isNaN(messageNumber) && messageNumber === expectedNumber) {
            // Helyes szám!
            const data = countingData.get(channelId) || { currentNumber: 1, lastUser: null, startTime: Date.now() };
            data.currentNumber = expectedNumber + 1;
            data.lastUser = message.author.id;
            countingData.set(channelId, data);

            // Statisztika frissítése
            if (!userStats.has(message.author.id)) {
                userStats.set(message.author.id, { correctCount: 0, mistakes: 0 });
            }
            const stats = userStats.get(message.author.id);
            stats.correctCount++;
            userStats.set(message.author.id, stats);

            // Reakció
            await message.react('✅');
        } else if (!isNaN(messageNumber)) {
            // Rossz szám!
            const data = countingData.get(channelId) || { currentNumber: 1 };
            data.currentNumber = 1;
            countingData.set(channelId, data);

            // Statisztika frissítése
            if (!userStats.has(message.author.id)) {
                userStats.set(message.author.id, { correctCount: 0, mistakes: 0 });
            }
            const stats = userStats.get(message.author.id);
            stats.mistakes++;
            userStats.set(message.author.id, stats);

            await message.reply(`❌ **Nem jó!** A következő szám **${expectedNumber}** lett volna! Újrakezdjük: 1`);
        }
    }

    // Parancsok kezelése
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Parancsok
    const commands = {
        // Számoló játék
        szamol: () => {
            const subCommand = args[0];

            if (subCommand === 'start') {
                countingChannels.set(message.channelId, true);
                countingData.set(message.channelId, { currentNumber: 1, lastUser: null, startTime: Date.now() });
                message.reply('🎮 **Számoló játék elindítva!** Kezdjük: 1');
            } else if (subCommand === 'stop') {
                countingChannels.delete(message.channelId);
                countingData.delete(message.channelId);
                message.reply('⏹️ **Számoló játék leállítva!**');
            } else if (subCommand === 'stat') {
                const stats = userStats.get(message.author.id) || { correctCount: 0, mistakes: 0 };
                message.reply(`📊 **Statisztikád:**\n✅ Helyes: ${stats.correctCount}\n❌ Hibás: ${stats.mistakes}`);
            } else if (subCommand === 'toplista') {
                const sorted = [...userStats.entries()].sort((a, b) => b[1].correctCount - a[1].correctCount).slice(0, 10);
                let leaderboard = '🏆 **Számoló Toplista**\n\n';
                sorted.forEach((entry, index) => {
                    const [userId, stats] = entry;
                    const user = client.users.cache.get(userId);
                    const name = user ? user.username : 'Ismeretlen';
                    leaderboard += `${index + 1}. **${name}** - ${stats.correctCount} helyes\n`;
                });
                message.reply(leaderboard);
            } else {
                message.reply('📖 **Számoló parancsok:**\n- `!szamol start` - Játék indítása\n- `!szamol stop` - Játék leállítása\n- `!szamol stat` - Statisztikád\n- `!szamol toplista` - Ranglista');
            }
        },

        // Moderáció
        kick: () => {
            if (!message.member.permissions.has('KickMembers')) {
                return message.reply('❌ Nincs jogod ehhez!');
            }
            const user = message.mentions.members.first();
            if (!user) return message.reply('❌ Jelölj meg egy felhasználót!');
            user.kick().then(() => {
                message.reply(`✅ **${user.user.tag}** kirúgva!`);
            }).catch(err => {
                console.error('Kick error:', err);
                message.reply('❌ Nem sikerült kirúgni! (Lehet, hogy nincs jogod vagy magasabb a szerepkörje)');
            });
        },

        ban: () => {
            if (!message.member.permissions.has('BanMembers')) {
                return message.reply('❌ Nincs jogod ehhez!');
            }
            const user = message.mentions.members.first();
            if (!user) return message.reply('❌ Jelölj meg egy felhasználót!');
            user.ban().then(() => {
                message.reply(`✅ **${user.user.tag}** kitiltva!`);
            }).catch(err => {
                console.error('Ban error:', err);
                message.reply('❌ Nem sikerült kitiltani! (Lehet, hogy nincs jogod vagy magasabb a szerepkörje)');
            });
        },

        mute: () => {
            if (!message.member.permissions.has('ModerateMembers')) {
                return message.reply('❌ Nincs jogod ehhez!');
            }
            const user = message.mentions.members.first();
            if (!user) return message.reply('❌ Jelölj meg egy felhasználót!');
            user.timeout(60000 * 10).then(() => {
                message.reply(`✅ **${user.user.tag}** némítva 10 percre!`);
            }).catch(err => {
                console.error('Mute error:', err);
                message.reply('❌ Nem sikerült némítani! (Lehet, hogy nincs jogod vagy magasabb a szerepkörje)');
            });
        },

        warn: () => {
            if (!message.member.permissions.has('ModerateMembers')) {
                return message.reply('❌ Nincs jogod ehhez!');
            }
            const user = message.mentions.members.first();
            if (!user) return message.reply('❌ Jelölj meg egy felhasználót!');
            message.reply(`⚠️ **${user.user.tag}** figyelmeztetve lett!`);
        },

        // Játékok
        kocka: () => {
            const sides = parseInt(args[0]) || 6;
            if (sides < 2 || sides > 100) return message.reply('❌ A kockának 2 és 100 oldal között kell lennie!');
            const result = Math.floor(Math.random() * sides) + 1;
            message.reply(`🎲 Kockadobás (${sides} oldal): **${result}**`);
        },

        kviz: () => {
            const questions = [
                { q: 'Mi Franciaország fővárosa?', a: ['párizs', 'paris'] },
                { q: 'Mennyi 5 + 7?', a: ['12'] },
                { q: 'Mi a legnagyobb bolygó a Naprendszerben?', a: ['jupiter'] },
                { q: 'Hány nap van egy évben?', a: ['365'] },
                { q: 'Mi a víz képlete?', a: ['h2o', 'h2o', 'H2O'] },
                { q: 'Ki írta a Himnuszt?', a: ['kölcsey', 'kölcsey ferenc'] }
            ];
            const q = questions[Math.floor(Math.random() * questions.length)];
            message.reply(`🧠 **Kérdés:** ${q.q}\n*Tipp: írd be a választ!*`);

            let answered = false;
            const collector = message.channel.createMessageCollector({ time: 15000 });
            collector.on('collect', m => {
                if (answered) return;
                const userAnswer = m.content.toLowerCase().trim();
                if (q.a.some(answer => userAnswer === answer || userAnswer.includes(answer))) {
                    answered = true;
                    m.reply('✅ **Helyes válasz!** Gratulálok!');
                    collector.stop();
                }
            });
            collector.on('end', (collected, reason) => {
                if (reason === 'time' && !answered) {
                    message.reply(`⏱️ Lejárt az idő! A helyes válasz: **${q.a[0]}**`);
                }
            });
        },

        trivia: () => {
            const trivias = [
                { q: 'Hány állama van az USA-nak?', a: ['50'] },
                { q: 'Mi a leggyorsabb állat a szárazföldön?', a: ['leopárd', ' gepárd', 'cheetah'] },
                { q: 'Melyik évben volt Holdra szállás?', a: ['1969'] },
                { q: 'Mi a leghosszabb folyó a világon?', a: ['amazonas', 'amazon'] }
            ];
            const t = trivias[Math.floor(Math.random() * trivias.length)];
            message.reply(`❓ **Trivia:** ${t.q}\n*Tipp: írd be a választ!*`);

            let answered = false;
            const collector = message.channel.createMessageCollector({ time: 20000 });
            collector.on('collect', m => {
                if (answered) return;
                const userAnswer = m.content.toLowerCase().trim();
                if (t.a.some(answer => userAnswer.includes(answer))) {
                    answered = true;
                    m.reply('✅ **Helyes válasz!** Gratulálok!');
                    collector.stop();
                }
            });
            collector.on('end', (collected, reason) => {
                if (reason === 'time' && !answered) {
                    message.reply(`⏱️ Lejárt az idő! A helyes válasz: **${t.a[0]}**`);
                }
            });
        },

        // Szavazás
        szavazas: () => {
            const pollText = args.join(' ');
            if (!pollText) return message.reply('❌ Írd be a szavazás témáját!');
            const pollEmbed = new EmbedBuilder()
                .setColor(0xFFAA00)
                .setTitle('📊 Szavazás')
                .setDescription(pollText)
                .setFooter({ text: 'Reagálj 👍 vagy 👎' });
            message.channel.send({ embeds: [pollEmbed] }).then(msg => {
                msg.react('👍');
                msg.react('👎');
            });
        },

        // Egyéb
        help: () => {
            const helpEmbed = new EmbedBuilder()
                .setColor(0x00AAFF)
                .setTitle('🤖 Magyar Bot Parancsok')
                .addFields(
                    { name: '🎮 Számoló játék', value: '`!szamol start` - Játék indítása\n`!szamol stop` - Játék leállítása\n`!szamol stat` - Statisztikád\n`!szamol toplista` - Ranglista', inline: false },
                    { name: '🔧 Moderáció', value: '`!kick @felhasználó` - Kirúgás\n`!ban @felhasználó` - Kitiltás\n`!mute @felhasználó` - Némítás\n`!warn @felhasználó` - Figyelmeztetés', inline: false },
                    { name: '🎲 Játékok', value: '`!kocka [szám]` - Kockadobás\n`!kviz` - Kvízkérdés\n`!trivia` - Trivia kérdés', inline: false },
                    { name: '📊 Egyéb', value: '`!szavazas [szöveg]` - Szavazás indítása\n`!info` - Szerver infó', inline: false }
                )
                .setTimestamp();
            message.reply({ embeds: [helpEmbed] });
        },

        info: () => {
            const infoEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('ℹ️ Szerver Információ')
                .addFields(
                    { name: '📛 Szerver neve', value: message.guild.name, inline: true },
                    { name: '👥 Tagok', value: `${message.guild.memberCount}`, inline: true },
                    { name: '👑 Tulajdonos', value: `<@${message.guild.ownerId}>`, inline: true },
                    { name: '📅 Létrehozva', value: `<t:${Math.floor(message.guild.createdTimestamp / 1000)}:D>`, inline: true }
                )
                .setThumbnail(message.guild.iconURL())
                .setTimestamp();
            message.reply({ embeds: [infoEmbed] });
        },

        ping: () => {
            message.reply(`🏓 Pong! **${client.ws.ping}ms**`);
        }
    };

    // Parancs végrehajtása
    if (commands[commandName]) {
        commands[commandName]();
    }
});

// Bot indítása
client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('❌ Nem sikerült bejelentkezni a bottal! Ellenőrizd a DISCORD_TOKEN-t!');
    console.error(err);
    process.exit(1);
});
