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
            return message.channel.send("⏳ You already claimed your daily reward.");
        }

        const reward = 500;

        user.money += reward;
        user.lastDaily = now;
        save();

        return message.channel.send(`💰 You received **${reward} coins**!`);
    }

    if (args === "work") {

        const now = Date.now();
        const cooldown = 3600000;

        if (now - user.lastWork < cooldown) {
            return message.channel.send("⏳ You need to wait before working again.");
        }

        const amount = 50;

        user.money += amount;
        user.lastWork = now;
        save();

        return message.channel.send(`💼 You earned **${amount} coins**`);
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

    if (args === "inventory") {

        if (user.inventory.length === 0) {
            return message.channel.send("🎒 Your inventory is empty.");
        }

        const items = {};

        user.inventory.forEach(i => {
            items[i] = (items[i] || 0) + 1;
        });

        let text = "";

        Object.keys(items).forEach(i => {
            text += `${shop[i].emoji} ${shop[i].name} x${items[i]}\n`;
        });

        return message.channel.send(`🎒 **Inventory**\n${text}`);
    }

    if (args.startsWith("buy ")) {

        const itemName = args.slice(4).trim();

        if (!shop[itemName]) return message.channel.send("❌ Item doesn't exist.");

        if (user.money < shop[itemName].price) {
            return message.channel.send("❌ Not enough coins.");
        }

        user.money -= shop[itemName].price;
        user.inventory.push(itemName);

        save();

        return message.channel.send(`🛒 You bought **${shop[itemName].name}**`);
    }

    if (args.startsWith("gamble ")) {

        const amount = parseInt(args.split(" ")[1]);

        if (!amount || amount <= 0) return message.channel.send("❌ Invalid amount.");

        if (user.money < amount) return message.channel.send("❌ You don't have enough coins.");

        const spinMessage = await message.channel.send({
            content: "🎰 Spinning...",
            files: [{
                attachment: "https://preview.redd.it/cbn9ix3lkung1.gif?width=64&format=mp4&s=6c0cfab5dee5bc515457490716025da8dacaff0f",
                name: "spin.mp4"
            }]
        });

        await new Promise(r => setTimeout(r, 2000));

        const win = Math.random() < 0.45;

        if (win) {
            const winnings = amount * 2;
            user.money += winnings;
            await spinMessage.edit(`🎉 YOU WON **${winnings} coins**`);
        } else {
            user.money -= amount;
            await spinMessage.edit(`💀 You lost **${amount} coins**`);
        }

        save();
    }

});

/* SLASH COMMAND HANDLER */

client.on("interactionCreate", async interaction => {

    if (!interaction.isChatInputCommand()) return;

    const user = getUser(interaction.user.id);

    if (interaction.commandName === "balance") {
        return interaction.reply(`💰 You have **${user.money} coins**`);
    }

    if (interaction.commandName === "shop") {
        let text = "";
        Object.keys(shop).forEach(i => {
            text += `${shop[i].emoji} ${shop[i].name} — ${shop[i].price} coins\n`;
        });
        return interaction.reply(`🛒 **Shop**\n${text}`);
    }

    if (interaction.commandName === "inventory") {

        if (user.inventory.length === 0) {
            return interaction.reply("🎒 Your inventory is empty.");
        }

        const items = {};
        user.inventory.forEach(i => items[i] = (items[i] || 0) + 1);

        let text = "";
        Object.keys(items).forEach(i => {
            text += `${shop[i].emoji} ${shop[i].name} x${items[i]}\n`;
        });

        return interaction.reply(`🎒 **Inventory**\n${text}`);
    }

    if (interaction.commandName === "gamble") {

        const amount = interaction.options.getInteger("amount");

        if (user.money < amount) return interaction.reply("❌ Not enough coins.");

        await interaction.reply({
            content: "🎰 Spinning...",
            files: [{
                attachment: "https://preview.redd.it/cbn9ix3lkung1.gif?width=64&format=mp4&s=6c0cfab5dee5bc515457490716025da8dacaff0f",
                name: "spin.mp4"
            }]
        });

        await new Promise(r => setTimeout(r, 2000));

        const win = Math.random() < 0.45;

        if (win) {
            const winnings = amount * 2;
            user.money += winnings;
            save();
            return interaction.editReply(`🎉 YOU WON **${winnings} coins**`);
        } else {
            user.money -= amount;
            save();
            return interaction.editReply(`💀 You lost **${amount} coins**`);
        }
    }

});

client.once("ready", () => console.log("Bot online"));

client.login(TOKEN);
