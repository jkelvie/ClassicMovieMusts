const AirtableManager = require("./airtable");
const Podcaster = require("./podcaster");

// Startup related activities for the skill
const Startup = {
    async initialize() {
        // We only initialize once
        if (Startup.initialized) {
            return;
        }
        console.log("STARTUP INITIALIZED " + process.pid + " initialized: " + Startup.initialized);
        Startup.initialized = true;
        
        // Do all the stuff that must be done first here
        require("dotenv").config();

        require("aws-sdk").config.update({
            region: "us-east-1",
        });

        await Startup.refresh();
    },

    initialized: false,

    async refresh() {
        await AirtableManager.instance().initialize();
        await Podcaster.instance().initialize();
    },
};

module.exports = Startup;