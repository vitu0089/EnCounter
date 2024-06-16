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
                this.value = data.value
                this.users = data.users
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
        let data = {
            value : counter.value,
            users : new Array(counter.users.values())
        }

        fs.writeFileSync(tempPath,JSON.stringify(data))
        if (fs.readFileSync(tempPath).toString() == JSON.stringify(data)) {
            fs.renameSync(tempPath,path)
            return true
        }
        
        return false
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
    }
}

client.on("interactionCreate",(interaction) => {
    if (!interaction.isCommand()) {
        return
    }

    interaction.deferReply()

    let command = commands[interaction.commandName]
    if (!command) {
        interaction.editReply("Couldn't find that command, please contact a developer")
        return
    }

    command.execute(interaction)
})

client.once("ready",async () => {
    console.log("Bot ready...")

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