const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Missing TOKEN, CLIENT_ID, or GUILD_ID environment variable.");
  process.exit(1);
}

const DATA_FILE = path.join(__dirname, "staff-data.json");

const defaultData = {
  quota: 100,
  staff: {}
};

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
      return structuredClone(defaultData);
    }

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return {
      quota: Number.isInteger(parsed.quota) && parsed.quota >= 0 ? parsed.quota : 100,
      staff: parsed.staff && typeof parsed.staff === "object" ? parsed.staff : {}
    };
  } catch (error) {
    console.error("Failed to load staff-data.json:", error);
    return structuredClone(defaultData);
  }
}

let data = loadData();

function saveData() {
  const tempFile = DATA_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function isStaff(userId) {
  return Boolean(data.staff[userId]);
}

function ensureStaff(user) {
  if (!data.staff[user.id]) {
    data.staff[user.id] = {
      username: user.username,
      messages: 0,
      addedAt: Date.now()
    };
  } else {
    data.staff[user.id].username = user.username;
  }

  return data.staff[user.id];
}

function progressText(messages) {
  if (data.quota === 0) return "∞ No quota set";
  const percent = Math.min(100, Math.round((messages / data.quota) * 100));
  const remaining = Math.max(0, data.quota - messages);

  if (messages >= data.quota) {
    return `✅ ${messages.toLocaleString()} / ${data.quota.toLocaleString()} (${percent}%) — quota reached`;
  }

  return `⏳ ${messages.toLocaleString()} / ${data.quota.toLocaleString()} (${percent}%) — ${remaining.toLocaleString()} remaining`;
}

const commands = [
  new SlashCommandBuilder()
    .setName("staff")
    .setDescription("Manage the staff list")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("Add a user to the staff list")
        .addUserOption(option =>
          option.setName("user").setDescription("Staff member to add").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("Remove a user from the staff list")
        .addUserOption(option =>
          option.setName("user").setDescription("Staff member to remove").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("list").setDescription("Show all staff members")
    ),

  new SlashCommandBuilder()
    .setName("quota")
    .setDescription("View staff message quotas")
    .addSubcommand(sub =>
      sub
        .setName("set")
        .setDescription("Set the required number of messages")
        .addIntegerOption(option =>
          option
            .setName("messages")
            .setDescription("Required messages")
            .setMinValue(0)
            .setRequired(true)
        )
    )
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("Optional staff member to check")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("quota-reset")
    .setDescription("Reset a staff member's message count")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
    .addUserOption(option =>
      option.setName("user").setDescription("Staff member to reset").setRequired(true)
    )
].map(command => command.toJSON());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const rest = new REST({ version: "10" }).setToken(TOKEN);

async function registerCommands() {
  console.log("Registering slash commands...");

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered.");
}

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Staff quota: ${data.quota} messages`);
  console.log(`Staff members: ${Object.keys(data.staff).length}`);
});

client.on("messageCreate", message => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (!isStaff(message.author.id)) return;

  const staff = ensureStaff(message.author);
  staff.messages += 1;
  saveData();
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "staff") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: "❌ You need Manage Server permission to manage staff.",
          ephemeral: true
        });
      }

      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "add") {
        const user = interaction.options.getUser("user", true);

        if (isStaff(user.id)) {
          return interaction.reply({
            content: `⚠️ <@${user.id}> is already on the staff list.`,
            ephemeral: true
          });
        }

        data.staff[user.id] = {
          username: user.username,
          messages: 0,
          addedAt: Date.now()
        };

        saveData();

        return interaction.reply(
          `✅ Added <@${user.id}> to staff. Their message count starts at **0**.`
        );
      }

      if (subcommand === "remove") {
        const user = interaction.options.getUser("user", true);

        if (!isStaff(user.id)) {
          return interaction.reply({
            content: `⚠️ <@${user.id}> is not on the staff list.`,
            ephemeral: true
          });
        }

        delete data.staff[user.id];
        saveData();

        return interaction.reply(`✅ Removed <@${user.id}> from the staff list.`);
      }

      if (subcommand === "list") {
        const entries = Object.entries(data.staff);

        if (entries.length === 0) {
          return interaction.reply("📋 The staff list is empty.");
        }

        const lines = entries
          .sort((a, b) => b[1].messages - a[1].messages)
          .map(([id, staff], index) =>
            `${index + 1}. <@${id}> — ${progressText(staff.messages)}`
          );

        const embed = new EmbedBuilder()
          .setTitle("👥 Staff List")
          .setDescription(lines.join("\n"))
          .setFooter({ text: `Required quota: ${data.quota.toLocaleString()} messages` });

        return interaction.reply({ embeds: [embed] });
      }
    }

    if (interaction.commandName === "quota") {
      const subcommand = interaction.options.getSubcommand(false);

      if (subcommand === "set") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.reply({
            content: "❌ You need Manage Server permission to change the quota.",
            ephemeral: true
          });
        }

        const amount = interaction.options.getInteger("messages", true);
        data.quota = amount;
        saveData();

        return interaction.reply(
          `✅ Staff quota set to **${amount.toLocaleString()} messages**.`
        );
      }

      const requestedUser = interaction.options.getUser("user");
      const targetId = requestedUser?.id;

      if (targetId) {
        if (!isStaff(targetId)) {
          return interaction.reply(`❌ <@${targetId}> is not on the staff list.`);
        }

        const staff = ensureStaff(requestedUser);
        const embed = new EmbedBuilder()
          .setTitle(`📊 Quota — ${requestedUser.username}`)
          .setDescription(progressText(staff.messages))
          .addFields(
            { name: "Messages", value: staff.messages.toLocaleString(), inline: true },
            { name: "Required", value: data.quota.toLocaleString(), inline: true }
          );

        return interaction.reply({ embeds: [embed] });
      }

      const entries = Object.entries(data.staff);

      if (entries.length === 0) {
        return interaction.reply("📊 No staff members have been added yet.");
      }

      const lines = entries
        .sort((a, b) => b[1].messages - a[1].messages)
        .map(([id, staff]) => `<@${id}> — ${progressText(staff.messages)}`);

      const embed = new EmbedBuilder()
        .setTitle("📊 Staff Quota")
        .setDescription(lines.join("\n"))
        .setFooter({ text: `Required: ${data.quota.toLocaleString()} messages` });

      return interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === "quota-reset") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: "❌ You need Manage Server permission to reset quotas.",
          ephemeral: true
        });
      }

      const user = interaction.options.getUser("user", true);

      if (!isStaff(user.id)) {
        return interaction.reply({
          content: `❌ <@${user.id}> is not on the staff list.`,
          ephemeral: true
        });
      }

      data.staff[user.id].messages = 0;
      data.staff[user.id].username = user.username;
      saveData();

      return interaction.reply(`✅ Reset <@${user.id}>'s message count to **0**.`);
    }
  } catch (error) {
    console.error("Interaction error:", error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ Something went wrong while processing that command.",
        ephemeral: true
      }).catch(() => {});
    } else {
      await interaction.reply({
        content: "❌ Something went wrong while processing that command.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

(async () => {
  try {
    await registerCommands();
    await client.login(TOKEN);
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
})();
