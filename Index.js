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
                this.value = data.value;
                this.users = data.users;
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
        let data = {
            value: counter.value,
            users: new Array(counter.users.values())
        };
        fs_1.default.writeFileSync(tempPath, JSON.stringify(data));
        if (fs_1.default.readFileSync(tempPath).toString() == JSON.stringify(data)) {
            fs_1.default.renameSync(tempPath, path);
            return true;
        }
        return false;
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
    }
};
client.on("interactionCreate", (interaction) => {
    if (!interaction.isCommand()) {
        return;
    }
    interaction.deferReply();
    let command = commands[interaction.commandName];
    if (!command) {
        interaction.editReply("Couldn't find that command, please contact a developer");
        return;
    }
    command.execute(interaction);
});
client.once("ready", () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log("Bot ready...");
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
