const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.TOKEN;

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
  lucky: { price: 1000, name: "Lucky Charm", emoji: "🍀" },
  cookie: { price: 100, name: "Cookie", emoji: "🍪" },
  vip: { price: 2000, name: "VIP Role", emoji: "💎" },
  lick: { price: 10000, name: "Lick", emoji: "👅" }
};

/* SLOT EMOJIS */
const spinEmoji = "<a:spin:1480248762789138656>";

const slotEmojis = [
  "<:cherry:1480249175303131246>",
  "<:eggplant:1480249069614923937>",
  "<:heart:1480248711308247163>",
  "💎",
  "🍀"
];

/* USER DATA */
function getUser(id) {
  if (!data[id]) {
    data[id] = {
      money: 1000,
      inventory: [],
      luckyBoost: false
    };
  }
  return data[id];
}

/* BOT READY */
client.once("ready", () => {
  console.log("Casino bot ready 🎰");
});

/* MESSAGE COMMANDS */
client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith("goodmc ")) return;

  const args = message.content.slice(7).trim().split(" ");
  const cmd = args[0];
  const user = getUser(message.author.id);

  /* BALANCE */
  if (cmd === "balance") {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
        .setTitle("💰 Balance")
        .setDescription(`You have **${user.money} coins**`)
        .setColor("Green")
      ]
    });
  }

  /* SHOP */
  if (cmd === "shop") {

    let text = "";

    for (let item in shop) {
      text += `${shop[item].emoji} **${shop[item].name}** — ${shop[item].price} coins\n`;
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
        .setTitle("🛒 Shop")
        .setDescription(text)
        .setColor("Purple")
      ]
    });

  }

  /* BUY */
  if (cmd === "buy") {

    const item = args[1];

    if (!shop[item]) {
      return message.channel.send("❌ Item doesn't exist.");
    }

    if (user.money < shop[item].price) {
      return message.channel.send("❌ Not enough coins.");
    }

    user.money -= shop[item].price;
    user.inventory.push(item);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
        .setTitle("🛒 Purchase Successful")
        .setDescription(`You bought **${shop[item].name}** ${shop[item].emoji}`)
        .setColor("Green")
      ]
    });

  }

  /* INVENTORY */
  if (cmd === "inventory") {

    if (user.inventory.length === 0) {
      return message.channel.send("🎒 Your inventory is empty.");
    }

    let counts = {};

    user.inventory.forEach(i => {
      counts[i] = (counts[i] || 0) + 1;
    });

    let text = "";

    for (let i in counts) {
      text += `${shop[i].emoji} **${shop[i].name}** x${counts[i]}\n`;
    }

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
        .setTitle(`${message.author.username}'s Inventory`)
        .setDescription(text)
        .setColor("Orange")
      ]
    });

  }

  /* USE ITEM */
  if (cmd === "use") {

    const item = args[1];

    if (!user.inventory.includes(item)) {
      return message.channel.send("❌ You don't own this item.");
    }

    if (item === "lucky") {

      const index = user.inventory.indexOf("lucky");
      user.inventory.splice(index, 1);

      user.luckyBoost = true;

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
          .setTitle("🍀 Lucky Charm Used")
          .setDescription("Your **next gamble has a higher win chance!**")
          .setColor("Green")
        ]
      });

    }

  }

  /* GAMBLE */
  if (cmd === "gamble") {

    const amount = parseInt(args[1]);

    if (!amount || amount <= 0) {
      return message.channel.send("❌ Invalid amount.");
    }

    if (user.money < amount) {
      return message.channel.send("❌ Not enough coins.");
    }

    let results = ["", "", ""];

    const embed = new EmbedBuilder()
      .setTitle("🎰 Casino")
      .setDescription(`${spinEmoji} ${spinEmoji} ${spinEmoji}`)
      .setColor("Purple");

    const spinMsg = await message.channel.send({ embeds: [embed] });

    for (let i = 0; i < 3; i++) {

      await new Promise(r => setTimeout(r, 1000));

      results[i] = slotEmojis[Math.floor(Math.random() * slotEmojis.length)];

      const display = results.map(e => e || spinEmoji).join(" ");

      const newEmbed = new EmbedBuilder()
        .setTitle("🎰 Casino")
        .setDescription(display)
        .setColor("Purple");

      await spinMsg.edit({ embeds: [newEmbed] });

    }

    /* WIN CHANCE */

    let winChance = 0.2;

    if (user.luckyBoost) {
      winChance = 0.4;
      user.luckyBoost = false;
    }

    let win = Math.random() < winChance;

    if (win) {
      const winnings = amount * 2;
      user.money += winnings;

      return spinMsg.edit({
        embeds: [
          new EmbedBuilder()
          .setTitle("🎉 YOU WON!")
          .setDescription(`${results.join(" ")}\n\n+${winnings} coins`)
          .setColor("Green")
        ]
      });
    } else {

      user.money -= amount;

      return spinMsg.edit({
        embeds: [
          new EmbedBuilder()
          .setTitle("💀 You Lost")
          .setDescription(`${results.join(" ")}\n\n-${amount} coins`)
          .setColor("Red")
        ]
      });

    }

  }

});

client.login(TOKEN);
