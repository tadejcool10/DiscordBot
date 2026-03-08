const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');

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

// ===================== ECONOMY DATA =====================
let data = {};
const shop = {
    lick: { price: 10000, name: "Lick", emoji: "👅" },
    vip: { price: 2000, name: "VIP Role", emoji: "💎" },
    lucky: { price: 1000, name: "Lucky Charm", emoji: "🍀" },
    cookie: { price: 100, name: "Cookie", emoji: "🍪" }
};

if (fs.existsSync("money.json")) data = JSON.parse(fs.readFileSync("money.json"));

function save() { fs.writeFileSync("money.json", JSON.stringify(data, null, 2)); }

function getUser(id) {
    if (!data[id]) data[id] = { money: 0, lastDaily: 0, lastWork: 0, inventory: [] };
    return data[id];
}

// ===================== EMOJIS =====================
const BOT_EMOJIS = {
    cherry: "<:cherry:1480249175303131246>",
    eggplant: "<:eggplant:1480249069614923937>",
    heart: "<:heart:1480248711308247163>",
    spin: "<a:spin:1480248762789138656>"
};

const SLOT_SYMBOLS = [BOT_EMOJIS.cherry, BOT_EMOJIS.eggplant, BOT_EMOJIS.heart];

// ===================== SLASH COMMANDS =====================
const commands = [
    new SlashCommandBuilder().setName("daily").setDescription("Claim daily reward"),
    new SlashCommandBuilder().setName("work").setDescription("Work to get money"),
    new SlashCommandBuilder().setName("balance").setDescription("Check your balance"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Richest players"),
    new SlashCommandBuilder().setName("shop").setDescription("View the shop"),
    new SlashCommandBuilder().setName("inventory").setDescription("View your inventory"),
    new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Buy an item")
        .addStringOption(o => o.setName("item").setDescription("Item name").setRequired(true)),
    new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gamble your coins")
        .addIntegerOption(o => o.setName("amount").setDescription("Coins to gamble").setRequired(true))
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("Commands loaded");
})();

// ===================== MESSAGE COMMANDS =====================
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const msg = message.content.toLowerCase();
    if (!msg.startsWith("goodmc ")) return;
    const args = msg.slice(7).trim();
    const user = getUser(message.author.id);

    // Basic economy commands (balance, daily, work, shop, inventory) ...
    // (keep your previous code here, unchanged)

    // -------- GAMBLE MESSAGE COMMAND --------
    if (args.startsWith("gamble ")) {
        const amount = parseInt(args.split(" ")[1]);
        if (!amount || amount <= 0) return message.channel.send("❌ Invalid amount");
        if (user.money < amount) return message.channel.send("❌ Not enough coins");

        // Start with spins
        let embed = new EmbedBuilder()
            .setTitle("🎰 Casino")
            .setDescription(`${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin}`)
            .setColor("Yellow");

        const spinMessage = await message.channel.send({ embeds: [embed] });

        // Result array, starts with spins
        const result = [BOT_EMOJIS.spin, BOT_EMOJIS.spin, BOT_EMOJIS.spin];

        // Reveal each slot one by one
        for (let i = 0; i < 3; i++) {
            // Animate spinning for current slot
            for (let j = 0; j < 5; j++) {
                result[i] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
                embed.setDescription(result.join(" "));
                await spinMessage.edit({ embeds: [embed] });
                await new Promise(r => setTimeout(r, 300));
                // Keep other spins as spin emoji until they land
                result[i] = BOT_EMOJIS.spin;
            }
            // Final emoji for this slot
            result[i] = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
            embed.setDescription(result.join(" "));
            await spinMessage.edit({ embeds: [embed] });
            await new Promise(r => setTimeout(r, 500));
        }

        // Determine win/loss
        let win = result[0] === result[1] && result[1] === result[2];
        let winnings = 0;
        if (win) { winnings = amount * 2; user.money += winnings; } 
        else { user.money -= amount; }
        save();

        embed.setDescription(result.join(" "));
        embed.setColor(win ? "Green" : "Red");
        embed.setFooter({ text: win ? `🎉 YOU WON ${winnings} coins!` : `💀 You lost ${amount} coins!` });
        await spinMessage.edit({ embeds: [embed] });
    }
});

// ===================== SLASH COMMANDS =====================
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const user = getUser(interaction.user.id);
    let embed;

    switch(interaction.commandName) {
        case "balance":
            embed = new EmbedBuilder().setTitle("💰 Balance").setDescription(`You have **${user.money} coins**`).setColor("Green");
            return interaction.reply({ embeds:[embed] });

        case "inventory":
            if(!user.inventory.length){ embed = new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty").setColor("Grey"); return interaction.reply({ embeds:[embed]}); }
            const counts={}; user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);
            let text=""; Object.keys(counts).forEach(i=>text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`);
            embed = new EmbedBuilder().setTitle(`🎒 ${interaction.user.username}'s Inventory`).setDescription(text).setColor("Orange");
            return interaction.reply({ embeds:[embed] });

        case "shop":
            embed = new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`,value:`${shop[i].price} coins`,inline:true})));
            return interaction.reply({ embeds:[embed] });

        case "gamble": {
            const amount = interaction.options.getInteger("amount");
            if(!amount || amount<=0) return interaction.reply("❌ Invalid amount");
            if(user.money<amount) return interaction.reply("❌ Not enough coins");

            let embed = new EmbedBuilder()
                .setTitle("🎰 Casino")
                .setDescription(`${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin}`)
                .setColor("Yellow");

            await interaction.reply({ embeds:[embed] });
            const spinMessage = await interaction.fetchReply();

            const result = [BOT_EMOJIS.spin, BOT_EMOJIS.spin, BOT_EMOJIS.spin];

            for(let i=0;i<3;i++){
                for(let j=0;j<5;j++){
                    result[i] = SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)];
                    embed.setDescription(result.join(" "));
                    await spinMessage.edit({ embeds:[embed] });
                    await new Promise(r=>setTimeout(r,300));
                    result[i] = BOT_EMOJIS.spin;
                }
                // Final emoji for slot
                result[i] = SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)];
                embed.setDescription(result.join(" "));
                await spinMessage.edit({ embeds:[embed] });
                await new Promise(r=>setTimeout(r,500));
            }

            let win=false,winnings=0;
            if(result[0]===result[1] && result[1]===result[2]){ win=true; winnings=amount*2; user.money+=winnings; } else { user.money-=amount; }
            save();

            embed.setDescription(result.join(" "));
            embed.setColor(win?"Green":"Red");
            embed.setFooter({ text: win?`🎉 YOU WON ${winnings} coins!`:`💀 You lost ${amount} coins!` });
            await spinMessage.edit({ embeds:[embed] });
        }
    }
});

client.once("ready", ()=>console.log("Bot online"));
client.login(TOKEN);
