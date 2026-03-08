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

client.on("interactionCreate", async interaction => {

if (!interaction.isChatInputCommand()) return;

const user = getUser(interaction.user.id);

if (interaction.commandName === "balance") {
interaction.reply(`💰 Balance: **${user.money} coins**`);
}

if (interaction.commandName === "daily") {

const now = Date.now();
const cooldown = 86400000;

if (now - user.lastDaily < cooldown) {
return interaction.reply("⏳ You already claimed your daily.");
}

const reward = 500;

user.money += reward;
user.lastDaily = now;
save();

interaction.reply(`💰 You got **${reward} coins**!`);
}

if (interaction.commandName === "work") {

const amount = 50;

user.money += amount;
interaction.reply(`🎉 You got **${amount} coins**`);

save();
}

if (interaction.commandName === "leaderboard") {

const sorted = Object.entries(data)
.sort((a,b)=>b[1].money-a[1].money)
.slice(0,10);

let text = "🏆 **Leaderboard**\n";

sorted.forEach((u,i)=>{
text += `${i+1}. <@${u[0]}> — ${u[1].money} coins\n`;
});

interaction.reply(text);
}

if (interaction.commandName === "shop") {

let text = "🛒 **Shop**\n";

for (let item in shop) {
text += `**${item}** — ${shop[item].price} coins\n`;
}

interaction.reply(text);
}

if (interaction.commandName === "buy") {

const item = interaction.options.getString("item").toLowerCase();

if (!shop[item]) {
return interaction.reply("❌ Item doesn't exist.");
}

if (user.money < shop[item].price) {
return interaction.reply("❌ Not enough coins.");
}

user.money -= shop[item].price;
user.inventory.push(item);

save();

interaction.reply(`🛒 You bought **${shop[item].name}**`);
}

});

client.once("ready", ()=>{
console.log("Bot online");
});

client.login(TOKEN);
