const _ = require("lodash");
const fs = require("fs");
const os = require("os");
const shelljs = require("shelljs");

const usingCI = _.get(process, "env.CI", "false") === "true";

const environment = _.nth(process.argv, 2);
if (!environment || !_.includes(["dev", "prod"], environment)) {
    console.error("Must provide the environment name as the first argument - dev or prod");
    process.exit(1);
}
console.log(`Using environment: ${environment} Using CI: ${usingCI}`);

const target = _.nth(process.argv, 3);
if (target) {
    if (!_.includes(["lambda", "model", "skill"], target)) {
        console.error("Target must be one of: lambda, model, skill");
        process.exit(1);
    }
    console.log(`Building only for: ${target}`);
}

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

// If using CI, the create an AWS file and the global ASK CLI config
if (usingCI) {
    shelljs.mkdir("~/.ask");
    shelljs.cp("-f", "../global_cli_config", "~/.ask/cli_config");

    shelljs.sed("-i", "ASK_ACCESS_TOKEN", process.env.ASK_ACCESS_TOKEN, "~/.ask/cli_config");
    shelljs.sed("-i", "ASK_REFRESH_TOKEN", process.env.ASK_REFRESH_TOKEN, "~/.ask/cli_config");

    const awsFileContents = "[default]\n" + 
        `aws_access_key_id=${process.env.AWS_ACCESS_KEY_ID}\n` +
        `aws_secret_access_key=${process.env.AWS_SECRET_ACCESS_KEY}`;
    
    shelljs.mkdir("~/.aws");
    fs.writeFileSync(`${os.homedir()}/.aws/credentials`, awsFileContents);
    shelljs.touch("~/.aws/config");
}

// Run the deployment
if (target) {
    shelljs.exec(`ask deploy -t ${target} --force`);
} else if (useLocalProxy) {
    // If we are using the bst proxy, just deploy the model and skill
    shelljs.exec("ask deploy -t skill --force");
    shelljs.exec("ask deploy -t model --force");
} else {
    shelljs.exec("ask deploy --force");
}

