const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = "1480186439890239498";
const GUILD_ID = "1450556913300279393";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let data = {};
const shop = {
    vip: { price: 2000, name: "VIP Role" },
    lucky: { price: 1000, name: "Lucky Charm" },
    cookie: { price: 100, name: "Cookie" }
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

const commands = [

new SlashCommandBuilder()
.setName("daily")
.setDescription("Claim daily reward"),

new SlashCommandBuilder()
.setName("work")
.setDescription("Work to get money"),

new SlashCommandBuilder()
.setName("balance")
.setDescription("Check your balance"),

new SlashCommandBuilder()
.setName("leaderboard")
.setDescription("Richest players"),

new SlashCommandBuilder()
.setName("shop")
.setDescription("View the shop"),

new SlashCommandBuilder()
.setName("buy")
.setDescription("Buy an item")
.addStringOption(o =>
    o.setName("item")
    .setDescription("Item name")
    .setRequired(true))

].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
{ body: commands }
);
console.log("Commands loaded");
})();

const { EmbedBuilder } = require('discord.js');

client.on("messageCreate", async message => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Convert message content to lowercase for easier checking
    const msg = message.content.toLowerCase();

    // Check if it starts with "goodmc " and a command
    if (!msg.startsWith("goodmc ")) return;

    const args = msg.slice(7).trim(); // remove "goodmc " part
    const user = getUser(message.author.id);

    if (args === "balance") {
        const embed = new EmbedBuilder()
            .setTitle("💰 Balance")
            .setDescription(`You have **${user.money} coins**`)
            .setColor("Green");

        message.channel.send({ embeds: [embed] });
    }

    if (args === "daily") {
        const now = Date.now();
        const cooldown = 86400000; // 24 hours

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
            .setColor("Gold");

        message.channel.send({ embeds: [embed] });
    }

    if (args === "work") {
        const now = Date.now();
        const cooldown = 60 * 60 * 1000; // 1 hour

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
            .setColor("Green");

        message.channel.send({ embeds: [embed] });
    }
});

client.once("ready", ()=>{
console.log("Bot online");
});

client.login(TOKEN);
