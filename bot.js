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

let data = {};

const shop = {
    lick: { price: 10000, name: "Lick", emoji: "👅" },
    vip: { price: 2000, name: "VIP Role", emoji: "💎" },
    lucky: { price: 1000, name: "Lucky Charm", emoji: "🍀" },
    cookie: { price: 100, name: "Cookie", emoji: "🍪" }
};

if (fs.existsSync("money.json")) {
    data = JSON.parse(fs.readFileSync("money.json"));
}

function save() {
    fs.writeFileSync("money.json", JSON.stringify(data, null, 2));
}

function getUser(id) {
    if (!data[id]) {
        data[id] = {
            money: 0,
            lastDaily: 0,
            lastWork: 0,
            inventory: []
        };
    }
    return data[id];
}

/* SLASH COMMANDS */
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

/* SLOT MACHINE SETTINGS */
const spinEmoji = "<a:spin:1480244053198115049>";
const slotEmojis = ["🍒","🍋","🍊","🍇","💎","🍀"];

/* MESSAGE COMMANDS */
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const msg = message.content.toLowerCase();
    if (!msg.startsWith("goodmc ")) return;
    const args = msg.slice(7).trim();
    const user = getUser(message.author.id);

    /* BASIC ECONOMY COMMANDS */
    if (args === "balance") {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("💰 Balance").setDescription(`You have **${user.money} coins**`).setColor("Green")] });
    }

    if (args === "daily") {
        const now = Date.now();
        if (now - user.lastDaily < 86400000) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("⏳ Daily").setDescription("You already claimed daily!").setColor("Red")] });
        const reward = 500;
        user.money += reward; user.lastDaily = now; save();
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("💰 Daily").setDescription(`You received **${reward} coins**!`).setColor("Gold")] });
    }

    if (args === "work") {
        const now = Date.now();
        if (now - user.lastWork < 3600000) {
            const remaining = 3600000 - (now - user.lastWork);
            const m = Math.floor(remaining / 60000), s = Math.floor((remaining % 60000)/1000);
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle("⏳ Work").setDescription(`Wait **${m}m ${s}s**`).setColor("Red")] });
        }
        const amount = 50;
        user.money += amount; user.lastWork = now; save();
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🎉 Work").setDescription(`You earned **${amount} coins**`).setColor("Green")] });
    }

    if (args === "shop") {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`,value:`${shop[i].price} coins`,inline:true})))] });
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

    /* GAMBLE COMMAND (Message Version) */
    if (args.startsWith("gamble ")) {
        const amount = parseInt(args.split(" ")[1]);
        if (!amount || amount <= 0) return message.channel.send("❌ Invalid amount");
        if (user.money < amount) return message.channel.send("❌ Not enough coins");

        let display = [spinEmoji, spinEmoji, spinEmoji];
        const spinMessage = await message.channel.send(`🎰 ${display.join(" ")}`);

        const finalResult = [
            slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
            slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
            slotEmojis[Math.floor(Math.random() * slotEmojis.length)]
        ];

        // Reveal one by one
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j <= i; j++) display[j] = finalResult[j];
            await spinMessage.edit(`🎰 ${display.join(" ")}`);
            await new Promise(r => setTimeout(r, 800));
        }

        let win = false, winnings = 0;
        if (finalResult[0] === finalResult[1] && finalResult[1] === finalResult[2]) {
            win = true;
            winnings = amount * 2;
            user.money += winnings;
        } else {
            user.money -= amount;
        }
        save();

        const embed = new EmbedBuilder()
            .setTitle("🎰 Casino")
            .setDescription(win ? `🎉 **YOU WON!** +${winnings} coins` : `💀 **You lost!** -${amount} coins`)
            .setColor(win ? "Green" : "Red");

        await spinMessage.edit({ content: `🎰 ${display.join(" ")}`, embeds: [embed] });
    }
});

/* SLASH COMMANDS HANDLER */
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const user = getUser(interaction.user.id);
    let embed;

    switch (interaction.commandName) {
        case "balance":
            embed = new EmbedBuilder().setTitle("💰 Balance").setDescription(`You have **${user.money} coins**`).setColor("Green");
            return interaction.reply({ embeds: [embed] });

        case "inventory":
            if (!user.inventory.length) {
                embed = new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty").setColor("Grey");
                return interaction.reply({ embeds: [embed] });
            }
            const counts={}; user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);
            let text=""; Object.keys(counts).forEach(i=>text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`);
            embed = new EmbedBuilder().setTitle(`🎒 ${interaction.user.username}'s Inventory`).setDescription(text).setColor("Orange");
            return interaction.reply({ embeds: [embed] });

        case "shop":
            embed = new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`,value:`${shop[i].price} coins`,inline:true})));
            return interaction.reply({ embeds: [embed] });

        case "gamble": {
            const amount = interaction.options.getInteger("amount");
            if (!amount || amount <= 0) return interaction.reply("❌ Invalid amount");
            if (user.money < amount) return interaction.reply("❌ Not enough coins");

            let display = [spinEmoji, spinEmoji, spinEmoji];
            await interaction.reply(`🎰 ${display.join(" ")}`);
            const msg = await interaction.fetchReply();

            const finalResult = [
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)],
                slotEmojis[Math.floor(Math.random() * slotEmojis.length)]
            ];

            // Reveal one by one
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j <= i; j++) display[j] = finalResult[j];
                await msg.edit(`🎰 ${display.join(" ")}`);
                await new Promise(r => setTimeout(r, 800));
            }

            let win = false, winnings = 0;
            if (finalResult[0] === finalResult[1] && finalResult[1] === finalResult[2]) {
                win = true;
                winnings = amount * 2;
                user.money += winnings;
            } else {
                user.money -= amount;
            }
            save();

            embed = new EmbedBuilder()
                .setTitle("🎰 Casino")
                .setDescription(win ? `🎉 **YOU WON!** +${winnings} coins` : `💀 **You lost!** -${amount} coins`)
                .setColor(win ? "Green" : "Red");

            return msg.edit({ content: `🎰 ${display.join(" ")}`, embeds: [embed] });
        }
    }
});

client.once("ready", () => console.log("Bot online"));
client.login(TOKEN);
