require("dotenv").config({ path: "dev.env" });
const shelljs = require("shelljs");

if (process.env.CLEAN) {
    shelljs.rm("-rf", "target");
}

shelljs.mkdir("-p", "target");
// Setup the ASK config
shelljs.mkdir("target/.ask");
shelljs.cp("-f", "../.ask/config", "target/.ask/config");

shelljs.sed("-i", "FUNCTION_NAME", process.env.FUNCTION_NAME, "target/.ask/config");
shelljs.sed("-i", "LAMBDA_ARN", process.env.LAMBDA_ARN, "target/.ask/config");
shelljs.sed("-i", "SKILL_ID", process.env.SKILL_ID, "target/.ask/config");

// Copy over the model
shelljs.mkdir("target/models");
shelljs.cp("-f", "../models/*", "target/models");

shelljs.sed("-i", "INVOCATION_NAME", process.env.INVOCATION_NAME, "target/models/en-US.json");

// Copy over the skill.json
shelljs.cp("-f", "../skill.json", "target");

shelljs.sed("-i", "FUNCTION_NAME", process.env.FUNCTION_NAME, "target/skill.json");
shelljs.sed("-i", "SKILL_NAME", process.env.SKILL_NAME, "target/skill.json");

// Copy all the other files we need
shelljs.cp("../package.json", "target/");
shelljs.cp("-r", "../lib", "target/");
shelljs.cp("-r", "../hooks", "target/"); // If we don't copy the hooks, they will be created anew

// Install the dependencies
shelljs.pushd("target");
shelljs.exec("npm install --only=prod");

// Run the deployment
shelljs.exec("ask deploy -t lambda --force");

