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

/* SLOT EMOJIS */
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
new SlashCommandBuilder().setName("balance").setDescription("Check balance"),
new SlashCommandBuilder().setName("shop").setDescription("View shop"),
new SlashCommandBuilder().setName("inventory").setDescription("View inventory"),
new SlashCommandBuilder()
.setName("gamble")
.setDescription("Gamble coins")
.addIntegerOption(o=>o.setName("amount").setDescription("coins").setRequired(true))
].map(c=>c.toJSON());

const rest = new REST({version:"10"}).setToken(TOKEN);

(async()=>{
await rest.put(
Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID),
{body:commands}
);
console.log("Commands loaded");
})();

/* MESSAGE COMMANDS */

client.on("messageCreate", async message=>{

if(message.author.bot) return;

const msg = message.content.toLowerCase();

if(!msg.startsWith("goodmc ")) return;

const args = msg.slice(7).trim();

const user = getUser(message.author.id);

/* BALANCE */

if(args==="balance"){

return message.channel.send({
embeds:[new EmbedBuilder()
.setTitle("💰 Balance")
.setDescription(`You have **${user.money} coins**`)
.setColor("Green")]
});

}

/* SHOP */

if(args==="shop"){

return message.channel.send({
embeds:[
new EmbedBuilder()
.setTitle("🛒 Shop")
.setColor("Purple")
.addFields(Object.keys(shop).map(i=>({
name:`${shop[i].emoji} ${shop[i].name}`,
value:`${shop[i].price} coins`,
inline:true
})))
]});

}

/* INVENTORY */

if(args==="inventory"){

if(!user.inventory.length){

return message.channel.send({
embeds:[new EmbedBuilder()
.setTitle("🎒 Inventory")
.setDescription("Empty")
.setColor("Grey")]
});

}

const counts={};

user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);

let text="";

Object.keys(counts).forEach(i=>{
text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`;
});

return message.channel.send({
embeds:[
new EmbedBuilder()
.setTitle(`🎒 ${message.author.username}'s Inventory`)
.setDescription(text)
.setColor("Orange")
]});

}

/* GAMBLE */

if(args.startsWith("gamble ")){

const amount = parseInt(args.split(" ")[1]);

if(!amount || amount<=0) return message.channel.send("❌ Invalid amount");

if(user.money<amount) return message.channel.send("❌ Not enough coins");

let finalResult=["","",""];

const startDisplay =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${spinEmoji} ${spinEmoji} ${spinEmoji} ┃
╚══════════════════╝`;

const spinMsg = await message.channel.send({
embeds:[new EmbedBuilder().setDescription(startDisplay).setColor("Purple")]
});

/* SLOT ANIMATION */

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

/* RESULT */

let win = finalResult[0]===finalResult[1] && finalResult[1]===finalResult[2];

const winnings = win ? amount*2 : -amount;

user.money += winnings;

const resultDisplay =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult.join(" ")} ┃
╚══════════════════╝`;

await spinMsg.edit({
embeds:[
new EmbedBuilder()
.setDescription(`${resultDisplay}

${win ? `🎉 YOU WON **${winnings} coins**` : `💀 You lost **${amount} coins**`}`)
.setColor(win?"Green":"Red")
]});

}

});

/* SLASH COMMANDS */

client.on("interactionCreate", async interaction=>{

if(!interaction.isChatInputCommand()) return;

const user = getUser(interaction.user.id);

if(interaction.commandName==="balance"){

return interaction.reply({
embeds:[new EmbedBuilder()
.setTitle("💰 Balance")
.setDescription(`You have **${user.money} coins**`)
.setColor("Green")]
});

}

if(interaction.commandName==="shop"){

return interaction.reply({
embeds:[
new EmbedBuilder()
.setTitle("🛒 Shop")
.addFields(Object.keys(shop).map(i=>({
name:`${shop[i].emoji} ${shop[i].name}`,
value:`${shop[i].price} coins`,
inline:true
})))
.setColor("Purple")
]});

}

if(interaction.commandName==="inventory"){

if(!user.inventory.length){

return interaction.reply({
embeds:[new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty")]
});

}

const counts={};

user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);

let text="";

Object.keys(counts).forEach(i=>{
text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`;
});

return interaction.reply({
embeds:[new EmbedBuilder()
.setTitle("🎒 Inventory")
.setDescription(text)
.setColor("Orange")]
});

}

if(interaction.commandName==="gamble"){

const amount = interaction.options.getInteger("amount");

if(user.money<amount) return interaction.reply("❌ Not enough coins");

let finalResult=["","",""];

const startDisplay =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${spinEmoji} ${spinEmoji} ${spinEmoji} ┃
╚══════════════════╝`;

await interaction.reply({
embeds:[new EmbedBuilder().setDescription(startDisplay).setColor("Purple")]
});

const spinMsg = await interaction.fetchReply();

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

let win = finalResult[0]===finalResult[1] && finalResult[1]===finalResult[2];

const winnings = win ? amount*2 : -amount;

user.money += winnings;

const resultDisplay =
`╔ 🎰 GOODMC CASINO 🎰 ╗
┃ ${finalResult.join(" ")} ┃
╚══════════════════╝`;

await spinMsg.edit({
embeds:[
new EmbedBuilder()
.setDescription(`${resultDisplay}

${win ? `🎉 YOU WON **${winnings} coins**` : `💀 You lost **${amount} coins**`}`)
.setColor(win?"Green":"Red")
]});

}

});

client.once("ready",()=>console.log("Bot online"));

client.login(TOKEN);
