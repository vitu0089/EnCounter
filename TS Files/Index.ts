import Discord from "discord.js"
import fs from "fs"
import Settings from "./Settings"

const client = new Discord.Client({
    intents : [
        "Guilds",
        "DirectMessages",
        "GuildMembers",
        "GuildMessages"
    ]
})

let cache : Map<string,Counter> = new Map()
class Counter {
    value : number = 0
    name : string
    users : Map<string,boolean>

    constructor(name:string,startingValue?:number) {
        this.name = name

        let path = `${__dirname}/Counters/${name}.json`
        
        // Check if it exists
        let exists = fs.existsSync(path)

        if (exists) {
            // Load data
            let rawData = fs.readFileSync(path)
            let data = rawData && JSON.parse(rawData.toString())
            if (!data) {
                console.error(`Data failed on counter: ${name}`)
            } else {
                let usersArray = data.users
                this.value = data.value
                this.users = new Map()

                for (const index in usersArray) {
                    this.users.set(usersArray[index],true)
                }

                cache.set(name,this)
                return
            }
        } 
        
        // New data (Dispite there maybe being data already, that data failed)
        this.value = startingValue || 0
        this.users = new Map()

        cache.set(name,this)
    }
}

const counterController = {
    Create(name:string, masterUserId:string,startingValue?:number) {
        if (!this.Delete(name, masterUserId)) {
            return false
        }

        new Counter(name,startingValue)
        .users.set(masterUserId,true)

        this.Save(name)
    },

    Get(name:string) {
        let counter = cache.get(name)
        if (!counter) {
            return undefined
        }

        return counter
    },

    CheckUpdatePermission(name:string,userId:string) {
        let counter = cache.get(name)
        if (!counter) {
            return false
        }

        return counter.users.has(userId)
    },

    Delete(name:string, userId:string) {
        let existingCounter = cache.get(name)
        if (existingCounter) {
            if (!existingCounter.users.has(userId)) {
                return false
            }

            let path = `${__dirname}/Counters/${name}.json`

            cache.delete(name)
            fs.unlinkSync(path)
        }

        return true
    },

    Save(name:string) {
        let counter = cache.has(name) && cache.get(name)
        if (!counter) {
            return false
        }

        let tempPath = `${__dirname}/Temp/${name}.json`
        let path = `${__dirname}/Counters/${name}.json`
        let serializedUsers : string[] = []

        for (const [name] of counter.users) {
            serializedUsers.push(name)
        }

        let data = {
            value : counter.value,
            users : serializedUsers
        }

        fs.writeFileSync(tempPath,JSON.stringify(data))
        if (fs.readFileSync(tempPath).toString() == JSON.stringify(data)) {
            fs.renameSync(tempPath,path)
            return true
        }
        
        return false
    },

    Load(name:string) {
        return new Counter(name)
    }
}

