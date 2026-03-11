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

// In-memory economy data
let data = {};

// Shop items
const shop = {
    lick: { price: 10000, name: "Lick", emoji: "👅" },
    vip: { price: 2000, name: "VIP Role", emoji: "💎" },
    lucky: { price: 1000, name: "Lucky Charm", emoji: "🍀" },
    cookie: { price: 100, name: "Cookie", emoji: "🍪" }
};

// Get or create user
function getUser(id) {
    if (!data[id]) {
        data[id] = {
            money: 0,
            lastDaily: 0,
            lastWork: 0,
            inventory: [],
            luckyBoost: false
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

/* SLOT EMOJIS */
const slotEmojis = [
    "<:cherry:1480249175303131246>",
    "<:eggplant:1480249069614923937>",
    "<:heart:1480248711308247163>",
    "<:tounge:1480290929146335342>",
    "<:clover:1480290939913244906>",
    "<:gem:1480290950856311064>",
    "<:cookie:1480290977959903274>",
    "<:moneybag:1480291022817984582>"
];

finalResult[i] = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];

/* MESSAGE COMMANDS */
client.on("messageCreate", async message => {
    if (message.author.bot) return;
    const msg = message.content.toLowerCase();
    if (!msg.startsWith("goodmc ")) return;
    const args = msg.slice(7).trim();
    const user = getUser(message.author.id);

    /* BASIC ECONOMY */
    if (args === "balance") {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("💰 Balance").setDescription(`You have **${user.money} coins**`).setColor("Green")] });
    }

    if (args === "daily") {
        const now = Date.now();
        if (now - user.lastDaily < 86400000) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("⏳ Daily").setDescription("Already claimed daily!").setColor("Red")] });
        const reward = 500;
        user.money += reward; user.lastDaily = now;
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("💰 Daily").setDescription(`You received **${reward} coins**!`).setColor("Gold")] });
    }

    if (args === "work") {
        const now = Date.now();
        if (now - user.lastWork < 3600000) {
            const rem = 3600000 - (now - user.lastWork);
            const m = Math.floor(rem/60000), s = Math.floor((rem%60000)/1000);
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle("⏳ Work").setDescription(`Wait **${m}m ${s}s**`).setColor("Red")] });
        }
        const amount = 50;
        user.money += amount; user.lastWork = now;
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🎉 Work").setDescription(`You earned **${amount} coins**`).setColor("Green")] });
    }

    if (args === "shop") {
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`, value:`${shop[i].price} coins`, inline:true})))] });
    }

    if (args === "leaderboard") {
        const sorted = Object.entries(data).sort((a,b)=>b[1].money - a[1].money).slice(0,10);
        let text = "";
        sorted.forEach((u,i)=>text+=`${i+1}. <@${u[0]}> — ${u[1].money} coins\n`);
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🏆 Leaderboard").setDescription(text || "No data yet").setColor("Blue")] });
    }

    if (args.startsWith("buy ")) {
        const itemName = args.slice(4).trim();
        if (!shop[itemName]) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("❌ Purchase Failed").setDescription("Item doesn't exist").setColor("Red")] });
        if (user.money < shop[itemName].price) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("❌ Purchase Failed").setDescription("Not enough coins").setColor("Red")] });
        user.money -= shop[itemName].price; user.inventory.push(itemName);
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🛒 Purchased").setDescription(`You bought **${shop[itemName].name}**`).setColor("Green")] });
    }

    if (args === "inventory") {
        if (!user.inventory.length) return message.channel.send({ embeds: [new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty").setColor("Grey")] });
        const counts={}; user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);
        let text=""; Object.keys(counts).forEach(i=>text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`);
        return message.channel.send({ embeds: [new EmbedBuilder().setTitle(`🎒 ${message.author.username}'s Inventory`).setDescription(text).setColor("Orange")] });
    }

    /* GAMBLE COMMAND */
    if (args.startsWith("gamble ")) {
        const amount = parseInt(args.split(" ")[1]);
        if (!amount || amount <= 0) return message.channel.send("❌ Invalid amount");
        if (user.money < amount) return message.channel.send("❌ Not enough coins");

        // Initialize spins
        let finalResult = ["", "", ""];
        const spinEmbed = new EmbedBuilder()
            .setTitle("🎰 Casino")
            .setDescription(`# ${spinEmoji}  ${spinEmoji}  ${spinEmoji}`)
            .setColor("Purple");
        const spinMsg = await message.channel.send({ embeds: [spinEmbed] });

        // Animate each reel
        for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 1000)); // 1 sec per reel
            finalResult[i] = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];

            // Show updated embed
            const description = finalResult.map((e,j)=> e || spinEmoji).join(" ");
            const embed = new EmbedBuilder()
                .setTitle("🎰 Casino")
                .setDescription(`# description`)
                .setColor("Purple");
            await spinMsg.edit({ embeds: [embed] });
        }

        // Determine win/loss
        let win = finalResult[0] === finalResult[1] && finalResult[1] === finalResult[2];
        
        // Lucky charm gives a second chance
        if (!win && user.luckyBoost) {
            user.luckyBoost = false;
        
            if (Math.random() < 0.35) {
                win = true;
            }
        }

        let winnings = win ? amount * 2 : -amount;
        user.money += winnings;

        // Final result embed
        const finalEmbed = new EmbedBuilder()
            .setTitle("🎰 Casino Result")
            .setDescription(`${finalResult.join(" ")}\n\n${win ? `🎉 YOU WON! +${winnings} coins` : `💀 You lost! ${-winnings} coins`}`)
            .setColor(win ? "Green" : "Red");
        return spinMsg.edit({ embeds: [finalEmbed] });
    }

    if (args.startsWith("use ")) {

        const itemName = args.slice(4).trim();

        if (!shop[itemName]) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("❌ Use Failed")
                    .setDescription("Item doesn't exist")
                    .setColor("Red")]
            });
        }

        if (!user.inventory.includes(itemName)) {
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("❌ Use Failed")
                    .setDescription("You don't own this item")
                    .setColor("Red")]
            });
        }
    
        /* LUCKY CHARM */
        if (itemName === "lucky") {

            const index = user.inventory.indexOf("lucky");
            user.inventory.splice(index, 1);
            
            user.luckyBoost = true;
            
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("🍀 Lucky Charm Used")
                    .setDescription("Your **next gamble has a higher win chance!**")
                    .setColor("Green")]
            });

        }

        /* COOKIE */
        if (itemName === "cookie") {
            
            const index = user.inventory.indexOf("cookie");
            user.inventory.splice(index, 1);
            
            const reward = Math.floor(Math.random() * 201) + 50; // 50–250 coins
            user.money += reward;
            
            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("🍪 Cookie Eaten")
                    .setDescription(`You found **${reward} coins** inside the cookie!`)
                    .setColor("Gold")]
            });
            
        }

        /* LICK ITEM */
        if (itemName === "lick") {

           const mentionedUser = message.mentions.users.first();

            if (!mentionedUser) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle("❌ Lick Failed")
                        .setDescription("You must mention someone.\nExample: `goodmc use lick @user`")
                        .setColor("Red")]
                });
            }

            if (mentionedUser.id === message.author.id) {
                return message.channel.send("❌ You can't lick yourself.");
            }

            const target = getUser(mentionedUser.id);
        
            if (target.money < 50) {
                return message.channel.send({
                    embeds: [new EmbedBuilder()
                        .setTitle("👅 Lick Failed")
                        .setDescription(`${mentionedUser.username} doesn't have **50 coins**!\nYour lick item was **not used**.`)
                        .setColor("Red")]
                });
            }

            /* REMOVE LICK ITEM */
            const index = user.inventory.indexOf("lick");
            user.inventory.splice(index, 1);

            /* TRANSFER COINS */
            target.money -= 50;
            user.money += 50;

            return message.channel.send({
                embeds: [new EmbedBuilder()
                    .setTitle("👅 LICK ATTACK!")
                    .setDescription(`You licked **${mentionedUser.username}** and stole **50 coins**!`)
                    .setColor("Purple")]
            });
        
        }
        
    }
});

