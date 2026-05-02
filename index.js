require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { run, all } = require('./db');
const { dailyWeatherCronJob, fetchOpenWeatherMap, parseWeatherResponse } = require('./Services/weatherService');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    dailyWeatherCronJob(client);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user } = interaction;

    if (commandName === 'add') {
        const amount = options.getNumber('amount');
        const desc = options.getString('description');
        if(user.id === null || amount === null || desc === null) {
            await interaction.reply('❌ 抱歉嗶~ 請提供所有必要參數。');
            return;
        }

        try {
            console.log('Adding record:', user.id, amount, desc);

            const result = await run('INSERT INTO expenses (user_id, amount, description) VALUES (?, ?, ?)', [user.id, amount, desc]);
        
            // 從 result.lastID 直接拿 ID，最安全且快速
            await interaction.reply(`✅ 記帳成功！\nID: \`${result.lastID}\` | 金額: \`${amount}\` | 備註: \`${desc}\``);

        } catch (err) {
            console.error(err);
            await interaction.reply('❌ 寫入資料庫時發生錯誤啦嗶~');
        }
    }

    if (commandName === 'list') {
        console.log('Listing records');
        try {
            const embed = new EmbedBuilder().setTitle('📊 掏出快樂帳本，看看最近 10 筆記帳紀錄嗶~ ：').setColor(0x00AE86);
            let description = '';

            // 使用 await 呼叫我們在 db.js 封裝好的 all 函式
            const rows = await all('SELECT * FROM expenses ORDER BY created_at DESC LIMIT 10');
            
            if (rows.length === 0) {
                return await interaction.reply('目前沒有任何紀錄欸嗶...');
            }

            rows.forEach(row => {
                // 假設 row.created_at 是資料庫的字串，轉成 timestamp
                const time = Math.floor(new Date(row.created_at).getTime() / 1000);
                const discordTime = `<t:${time}:d>`; // 只顯示日期，比較不佔空間

                description += `\`#${row.id.toString().padEnd(3)}\` |\u3000 <@${row.user_id}> \u3000|\u3000 **$${row.amount}** \u3000|\u3000 ${discordTime} \u3000|\u3000 *${row.description}*\n`;                
            });

            embed.setDescription(description || '暫無紀錄');
            
            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            await interaction.reply('❌ 讀取資料庫時發生錯誤啦嗶~');
        }
    }

    if (commandName === 'edit') {
        const id = options.getInteger('id');
        const amount = options.getNumber('amount');
        const desc = options.getString('description');

        try {
            const result = await run('UPDATE expenses SET amount = ?, description = ? WHERE id = ?', [amount , desc , id]);
            await interaction.reply(`✅ 編輯成功！\nID: \`${id}\` | 新金額: \`${amount}\` | 新備註: \`${desc}\``);
        } catch (err) {
            console.error(err);
            await interaction.reply('❌ 編輯資料庫時發生錯誤啦嗶~');
        }
    }

    if (commandName === 'delete') {
        const id = options.getInteger('id');

        try {
            await run('DELETE FROM expenses WHERE id = ?', id);
            await interaction.reply(`✅ 刪除成功！\nID: \`${id}\` 已被移除。`);
        } catch (err) {
            console.error(err);
            await interaction.reply('❌ 刪除資料庫時發生錯誤啦嗶~');
        }
    }

    if (commandName === 'weather') {
        try {
            const data = await fetchOpenWeatherMap();
            const text = parseWeatherResponse(data);
            await interaction.reply(text);
        } catch (err) {
            console.error(err);
            await interaction.reply('❌ 取得天氣資料失敗嗶~ 請稍後再試。');
        }
        return;
    }

    if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🐙 TokoPi 指令手冊')
            .setDescription('歡迎使用 TokoPi！ 一個簡單記帳機器人，以下是可用的指令說明嗶~')
            .setColor(0xFFD700) // 金色
            .addFields(
                { name: '💰 記帳', value: '`/add [金額] [備註]`\n例如：`/add 100 午餐`', inline: false },
                { name: '📋 查詢', value: '`/list`\n顯示最近的 10 筆紀錄', inline: true },
                { name: '🗑️ 刪除', value: '`/delete [ID]`\n輸入清單中的 ID 即可刪除', inline: true },
                { name: '🌤️ 天氣', value: '`/weather`\n取得今日台北天氣預報', inline: true }
            )
            .setFooter({ text: 'Power by gemini • v1.0' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }

});

client.login(process.env.DISCORD_TOKEN);