const commands : {
    [key : string] : {
        execute : (interaction : Discord.CommandInteraction) => any,
        build : () => Discord.SlashCommandOptionsOnlyBuilder
    }
} = {
    create : {
        execute(interaction) {
            let name = interaction.options.get("name")?.value
            let startingValue = interaction.options.get("starting_value")?.value
            
            if (!name || typeof(name) != "string") {
                interaction.editReply("You were unable to create this interaction")
                return
            }

            startingValue = typeof(startingValue) == "number" && startingValue || 0

            counterController.Create(name,interaction.user.id,startingValue)
            interaction.editReply(`Counter "${name}" has been created`)
        },
        build() {
            let stringOption = new Discord.SlashCommandStringOption()
            .setName("name")
            .setRequired(true)
            .setDescription("The name of the counter")

            let numberOption = new Discord.SlashCommandNumberOption()
            .setName("starting_value")
            .setDescription("The value of which the counter begins")

            let builder = new Discord.SlashCommandBuilder()
            .addStringOption(stringOption)
            .addNumberOption(numberOption)
            .setName("create")
            .setDescription("Lets you create a counter")

            return builder
        }
    },

    add : {
        execute(interaction) {
            let name = interaction.options.get("name")?.value
            let value = interaction.options.get("value")?.value
            value = value && typeof(value) == "number" && value || 1
            
            if (!name || typeof(name) != "string" || typeof(value) != "number") {
                interaction.editReply("Incorrect information")
                return
            }

            let counter = cache.get(name)
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to increment this counter")
                return
            }

            counter.value += value
            counterController.Save(name)
            interaction.editReply(`The counter of the name "${counter.name}" has been incremented to the value of: ${counter.value}`)
        },
        build() {
            let stringOption = new Discord.SlashCommandStringOption()
            .setName("name")
            .setRequired(true)
            .setDescription("The name of the counter")

            let numberOption = new Discord.SlashCommandNumberOption()
            .setName("value")
            .setDescription("Increment by this value")

            let builder = new Discord.SlashCommandBuilder()
            .addStringOption(stringOption)
            .addNumberOption(numberOption)
            .setName("add")
            .setDescription("Add to a counter")

            return builder
        }
    },

    check : {
        execute(interaction) {
            let name = interaction.options.get("name")?.value
            
            if (!name || typeof(name) != "string") {
                interaction.editReply("Incorrect information")
                return
            }

            let counter = cache.get(name)
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to increment this counter")
                return
            }

            interaction.editReply(`The value of "${counter.name}" is ${counter.value}`)
        },
        build() {
            let stringOption = new Discord.SlashCommandStringOption()
            .setName("name")
            .setRequired(true)
            .setDescription("The name of the counter")

            let builder = new Discord.SlashCommandBuilder()
            .addStringOption(stringOption)
            .setName("check")
            .setDescription("Check a counter")

            return builder
        }
    },

    add_admin : {
        execute(interaction) {
            let name = interaction.options.get("counter_name")?.value
            let user = interaction.options.get("user")?.user
            
            if (!name || typeof(name) != "string" || !user) {
                interaction.editReply("Incorrect information")
                return
            }

            let counter = cache.get(name)
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to add this user")
                return
            }

            counter.users.set(user.id,true)
            counterController.Save(name)
            interaction.editReply(`Added user "${user.displayName}" to counter "${name}"`)
        },
        build() {
            let stringOption = new Discord.SlashCommandStringOption()
            .setName("counter_name")
            .setRequired(true)
            .setDescription("The name of the counter")

            let userOption = new Discord.SlashCommandUserOption()
            .setName("user")
            .setRequired(true)
            .setDescription("Select user")

            let builder = new Discord.SlashCommandBuilder()
            .addStringOption(stringOption)
            .addUserOption(userOption)
            .setName("add_admin")
            .setDescription("Add admin to counter. This lets them increment the values")

            return builder
        }
    },

    delete : {
        execute(interaction) {
            let name = interaction.options.get("name")?.value     
            
            if (!name || typeof(name) != "string") {
                interaction.editReply("Incorrect information")
                return
            }
            
            let counter = cache.get(name)
            if (!counter || !counter.users.has(interaction.user.id)) {
                interaction.editReply("You do not have the permissions to add this user")
                return
            }

            let result = counterController.Delete(name,interaction.user.id)
            if (result) {
                interaction.editReply(`The counter "${name}" has been deleted`)
                return
            }

            interaction.editReply("You do not have the permissions to delete this counter")
        },
        build() {
            let stringOption = new Discord.SlashCommandStringOption()
            .setName("name")
            .setRequired(true)
            .setDescription("The name of the counter")

            let builder = new Discord.SlashCommandBuilder()
            .addStringOption(stringOption)
            .setName("delete")
            .setDescription("Delete the counter")

            return builder
        }
    }
}

client.on("interactionCreate",async (interaction) => {
    if (!interaction.isCommand()) {
        return
    }

    await interaction.deferReply()

    let command = commands[interaction.commandName]
    if (!command) {
        interaction.editReply("Couldn't find that command, please contact a developer")
        return
    }

    command.execute(interaction)
})

client.once("ready",async () => {
    console.log("Bot ready...")

    let files = fs.readdirSync(`${__dirname}\\Counters`)
    for (const index in files) {
        let name = files[index].split(".")[0]
        counterController.Load(name)
    }

    // Create test commands
    let testServer = await client.guilds.fetch(Settings.supportServerId)
    if (testServer) {
        console.log("Bot creating test commands...")

        // Create commands
        for (const index in commands) {
            testServer.commands.create(
                commands[index].build()
            )
        }
    } else {
        console.log("Bot creating commands...")
        // Create commands
        for (const index in commands) {
            client.application?.commands.create(
                commands[index].build()
            )
        }
    }
})

client.login(Settings.token)