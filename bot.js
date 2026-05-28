const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder,
    AuditLogEvent
} = require('discord.js');

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1480186439890239498";
const GUILD_ID = "1450556913300279393";

/* ================= CLIENT ================= */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/* ================= DATA ================= */

let data = {};

function getUser(id){
    if(!data[id]){
        data[id] = {
            money:0,
            lastDaily:0,
            lastWork:0
        };
    }
    return data[id];
}

/* ================= EMOJIS ================= */

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

/* ================= SLASH COMMANDS ================= */

const commands = [
    new SlashCommandBuilder().setName("daily").setDescription("Claim daily reward"),
    new SlashCommandBuilder().setName("work").setDescription("Work for coins"),
    new SlashCommandBuilder().setName("balance").setDescription("Check balance"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Top players"),
    new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gamble coins")
        .addIntegerOption(o =>
            o.setName("amount")
             .setDescription("Coins to gamble")
             .setRequired(true)
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

/* ================= MESSAGE COMMANDS ================= */

client.on("messageCreate", async message=>{
    if(message.author.bot) return;
    if(!message.content.startsWith("goodmc ")) return;

    const args = message.content.slice(7).trim().toLowerCase();
    const user = getUser(message.author.id);

    if(args==="balance"){
        return message.reply(`💰 ${user.money} coins`);
    }

    if(args==="daily"){
        const now = Date.now();
        if(now - user.lastDaily < 86400000)
            return message.reply("⏳ Already claimed!");

        user.money += 500;
        user.lastDaily = now;
        return message.reply("💰 +500 coins");
    }

    if(args==="work"){
        const now = Date.now();
        if(now - user.lastWork < 3600000)
            return message.reply("⏳ Wait before working again");

        user.money += 50;
        user.lastWork = now;
        return message.reply("💰 +50 coins");
    }

    if(args==="leaderboard"){
        const sorted = Object.entries(data)
            .sort((a,b)=>b[1].money-a[1].money)
            .slice(0,10);

        let text="";
        sorted.forEach((u,i)=>{
            text += `${i+1}. <@${u[0]}> — ${u[1].money} coins\n`;
        });

        return message.reply({
            embeds:[new EmbedBuilder()
                .setTitle("🏆 Leaderboard")
                .setDescription(text || "No data")
                .setColor("Blue")]
        });
    }

    if(args.startsWith("gamble ")){
        const amount = parseInt(args.split(" ")[1]);
        if(!amount || amount<=0) return message.reply("❌ Invalid amount");
        if(user.money < amount) return message.reply("❌ Not enough coins");

        let finalResult=["","",""];

        const spinMsg = await message.channel.send({
            embeds:[new EmbedBuilder().setDescription(
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${spinEmoji} ${spinEmoji} ${spinEmoji} ┃
╚══════════════════╝`).setColor("Purple")]
        });

        for(let i=0;i<3;i++){
            await new Promise(r=>setTimeout(r,1200));

            finalResult[i]=slotEmojis[Math.floor(Math.random()*slotEmojis.length)];

            const display =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult[0]||spinEmoji} ${finalResult[1]||spinEmoji} ${finalResult[2]||spinEmoji} ┃
╚══════════════════╝`;

            await spinMsg.edit({
                embeds:[new EmbedBuilder().setDescription(display).setColor("Purple")]
            });
        }

        const win = finalResult[0]===finalResult[1] && finalResult[1]===finalResult[2];
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

/* ================= SLASH COMMAND HANDLER ================= */

client.on("interactionCreate", async interaction=>{
    if(!interaction.isChatInputCommand()) return;

    const user = getUser(interaction.user.id);

    if(interaction.commandName==="daily"){
        const now = Date.now();
        if(now - user.lastDaily < 86400000)
            return interaction.reply("⏳ Already claimed!");

        user.money += 500;
        user.lastDaily = now;
        return interaction.reply("💰 +500 coins");
    }

    if(interaction.commandName==="work"){
        const now = Date.now();
        if(now - user.lastWork < 3600000)
            return interaction.reply("⏳ Wait before working again");

        user.money += 50;
        user.lastWork = now;
        return interaction.reply("💰 +50 coins");
    }

    if(interaction.commandName==="balance"){
        return interaction.reply(`💰 ${user.money} coins`);
    }

    if(interaction.commandName==="leaderboard"){
        const sorted = Object.entries(data)
            .sort((a,b)=>b[1].money-a[1].money)
            .slice(0,10);

        let text="";
        sorted.forEach((u,i)=>{
            text += `${i+1}. <@${u[0]}> — ${u[1].money} coins\n`;
        });

        return interaction.reply({
            embeds:[new EmbedBuilder()
                .setTitle("🏆 Leaderboard")
                .setDescription(text || "No data")
                .setColor("Blue")]
        });
    }

    if(interaction.commandName==="gamble"){
        const amount = interaction.options.getInteger("amount");
        if(user.money < amount) return interaction.reply("❌ Not enough coins");

        let finalResult=["","",""];

        await interaction.reply({
            embeds:[new EmbedBuilder().setDescription(
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${spinEmoji} ${spinEmoji} ${spinEmoji} ┃
╚══════════════════╝`).setColor("Purple")]
        });

        const msg = await interaction.fetchReply();

        for(let i=0;i<3;i++){
            await new Promise(r=>setTimeout(r,1200));

            finalResult[i]=slotEmojis[Math.floor(Math.random()*slotEmojis.length)];

            const display =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult[0]||spinEmoji} ${finalResult[1]||spinEmoji} ${finalResult[2]||spinEmoji} ┃
╚══════════════════╝`;

            await msg.edit({
                embeds:[new EmbedBuilder().setDescription(display).setColor("Purple")]
            });
        }

        const win = finalResult[0]===finalResult[1] && finalResult[1]===finalResult[2];
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

/* ================= TICKET SYSTEM ================= */

client.on("channelCreate", async (channel) => {

    if (!channel.isTextBased()) return;
    if (!channel.name.startsWith("ticket-")) return;

    try {
        const logs = await channel.guild.fetchAuditLogs({
            type: AuditLogEvent.ChannelCreate,
            limit: 1
        });

        const log = logs.entries.first();
        if (!log) return;

        const creator = log.executor;
        if (!creator) return;

        const snapshot = await db.collection("users").get();

        let foundUser = null;

        snapshot.forEach(doc => {
            const data = doc.data();

            if (
                data.discordId === creator.id ||
                data.username?.toLowerCase() === creator.username.toLowerCase()
            ) {
                foundUser = data;
            }
        });

        if (!foundUser) {
            return channel.send("❌ No user found in database");
        }

        const embed = new EmbedBuilder()
            .setTitle("🎫 Ticket User Info")
            .addFields(
                { name: "👤 Username", value: foundUser.username || creator.username, inline: true },
                { name: "🏆 Rank", value: foundUser.rank || "None", inline: true },
                { name: "🆔 Discord ID", value: creator.id }
            )
            .setColor("Purple");

        channel.send({ embeds: [embed] });

    } catch (err) {
        console.error(err);
        channel.send("❌ Error fetching user info");
    }

});

/* ================= READY ================= */

client.once("ready",()=>console.log("🤖 Bot online"));

client.login(TOKEN);
