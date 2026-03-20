const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1480186439890239498";
const GUILD_ID = "1450556913300279393";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let data = {};

/* SHOP */
const shop = {
    lick: { price: 10000, name: "Lick", emoji: "👅" },
    vip: { price: 2000, name: "VIP Role", emoji: "💎" },
    lucky: { price: 1000, name: "Lucky Charm", emoji: "🍀" },
    cookie: { price: 100, name: "Cookie", emoji: "🍪" }
};

function getUser(id){
    if(!data[id]){
        data[id] = {
            money:0,
            lastDaily:0,
            lastWork:0,
            inventory:[],
            luckyBoost:false
        };
    }
    return data[id];
}

/* EMOJIS */
const spinEmoji = "<a:spin:1480248762789138656>";

const slotEmojis = [
"<:cherry:1480249175303131246>",
"<:eggplant:1480249069614923937>",
"<:heart:1480248711308247163>",
"<:tounge:1480300461918781452>",
"<:clover:1480300473855770624>",
"<:gem:1480300489412448478>",
"<:cookie:1480300499894009927>",
"<:moneybag:1480300510010408980>"
];

/* SLASH COMMANDS */
const commands = [
    new SlashCommandBuilder().setName("daily").setDescription("Claim daily reward"),
    new SlashCommandBuilder().setName("work").setDescription("Work to get money"),
    new SlashCommandBuilder().setName("balance").setDescription("Check your balance"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Richest players"),
    new SlashCommandBuilder().setName("shop").setDescription("View shop"),
    new SlashCommandBuilder().setName("inventory").setDescription("View inventory"),
    new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gamble coins")
        .addIntegerOption(o =>
            o.setName("amount").setRequired(true)
        )
].map(c => c.toJSON());

const rest = new REST({version:"10"}).setToken(TOKEN);

(async () => {
    console.log("🔄 Resetting commands...");

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: [] }
    );

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("✅ Commands loaded");
})();

/* MESSAGE COMMANDS */
client.on("messageCreate", async message=>{
    if(message.author.bot) return;
    if(!message.content.startsWith("goodmc ")) return;

    const args = message.content.slice(7).trim().toLowerCase();
    const user = getUser(message.author.id);

    if(args === "balance"){
        return message.reply(`💰 You have ${user.money} coins`);
    }

    if(args === "daily"){
        const now = Date.now();

        if(now - user.lastDaily < 86400000){
            return message.reply("⏳ Already claimed!");
        }

        user.money += 500;
        user.lastDaily = now;

        return message.reply("💰 +500 coins");
    }

    if(args === "work"){
        const now = Date.now();

        if(now - user.lastWork < 3600000){
            return message.reply("⏳ Wait before working again");
        }

        user.money += 50;
        user.lastWork = now;

        return message.reply("💰 +50 coins");
    }

    if(args.startsWith("gamble ")){
        const amount = parseInt(args.split(" ")[1]);

        if(user.money < amount) return message.reply("❌ Not enough coins");

        let finalResult = ["","",""];

        const spinMsg = await message.channel.send({
            embeds:[new EmbedBuilder().setDescription(
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${spinEmoji} ${spinEmoji} ${spinEmoji} ┃
╚══════════════════╝`).setColor("Purple")]
        });

        for(let i=0;i<3;i++){
            await new Promise(r=>setTimeout(r,1200));

            finalResult[i] = slotEmojis[Math.floor(Math.random()*slotEmojis.length)];

            const display =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult[0]||spinEmoji} ${finalResult[1]||spinEmoji} ${finalResult[2]||spinEmoji} ┃
╚══════════════════╝`;

            await spinMsg.edit({
                embeds:[new EmbedBuilder().setDescription(display).setColor("Purple")]
            });
        }

        let win = finalResult[0]===finalResult[1] && finalResult[1]===finalResult[2];

        const winnings = win ? amount*2 : -amount;
        user.money += winnings;

        await spinMsg.edit({
            embeds:[new EmbedBuilder().setDescription(
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult.join(" ")} ┃
╚══════════════════╝

${win ? `🎉 WON +${winnings}` : `💀 LOST ${amount}`}`
            ).setColor(win?"Green":"Red")]
        });
    }
});

/* SLASH COMMANDS */
client.on("interactionCreate", async interaction=>{
    if(!interaction.isChatInputCommand()) return;

    const user = getUser(interaction.user.id);

    if(interaction.commandName==="daily"){
        const now = Date.now();

        if(now - user.lastDaily < 86400000){
            return interaction.reply("⏳ Already claimed!");
        }

        user.money += 500;
        user.lastDaily = now;

        return interaction.reply("💰 +500 coins");
    }

    if(interaction.commandName==="work"){
        const now = Date.now();

        if(now - user.lastWork < 3600000){
            return interaction.reply("⏳ Wait before working again");
        }

        user.money += 50;
        user.lastWork = now;

        return interaction.reply("💰 +50 coins");
    }

    if(interaction.commandName==="balance"){
        return interaction.reply(`💰 ${user.money} coins`);
    }

    if(interaction.commandName==="gamble"){
        const amount = interaction.options.getInteger("amount");

        if(user.money < amount) return interaction.reply("❌ Not enough coins");

        let finalResult = ["","",""];

        await interaction.reply({
            embeds:[new EmbedBuilder().setDescription(
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${spinEmoji} ${spinEmoji} ${spinEmoji} ┃
╚══════════════════╝`).setColor("Purple")]
        });

        const msg = await interaction.fetchReply();

        for(let i=0;i<3;i++){
            await new Promise(r=>setTimeout(r,1200));

            finalResult[i] = slotEmojis[Math.floor(Math.random()*slotEmojis.length)];

            const display =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult[0]||spinEmoji} ${finalResult[1]||spinEmoji} ${finalResult[2]||spinEmoji} ┃
╚══════════════════╝`;

            await msg.edit({
                embeds:[new EmbedBuilder().setDescription(display).setColor("Purple")]
            });
        }

        let win = finalResult[0]===finalResult[1] && finalResult[1]===finalResult[2];

        const winnings = win ? amount*2 : -amount;
        user.money += winnings;

        await msg.edit({
            embeds:[new EmbedBuilder().setDescription(
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult.join(" ")} ┃
╚══════════════════╝

${win ? `🎉 WON +${winnings}` : `💀 LOST ${amount}`}`
            ).setColor(win?"Green":"Red")]
        });
    }
});

client.once("ready",()=>console.log("🤖 Bot online"));
client.login(TOKEN);
