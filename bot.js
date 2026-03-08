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

// Load money data
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

// Slash commands
const commands = [
    new SlashCommandBuilder().setName("daily").setDescription("Claim daily reward"),
    new SlashCommandBuilder().setName("work").setDescription("Work to get money"),
    new SlashCommandBuilder().setName("balance").setDescription("Check your balance"),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Richest players"),
    new SlashCommandBuilder().setName("shop").setDescription("View the shop"),
    new SlashCommandBuilder()
        .setName("buy")
        .setDescription("Buy an item")
        .addStringOption(o =>
            o.setName("item")
             .setDescription("Item name")
             .setRequired(true)
        )
].map(c => c.toJSON());

// Register slash commands
const rest = new REST({ version: "10" }).setToken(TOKEN);
(async () => {
    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );
    console.log("Commands loaded");
})();

// ====== MESSAGE COMMAND HANDLER ======
client.on("messageCreate", async message => {
    if (message.author.bot) return;

    const msg = message.content.toLowerCase();
    if (!msg.startsWith("goodmc ")) return;

    const args = msg.slice(7).trim();
    const user = getUser(message.author.id);

    // BALANCE
    if (args === "balance") {
        const embed = new EmbedBuilder()
            .setTitle("💰 Balance")
            .setDescription(`You have **${user.money} coins**`)
            .setColor("Green");
        return message.channel.send({ embeds: [embed] });
    }

    // DAILY
    if (args === "daily") {
        const now = Date.now();
        const cooldown = 86400000;

        if (now - user.lastDaily < cooldown) {
            const embed = new EmbedBuilder()
                .setTitle("⏳ Daily Reward")
                .setDescription("You already claimed your daily reward!")
                .setColor("Red");
            return message.channel.send({ embeds: [embed] });
        }

        const reward = 500;
        user.money += reward;
        user.lastDaily = now;
        save();

        const embed = new EmbedBuilder()
            .setTitle("💰 Daily Reward")
            .setDescription(`You received **${reward} coins**!`)
            .setColor("Gold")
            .setFooter({ text: "GoodMC Bot • Daily reward" })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // WORK
    if (args === "work") {
        const now = Date.now();
        const cooldown = 60 * 60 * 1000;

        if (user.lastWork && now - user.lastWork < cooldown) {
            const remaining = cooldown - (now - user.lastWork);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            const embed = new EmbedBuilder()
                .setTitle("⏳ Work")
                .setDescription(`You need to wait **${minutes}m ${seconds}s** before working again.`)
                .setColor("Red");
            return message.channel.send({ embeds: [embed] });
        }

        const amount = 50;
        user.money += amount;
        user.lastWork = now;
        save();

        const embed = new EmbedBuilder()
            .setTitle("🎉 Work Reward")
            .setDescription(`You earned **${amount} coins**!`)
            .setColor("Green")
            .setFooter({ text: "GoodMC Bot • Work reward" })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // SHOP
    if (args === "shop") {
        const embed = new EmbedBuilder()
            .setTitle("🛒 Shop")
            .setColor("Purple")
            .setDescription("Purchase items using GoodMC coins!")
            .setThumbnail("https://i.imgur.com/NBQLyWt.png") // Example thumbnail
            .addFields(
                Object.keys(shop).map(item => ({
                    name: `${shop[item].emoji} ${shop[item].name}`,
                    value: `Price: ${shop[item].price} coins`,
                    inline: true
                }))
            )
            .setFooter({ text: "Type GoodMC buy <item> to purchase!" });
        return message.channel.send({ embeds: [embed] });
    }

    // LEADERBOARD
    if (args === "leaderboard") {
        const sorted = Object.entries(data)
            .sort((a, b) => b[1].money - a[1].money)
            .slice(0, 10);

        let text = "";
        sorted.forEach((u, i) => {
            text += `${i + 1}. <@${u[0]}> — ${u[1].money} coins\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle("🏆 Leaderboard")
            .setDescription(text || "No data yet.")
            .setColor("Blue")
            .setFooter({ text: "GoodMC Bot • Top players" })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // BUY
    if (args.startsWith("buy ")) {
        const itemName = args.slice(4).trim().toLowerCase();
        if (!shop[itemName]) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Purchase Failed")
                .setDescription("Item doesn't exist.")
                .setColor("Red");
            return message.channel.send({ embeds: [embed] });
        }

        if (user.money < shop[itemName].price) {
            const embed = new EmbedBuilder()
                .setTitle("❌ Purchase Failed")
                .setDescription("Not enough coins.")
                .setColor("Red");
            return message.channel.send({ embeds: [embed] });
        }

        user.money -= shop[itemName].price;
        user.inventory.push(itemName);
        save();

        const embed = new EmbedBuilder()
            .setTitle("🛒 Purchase Successful")
            .setDescription(`You bought **${shop[itemName].name}** ${shop[itemName].emoji}`)
            .setColor("Green")
            .setFooter({ text: "GoodMC Bot • Enjoy your item!" })
            .setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }
});

// ====== SLASH COMMAND HANDLER ======
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const user = getUser(interaction.user.id);

    const now = Date.now();
    let embed;

    switch (interaction.commandName) {
        case "balance":
            embed = new EmbedBuilder()
                .setTitle("💰 Balance")
                .setDescription(`You have **${user.money} coins**`)
                .setColor("Green");
            return interaction.reply({ embeds: [embed] });

        case "daily":
            const dailyCooldown = 86400000;
            if (now - user.lastDaily < dailyCooldown) {
                embed = new EmbedBuilder()
                    .setTitle("⏳ Daily Reward")
                    .setDescription("You already claimed your daily reward!")
                    .setColor("Red");
                return interaction.reply({ embeds: [embed] });
            }
            const dailyReward = 500;
            user.money += dailyReward;
            user.lastDaily = now;
            save();
            embed = new EmbedBuilder()
                .setTitle("💰 Daily Reward")
                .setDescription(`You received **${dailyReward} coins**!`)
                .setColor("Gold")
                .setFooter({ text: "GoodMC Bot • Daily reward" })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });

        case "work":
            const workCooldown = 60 * 60 * 1000;
            if (user.lastWork && now - user.lastWork < workCooldown) {
                const remaining = workCooldown - (now - user.lastWork);
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                embed = new EmbedBuilder()
                    .setTitle("⏳ Work")
                    .setDescription(`You need to wait **${minutes}m ${seconds}s** before working again.`)
                    .setColor("Red");
                return interaction.reply({ embeds: [embed] });
            }
            const workAmount = 50;
            user.money += workAmount;
            user.lastWork = now;
            save();
            embed = new EmbedBuilder()
                .setTitle("🎉 Work Reward")
                .setDescription(`You earned **${workAmount} coins**!`)
                .setColor("Green")
                .setFooter({ text: "GoodMC Bot • Work reward" })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });

        case "leaderboard":
            const sorted = Object.entries(data)
                .sort((a, b) => b[1].money - a[1].money)
                .slice(0, 10);
            let text = "";
            sorted.forEach((u, i) => text += `${i + 1}. <@${u[0]}> — ${u[1].money} coins\n`);
            embed = new EmbedBuilder()
                .setTitle("🏆 Leaderboard")
                .setDescription(text || "No data yet.")
                .setColor("Blue")
                .setFooter({ text: "GoodMC Bot • Top players" })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });

        case "shop":
            embed = new EmbedBuilder()
                .setTitle("🛒 Shop")
                .setColor("Purple")
                .setDescription("Purchase items using GoodMC coins!")
                .setThumbnail("https://i.imgur.com/NBQLyWt.png")
                .addFields(
                    Object.keys(shop).map(item => ({
                        name: `${shop[item].emoji} ${shop[item].name}`,
                        value: `Price: ${shop[item].price} coins`,
                        inline: true
                    }))
                )
                .setFooter({ text: "Use /buy <item> to purchase!" });
            return interaction.reply({ embeds: [embed] });

        case "buy":
            const itemName = interaction.options.getString("item").toLowerCase();
            if (!shop[itemName]) {
                embed = new EmbedBuilder()
                    .setTitle("❌ Purchase Failed")
                    .setDescription("Item doesn't exist.")
                    .setColor("Red");
                return interaction.reply({ embeds: [embed] });
            }
            if (user.money < shop[itemName].price) {
                embed = new EmbedBuilder()
                    .setTitle("❌ Purchase Failed")
                    .setDescription("Not enough coins.")
                    .setColor("Red");
                return interaction.reply({ embeds: [embed] });
            }
            user.money -= shop[itemName].price;
            user.inventory.push(itemName);
            save();
            embed = new EmbedBuilder()
                .setTitle("🛒 Purchase Successful")
                .setDescription(`You bought **${shop[itemName].name}** ${shop[itemName].emoji}`)
                .setColor("Green")
                .setFooter({ text: "GoodMC Bot • Enjoy your item!" })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
    }
});

client.once("ready", () => console.log("Bot online"));
client.login(TOKEN);
