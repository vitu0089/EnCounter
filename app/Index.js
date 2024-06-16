"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const fs_1 = __importDefault(require("fs"));
const Settings_1 = __importDefault(require("./Settings"));
const client = new discord_js_1.default.Client({
    intents: [
        "Guilds",
        "DirectMessages",
        "GuildMembers",
        "GuildMessages"
    ]
});
let cache = new Map();
class Counter {
    constructor(name, startingValue) {
        this.value = 0;
        this.name = name;
        let path = `${__dirname}/Counters/${name}.json`;
        // Check if it exists
        let exists = fs_1.default.existsSync(path);
        if (exists) {
            // Load data
            let rawData = fs_1.default.readFileSync(path);
            let data = rawData && JSON.parse(rawData.toString());
            if (!data) {
                console.error(`Data failed on counter: ${name}`);
            }
            else {
                let usersArray = data.users;
                this.value = data.value;
                this.users = new Map();
                for (const index in usersArray) {
                    this.users.set(usersArray[index], true);
                }
                cache.set(name, this);
                return;
            }
        }
        // New data (Dispite there maybe being data already, that data failed)
        this.value = startingValue || 0;
        this.users = new Map();
        cache.set(name, this);
    }
}
const counterController = {
    Create(name, masterUserId, startingValue) {
        if (!this.Delete(name, masterUserId)) {
            return false;
        }
        new Counter(name, startingValue)
            .users.set(masterUserId, true);
        this.Save(name);
    },
    Get(name) {
        let counter = cache.get(name);
        if (!counter) {
            return undefined;
        }
        return counter;
    },
    CheckUpdatePermission(name, userId) {
        let counter = cache.get(name);
        if (!counter) {
            return false;
        }
        return counter.users.has(userId);
    },
    Delete(name, userId) {
        let existingCounter = cache.get(name);
        if (existingCounter) {
            if (!existingCounter.users.has(userId)) {
                return false;
            }
            let path = `${__dirname}/Counters/${name}.json`;
            cache.delete(name);
            fs_1.default.unlinkSync(path);
        }
        return true;
    },
    Save(name) {
        let counter = cache.has(name) && cache.get(name);
        if (!counter) {
            return false;
        }
        let tempPath = `${__dirname}/Temp/${name}.json`;
        let path = `${__dirname}/Counters/${name}.json`;
        let serializedUsers = [];
        for (const [name] of counter.users) {
            serializedUsers.push(name);
        }
        let data = {
            value: counter.value,
            users: serializedUsers
        };
        fs_1.default.writeFileSync(tempPath, JSON.stringify(data));
        if (fs_1.default.readFileSync(tempPath).toString() == JSON.stringify(data)) {
            fs_1.default.renameSync(tempPath, path);
            return true;
        }
        return false;
    },
    Load(name) {
        return new Counter(name);
    }
};
const commands = {
    create: {
        execute(interaction) {
            var _a, _b;
            let name = (_a = interaction.options.get("name")) === null || _a === void 0 ? void 0 : _a.value;
            let startingValue = (_b = interaction.options.get("starting_value")) === null || _b === void 0 ? void 0 : _b.value;
            if (!name || typeof (name) != "string") {
                interaction.editReply("You were unable to create this interaction");
                return;
            }
            startingValue = typeof (startingValue) == "number" && startingValue || 0;
            counterController.Create(name, interaction.user.id, startingValue);
            interaction.editReply(`Counter "${name}" has been created`);
        },
        build() {
            let stringOption = new discord_js_1.default.SlashCommandStringOption()
                .setName("name")
                .setRequired(true)
                .setDescription("The name of the counter");
            let numberOption = new discord_js_1.default.SlashCommandNumberOption()
                .setName("starting_value")
                .setDescription("The value of which the counter begins");
            let builder = new discord_js_1.default.SlashCommandBuilder()
                .addStringOption(stringOption)
                .addNumberOption(numberOption)
                .setName("create")
                .setDescription("Lets you create a counter");
            return builder;
        }
    },
    add: {
        execute(interaction) {
            var _a, _b;
            let name = (_a = interaction.options.get("name")) === null || _a === void 0 ? void 0 : _a.value;
            let value = (_b = interaction.options.get("value")) === null || _b === void 0 ? void 0 : _b.value;
            value = value && typeof (value) == "number" && value || 1;
            if (!name || typeof (name) != "string" || typeof (value) != "number") {
                interaction.editReply("Incorrect information");
                return;
            }
            let counter = cache.get(name);
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to increment this counter");
                return;
            }
            counter.value += value;
            counterController.Save(name);
            interaction.editReply(`The counter of the name "${counter.name}" has been incremented to the value of: ${counter.value}`);
        },
        build() {
            let stringOption = new discord_js_1.default.SlashCommandStringOption()
                .setName("name")
                .setRequired(true)
                .setDescription("The name of the counter");
            let numberOption = new discord_js_1.default.SlashCommandNumberOption()
                .setName("value")
                .setDescription("Increment by this value");
            let builder = new discord_js_1.default.SlashCommandBuilder()
                .addStringOption(stringOption)
                .addNumberOption(numberOption)
                .setName("add")
                .setDescription("Add to a counter");
            return builder;
        }
    },
    check: {
        execute(interaction) {
            var _a;
            let name = (_a = interaction.options.get("name")) === null || _a === void 0 ? void 0 : _a.value;
            if (!name || typeof (name) != "string") {
                interaction.editReply("Incorrect information");
                return;
            }
            let counter = cache.get(name);
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to increment this counter");
                return;
            }
            interaction.editReply(`The value of "${counter.name}" is ${counter.value}`);
        },
        build() {
            let stringOption = new discord_js_1.default.SlashCommandStringOption()
                .setName("name")
                .setRequired(true)
                .setDescription("The name of the counter");
            let builder = new discord_js_1.default.SlashCommandBuilder()
                .addStringOption(stringOption)
                .setName("check")
                .setDescription("Check a counter");
            return builder;
        }
    },
    add_admin: {
        execute(interaction) {
            var _a, _b;
            let name = (_a = interaction.options.get("counter_name")) === null || _a === void 0 ? void 0 : _a.value;
            let user = (_b = interaction.options.get("user")) === null || _b === void 0 ? void 0 : _b.user;
            if (!name || typeof (name) != "string" || !user) {
                interaction.editReply("Incorrect information");
                return;
            }
            let counter = cache.get(name);
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to add this user");
                return;
            }
            counter.users.set(user.id, true);
            counterController.Save(name);
            interaction.editReply(`Added user "${user.displayName}" to counter "${name}"`);
        },
        build() {
            let stringOption = new discord_js_1.default.SlashCommandStringOption()
                .setName("counter_name")
                .setRequired(true)
                .setDescription("The name of the counter");
            let userOption = new discord_js_1.default.SlashCommandUserOption()
                .setName("user")
                .setRequired(true)
                .setDescription("Select user");
            let builder = new discord_js_1.default.SlashCommandBuilder()
                .addStringOption(stringOption)
                .addUserOption(userOption)
                .setName("add_admin")
                .setDescription("Add admin to counter. This lets them increment the values");
            return builder;
        }
    },
    delete: {
        execute(interaction) {
            var _a;
            let name = (_a = interaction.options.get("name")) === null || _a === void 0 ? void 0 : _a.value;
            if (!name || typeof (name) != "string") {
                interaction.editReply("Incorrect information");
                return;
            }
            let counter = cache.get(name);
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to add this user");
                return;
            }
            let result = counterController.Delete(name, interaction.user.id);
            if (result) {
                interaction.editReply(`The counter "${name}" has been deleted`);
                return;
            }
            interaction.editReply("You do not have the permissions to delete this counter");
        },
        build() {
            let stringOption = new discord_js_1.default.SlashCommandStringOption()
                .setName("name")
                .setRequired(true)
                .setDescription("The name of the counter");
            let builder = new discord_js_1.default.SlashCommandBuilder()
                .addStringOption(stringOption)
                .setName("delete")
                .setDescription("Delete the counter");
            return builder;
        }
    }
};
client.on("interactionCreate", (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isCommand()) {
        return;
    }
    yield interaction.deferReply();
    let command = commands[interaction.commandName];
    if (!command) {
        interaction.editReply("Couldn't find that command, please contact a developer");
        return;
    }
    command.execute(interaction);
}));
client.once("ready", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Bot ready...");
    let files = fs_1.default.readdirSync(`${__dirname}\\Counters`);
    for (const index in files) {
        let name = files[index].split(".")[0];
        counterController.Load(name);
    }
    // Create test commands
    let testServer = yield client.guilds.fetch(Settings_1.default.supportServerId);
    if (testServer) {
        console.log("Bot creating test commands...");
        // Create commands
        for (const index in commands) {
            testServer.commands.create(commands[index].build());
        }
    }
    else {
        console.log("Bot creating commands...");
        // Create commands
        for (const index in commands) {
            (_a = client.application) === null || _a === void 0 ? void 0 : _a.commands.create(commands[index].build());
        }
    }
}));
client.login(Settings_1.default.token);
