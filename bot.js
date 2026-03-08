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
        )
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

/* MESSAGE COMMANDS */

client.on("messageCreate", async message => {

    if (message.author.bot) return;

    const msg = message.content.toLowerCase();
    if (!msg.startsWith("goodmc ")) return;

    const args = msg.slice(7).trim();
    const user = getUser(message.author.id);

    if (args === "balance") {

        const embed = new EmbedBuilder()
            .setTitle("💰 Balance")
            .setDescription(`You have **${user.money} coins**`)
            .setColor("Green");

        return message.channel.send({ embeds: [embed] });
    }

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
            .setTimestamp();

        return message.channel.send({ embeds: [embed] });
    }

    if (args === "work") {

        const now = Date.now();
        const cooldown = 3600000;

        if (now - user.lastWork < cooldown) {

            const remaining = cooldown - (now - user.lastWork);

            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);

            const embed = new EmbedBuilder()
                .setTitle("⏳ Work")
                .setDescription(`Wait **${minutes}m ${seconds}s** before working again.`)
                .setColor("Red");

            return message.channel.send({ embeds: [embed] });
        }

        const amount = 50;

        user.money += amount;
        user.lastWork = now;
        save();

        const embed = new EmbedBuilder()
            .setTitle("🎉 Work Reward")
            .setDescription(`You earned **${amount} coins**`)
            .setColor("Green");

        return message.channel.send({ embeds: [embed] });
    }

    if (args === "shop") {

        const embed = new EmbedBuilder()
            .setTitle("🛒 Shop")
            .setColor("Purple")
            .addFields(
                Object.keys(shop).map(item => ({
                    name: `${shop[item].emoji} ${shop[item].name}`,
                    value: `${shop[item].price} coins`,
                    inline: true
                }))
            );

        return message.channel.send({ embeds: [embed] });
    }

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
            .setColor("Blue");

        return message.channel.send({ embeds: [embed] });
    }

    if (args.startsWith("buy ")) {

        const itemName = args.slice(4).trim();

        if (!shop[itemName]) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("❌ Purchase Failed")
                    .setDescription("Item doesn't exist.")
                    .setColor("Red")]
            });
        }

        if (user.money < shop[itemName].price) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("❌ Purchase Failed")
                    .setDescription("Not enough coins.")
                    .setColor("Red")]
            });
        }

        user.money -= shop[itemName].price;
        user.inventory.push(itemName);

        save();

        return message.channel.send({
            embeds: [new EmbedBuilder()
                .setTitle("🛒 Purchase Successful")
                .setDescription(`You bought **${shop[itemName].name}**`)
                .setColor("Green")]
        });
    }

    if (args === "inventory") {

        if (user.inventory.length === 0) {

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("🎒 Inventory")
                    .setDescription("Your inventory is empty.")
                    .setColor("Grey")]
            });
        }

        const items = {};

        user.inventory.forEach(i => {
            items[i] = (items[i] || 0) + 1;
        });

        let text = "";

        Object.keys(items).forEach(i => {
            text += `${shop[i].emoji} **${shop[i].name}** x${items[i]}\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`🎒 ${message.author.username}'s Inventory`)
            .setDescription(text)
            .setColor("Orange");

        return message.channel.send({ embeds: [embed] });
    }

    if (args.startsWith("gamble ")) {

    const amount = parseInt(args.split(" ")[1]);
    const user = getUser(message.author.id);

    if (!amount || amount <= 0) {
        return message.channel.send("❌ Invalid amount.");
    }

    if (user.money < amount) {
        return message.channel.send("❌ You don't have enough coins.");
    }

    // send spinning animation
    const spinMessage = await message.channel.send({
        content: "🎰 Spinning...",
        files: [{
            attachment: "https://preview.redd.it/cbn9ix3lkung1.gif?width=64&format=mp4&s=6c0cfab5dee5bc515457490716025da8dacaff0f",
            name: "spin.mp4"
        }]
    });

    // wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    const win = Math.random() < 0.45;

    let resultText;

    if (win) {

        const winnings = amount * 2;
        user.money += winnings;

        resultText = `🎉 **YOU WON!**\nYou gained **${winnings} coins**`;

    } else {

        user.money -= amount;

        resultText = `💀 **You lost!**\nLost **${amount} coins**`;

    }

    save();

    const embed = new EmbedBuilder()
        .setTitle("🎰 Casino")
        .setDescription(resultText)
        .setColor(win ? "Green" : "Red");

    spinMessage.edit({
        content: "",
        embeds: [embed],
        files: []
    });
}

});

/* SLASH COMMAND HANDLER */

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

        case "inventory":

            if (user.inventory.length === 0) {

                embed = new EmbedBuilder()
                    .setTitle("🎒 Inventory")
                    .setDescription("Your inventory is empty.")
                    .setColor("Grey");

                return interaction.reply({ embeds: [embed] });
            }

            const items = {};

            user.inventory.forEach(i => {
                items[i] = (items[i] || 0) + 1;
            });

            let text = "";

            Object.keys(items).forEach(i => {
                text += `${shop[i].emoji} **${shop[i].name}** x${items[i]}\n`;
            });

            embed = new EmbedBuilder()
                .setTitle(`🎒 ${interaction.user.username}'s Inventory`)
                .setDescription(text)
                .setColor("Orange");

            return interaction.reply({ embeds: [embed] });

        case "shop":

            embed = new EmbedBuilder()
                .setTitle("🛒 Shop")
                .setColor("Purple")
                .addFields(
                    Object.keys(shop).map(item => ({
                        name: `${shop[item].emoji} ${shop[item].name}`,
                        value: `${shop[item].price} coins`,
                        inline: true
                    }))
                );

            return interaction.reply({ embeds: [embed] });

    }

    case "gamble": {

    const amount = interaction.options.getInteger("amount");

    if (amount <= 0) {
        return interaction.reply("❌ Invalid amount.");
    }

    if (user.money < amount) {
        return interaction.reply("❌ You don't have enough coins.");
    }

    // Send spinning animation
    await interaction.reply({
        content: "🎰 Spinning...",
        files: [{
            attachment: "https://preview.redd.it/cbn9ix3lkung1.gif?width=64&format=mp4&s=6c0cfab5dee5bc515457490716025da8dacaff0f",
            name: "spin.mp4"
        }]
    });

    // wait 2 seconds
    await new Promise(r => setTimeout(r, 2000));

    const win = Math.random() < 0.45;

    let resultText;

    if (win) {

        const winnings = amount * 2;
        user.money += winnings;

        resultText = `🎉 **YOU WON!**\nYou gained **${winnings} coins**`;

    } else {

        user.money -= amount;

        resultText = `💀 **You lost!**\nLost **${amount} coins**`;

    }

    save();

    const embed = new EmbedBuilder()
        .setTitle("🎰 Casino")
        .setDescription(resultText)
        .setColor(win ? "Green" : "Red");

    return interaction.editReply({
        content: "",
        embeds: [embed],
        files: []
    });
}

});

client.once("ready", () => console.log("Bot online"));

client.login(TOKEN);
