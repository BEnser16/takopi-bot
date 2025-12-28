require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('顯示指令說明清單'),
    
    new SlashCommandBuilder()
        .setName('add')
        .setDescription('新增一筆記帳')
        .addNumberOption(opt => opt.setName('amount').setDescription('金額').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('備註').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('list')
        .setDescription('列出最近 10 筆記帳'),
    
    // ... edit 和 delete 依此類推
    new SlashCommandBuilder()
        .setName('edit')
        .setDescription('編輯一筆記帳')
        .addIntegerOption(opt => opt.setName('id').setDescription('記帳ID').setRequired(true))
        .addNumberOption(opt => opt.setName('amount').setDescription('金額').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('備註').setRequired(true)),

    new SlashCommandBuilder()
        .setName('delete')
        .setDescription('刪除一筆記帳')
        .addIntegerOption(opt => opt.setName('id').setDescription('記帳ID').setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('正在註冊斜線指令...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('指令註冊成功！');
    } catch (error) {
        console.error(error);
    }
})();