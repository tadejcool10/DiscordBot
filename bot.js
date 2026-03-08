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

// ---------- ECONOMY DATA ----------
let data = {}; // persistent in-memory
const shop = {
    lick: { price: 10000, name: "Lick", emoji: "👅" },
    vip: { price: 2000, name: "VIP Role", emoji: "💎" },
    lucky: { price: 1000, name: "Lucky Charm", emoji: "🍀" },
    cookie: { price: 100, name: "Cookie", emoji: "🍪" }
};

function save() {
    fs.writeFileSync("money.json", JSON.stringify(data, null, 2));
}

function getUser(id) {
    if (!data[id]) {
        data[id] = { money: 0, lastDaily: 0, lastWork: 0, inventory: [] };
    }
    return data[id];
}

// ---------- SLASH COMMANDS ----------
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
        .addStringOption(o =>
            o.setName("item")
             .setDescription("Item name")
             .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName("gamble")
        .setDescription("Gamble your coins")
        .addIntegerOption(o =>
            o.setName("amount")
             .setDescription("Coins to gamble")
             .setRequired(true)
        )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
    console.log("Commands loaded");
})();

// ---------- SLOT MACHINE DATA ----------
const BOT_EMOJIS = {
    spin: "<a:spin:1480248762789138656>",
    cherry: "<:cherry:1480249175303131246>",
    eggplant: "<:eggplant:1480249069614923937>",
    heart: "<:heart:1480248711308247163>"
};
const SLOT_EMOJIS = [BOT_EMOJIS.cherry, BOT_EMOJIS.eggplant, BOT_EMOJIS.heart];

// ---------- GAMBLE SLOT FUNCTION ----------
async function gambleSlot(channel, user, amount) {
    let result = ["❔","❔","❔"];

    // Initial embed with spin emojis
    const spinRow = `${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin}`;
    const spinMessage = await channel.send({ embeds: [new EmbedBuilder().setTitle("🎰 Casino").setDescription(spinRow)] });

    // Sequential animation
    for (let i = 0; i < 3; i++) {
        for (let cycle = 0; cycle < 10; cycle++) {
            result[i] = SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
            await spinMessage.edit({ embeds: [new EmbedBuilder()
                .setTitle("🎰 Casino")
                .setDescription(`${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin}\n${result.join(" ")}`)] });
            await new Promise(r => setTimeout(r, 100));
        }
    }

    // Win/Loss calculation
    let win = (result[0] === result[1] && result[1] === result[2]);
    if (win) user.money += amount * 2; else user.money -= amount;
    save();

    // Final embed
    await spinMessage.edit({ embeds: [new EmbedBuilder()
        .setTitle("🎰 Casino")
        .setDescription(`${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin} ${BOT_EMOJIS.spin}\n${result.join(" ")}`)
        .setColor(win ? "Green" : "Red")
        .setFooter({ text: win ? `🎉 WON! +${amount*2} coins` : `💀 Lost -${amount} coins` })
    ]});
}

// ---------- MESSAGE COMMANDS ----------
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const msg = message.content.toLowerCase();
    if (!msg.startsWith("goodmc ")) return;
    const args = msg.slice(7).trim();
    const user = getUser(message.author.id);

    if (args === "balance") {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("💰 Balance").setDescription(`You have **${user.money} coins**`).setColor("Green")] });
    }

    if (args === "daily") {
        const now = Date.now();
        if (now - user.lastDaily < 86400000) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("⏳ Daily").setDescription("You already claimed daily!").setColor("Red")] });
        const reward = 500; user.money += reward; user.lastDaily = now; save();
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("💰 Daily").setDescription(`You received **${reward} coins**!`).setColor("Gold")] });
    }

    if (args === "work") {
        const now = Date.now();
        if (now - user.lastWork < 3600000) {
            const remaining = 3600000 - (now - user.lastWork);
            const m = Math.floor(remaining / 60000), s = Math.floor((remaining % 60000)/1000);
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle("⏳ Work").setDescription(`Wait **${m}m ${s}s**`).setColor("Red")] });
        }
        const amount = 50; user.money += amount; user.lastWork = now; save();
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🎉 Work").setDescription(`You earned **${amount} coins**`).setColor("Green")] });
    }

    if (args === "shop") {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`,value:`${shop[i].price} coins`,inline:true}))) ] });
    }

    if (args === "leaderboard") {
        const sorted = Object.entries(data).sort((a,b)=>b[1].money - a[1].money).slice(0,10);
        let text=""; sorted.forEach((u,i)=>text+=`${i+1}. <@${u[0]}> — ${u[1].money} coins\n`);
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🏆 Leaderboard").setDescription(text || "No data yet").setColor("Blue")] });
    }

    if (args.startsWith("buy ")) {
        const itemName = args.slice(4).trim();
        if (!shop[itemName]) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("❌ Purchase Failed").setDescription("Item doesn't exist").setColor("Red")] });
        if (user.money < shop[itemName].price) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("❌ Purchase Failed").setDescription("Not enough coins").setColor("Red")] });
        user.money -= shop[itemName].price; user.inventory.push(itemName); save();
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🛒 Purchased").setDescription(`You bought **${shop[itemName].name}**`).setColor("Green")] });
    }

    if (args === "inventory") {
        if (!user.inventory.length) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty").setColor("Grey")] });
        const counts={}; user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);
        let text=""; Object.keys(counts).forEach(i=>text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`);
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`🎒 ${message.author.username}'s Inventory`).setDescription(text).setColor("Orange")] });
    }

    if (args.startsWith("gamble ")) {
        const amount = parseInt(args.split(" ")[1]);
        if (!amount || amount <= 0) return message.channel.send("❌ Invalid amount");
        if (user.money < amount) return message.channel.send("❌ Not enough coins");
        await gambleSlot(message.channel, user, amount);
    }
});

// ---------- SLASH COMMAND HANDLER ----------
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const user = getUser(interaction.user.id);
    const now = Date.now();
    let embed;

    switch(interaction.commandName){
        case "balance":
            embed = new EmbedBuilder().setTitle("💰 Balance").setDescription(`You have **${user.money} coins**`).setColor("Green");
            return interaction.reply({ embeds: [embed] });

        case "inventory":
            if (!user.inventory.length) { embed = new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty").setColor("Grey"); return interaction.reply({embeds:[embed]}); }
            const counts={}; user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);
            let text=""; Object.keys(counts).forEach(i=>text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`);
            embed=new EmbedBuilder().setTitle(`🎒 ${interaction.user.username}'s Inventory`).setDescription(text).setColor("Orange");
            return interaction.reply({ embeds:[embed] });

        case "shop":
            embed=new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`,value:`${shop[i].price} coins`,inline:true})));
            return interaction.reply({embeds:[embed]});

        case "gamble":
            const amount = interaction.options.getInteger("amount");
            if (!amount || amount <= 0) return interaction.reply("❌ Invalid amount");
            if (user.money < amount) return interaction.reply("❌ Not enough coins");
            await interaction.reply("Spinning the slots...");
            await gambleSlot(interaction.channel, user, amount);
            break;
    }
});

client.once("ready", () => console.log("Bot online"));
client.login(TOKEN);