/* SLASH COMMAND HANDLER */
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
            if (!user.inventory.length) { embed = new EmbedBuilder().setTitle("🎒 Inventory").setDescription("Empty").setColor("Grey"); return interaction.reply({ embeds: [embed] }); }
            const counts = {}; user.inventory.forEach(i=>counts[i]=(counts[i]||0)+1);
            let text = ""; Object.keys(counts).forEach(i=>text+=`${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`);
            embed = new EmbedBuilder().setTitle(`🎒 ${interaction.user.username}'s Inventory`).setDescription(text).setColor("Orange");
            return interaction.reply({ embeds: [embed] });

        case "shop":
            embed = new EmbedBuilder().setTitle("🛒 Shop").setColor("Purple").addFields(Object.keys(shop).map(i=>({name:`${shop[i].emoji} ${shop[i].name}`, value:`${shop[i].price} coins`, inline:true})));
            return interaction.reply({ embeds: [embed] });

        case "gamble": {
            const amount = interaction.options.getInteger("amount");
            if (!amount || amount <= 0) return interaction.reply("❌ Invalid amount");
            if (user.money < amount) return interaction.reply("❌ Not enough coins");

            // Initialize spins
            let finalResult = ["", "", ""];
            const spinEmbed = new EmbedBuilder()
                .setTitle("🎰 Casino")
                .setDescription(`${spinEmoji} ${spinEmoji} ${spinEmoji}`)
                .setColor("Purple");
            await interaction.reply({ embeds: [spinEmbed] });
            const spinMsg = await interaction.fetchReply();

            // Animate each reel
            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 1000));
                finalResult[i] = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];

                const description = finalResult.map((e,j)=> e || spinEmoji).join(" ");
                const embed = new EmbedBuilder()
                    .setTitle("🎰 Casino")
                    .setDescription(description)
                    .setColor("Purple");
                await spinMsg.edit({ embeds: [embed] });
            }

            // Determine win/loss
            let win = finalResult[0] === finalResult[1] && finalResult[1] === finalResult[2];
            let winnings = win ? amount*2 : -amount;
            user.money += winnings;

            const finalEmbed = new EmbedBuilder()
                .setTitle("🎰 Casino Result")
                .setDescription(`${finalResult.join(" ")}\n\n${win ? `🎉 YOU WON! +${winnings} coins` : `💀 You lost! ${-winnings} coins`}`)
                .setColor(win ? "Green" : "Red");
            return spinMsg.edit({ embeds: [finalEmbed] });
        }
    }
});

client.once("ready", () => console.log("Bot online"));
client.login(TOKEN);
