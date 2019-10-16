const _ = require("lodash");
const fs = require("fs");
const shelljs = require("shelljs");

const environment = _.nth(process.argv, 2);
if (!environment || !_.includes(["dev", "prod"], environment)) {
    console.log("Must provide the environment name as the first argument - dev or prod");
    process.exit(1);
}
console.log(`Using environment: ${environment}`);

require("dotenv").config({ path: `${environment}.env` });
const useLocalProxy = process.env.FUNCTION_NAME.startsWith("https");

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

// Do custom stuff with the JSON of the skill file
const skillJSON = JSON.parse(fs.readFileSync("target/skill.json"));
if (useLocalProxy) {
    skillJSON.manifest.apis.custom.endpoint = {};
    skillJSON.manifest.apis.custom.endpoint.uri = process.env.FUNCTION_NAME;
    skillJSON.manifest.apis.custom.endpoint.sslCertificateType = "Wildcard";
}
fs.writeFileSync("target/skill.json", JSON.stringify(skillJSON, null, 2));

// Copy all the other files we need
shelljs.cp("../package.json", "target/");
shelljs.cp("-r", "../lib", "target/");
shelljs.cp("-r", "../hooks", "target/"); // If we don't copy the hooks, they will be created anew

// Install the dependencies
shelljs.pushd("target");
shelljs.exec("npm install --only=prod");

// Run the deployment
if (useLocalProxy) {
    // If we are using the bst proxy, just deploy the model and skill
    shelljs.exec("ask deploy -t skill --force");
    shelljs.exec("ask deploy -t model --force");
} else {
    shelljs.exec("ask deploy --force");
}

