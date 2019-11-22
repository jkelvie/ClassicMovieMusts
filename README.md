[![Build Status](https://travis-ci.org/jkelvie/ClassicMovieMusts.svg?branch=master)](https://travis-ci.org/jkelvie/ClassicMovieMusts)
[![codecov](https://codecov.io/gh/jkelvie/ClassicMovieMusts/branch/master/graph/badge.svg)](https://codecov.io/gh/jkelvie/ClassicMovieMusts)

# Classic Movie Musts
**Trivia, podcasts, plus Alexa skill development showcase from Bespoken!**

[![ClassicMovieMusts](https://mcdn.podbean.com/mf/web/hqtbi7/Max_Baril_-_Classic_Movie_Musts_Twitter.jpg)](https://classicmoviemusts.com)

## Overview
Listen to the latest episodes from Classic Movie Musts, and play a fun trivia game inspired by the podcast! Go here to enable the skill and try it out - [Classic Movie Musts skill on Amazon.com](https://www.amazon.com/Bespoken-Classic-Movie-Musts/dp/B07ZB7RV7X).

This is also a showcase for best practices for Alexa skill development and using Bespoken for testing skills.

This project demonstrates:
* Automated unit-testing
* Local development with REAL payloads using [`bst proxy`](https://read.bespoken.io/cli/commands/#proxy)
* Local debugging with VS Code
* Continuous Integration with Travis CI
* Automated deployment

## Code
The code is divided into two major sections:
* [lib/index.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/index.js) - The trivia game
* [lib/podcaster.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/podcaster.js) - The podcast playback

Additional key supporting classes:
* [lib/rss.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/rss.js) - Loads in the podcast RSS feed
* [lib/airtable.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/airtable.js) - Loads trivia questions from Airtable

## Debugging
The project is setup to be debugged in VSCode.

Check out the [launch.json configuration](https://github.com/jkelvie/ClassicMovieMusts/blob/master/.vscode/launch.json). Modify the paths to fit where the `bespoken-tools` node module is installed (more info on this in the full blog post below).

BE SURE to [disable collectCoverage](https://github.com/jkelvie/ClassicMovieMusts/blob/master/testing.json#L6) in the testing.json when running debugging. It should be set to false or else breakpoints will not work in VS Code.

Check out our full blog post on [debugging in VS Code here](https://bespoken.io/blog/debugging-alexa-skills-with-vs-code-and-bespoken-part-2/).

## Testing
Run the unit tests just by typing:
```
npm test
```

You can run a subset of tests with:
```
npm test Quiz
```

## Deployment
### Quick Start
Deployment can be run locally using the task for dev:
```
npm deploy-dev
```

For prod:
```
npm deploy-prod
```

For running locally, just make sure you have [setup the ASK CLI first](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html).

### More Info On Deployment
The deployment script is controlled by the [build.js file](https://github.com/jkelvie/ClassicMovieMusts/blob/master/build/build.js). This script uses the ASK CLI and some scripting and file manipulation to deploy our code.

The key considerations for our deployment:
* We support multiple skill stages (dev and production)
* We support running deployments from a continuous integration tool

The build script executes the following steps:
* Creates a clean area for creating the deployment artifacts (build/target)
* Sets up the project-level ASK config file - which controls the endpoint/Lambda configuration
* Configures the interaction model
* Configures the skill.json metadata
* Sets up the global ASK configuration (CI environments only)
* Sets up AWS configuration (CI environments only)
* Deploys the new version of the skill
* Runs an end-to-end smoke test on the newly deployed version

Most of the work being done is just replacing certain values that vary between the dev and prod environments. These values are set as environment variables. They are:

| Variable | Description |
| --- | --- |
| ASK_ACCESS_TOKEN | The ASK CLI access token - can be found under ~/.ask/cli_config (CI ONLY)
| ASK_REFRESH_TOKEN | The ASK CLI refresh token - can be found under ~/.ask/cli_config (CI ONLY)
| ASK_VENDOR_ID | The vendor ID for the ASK CLI - can be found under ~/.ask/cli_config(CI ONLY)
| AWS_ACCESS_KEY_ID | The AWS access key ID (CI ONLY)
| AWS_SECRET_ACCESS_KEY | The AWS secret access key (CI ONLY)
| CI | Set to true if this script is being run in a CI environment (CI ONLY)
| FUNCTION_NAME | The name of the Lambda function to deploy to (also can be an HTTPS url - see below for more info) |
| INVOCATION_NAME | The invocation name for the skill |
| LAMBDA_ARN | The full Lambda ARN |
| SKILL_ID | The Skill ID |

The variables that are CI ONLY are marked that way because they do NOT need to be set if running locally on your laptop. This is because we assume you have setup and configured the ASK locally - [follow these directions](https://developer.amazon.com/docs/smapi/quick-start-alexa-skills-kit-command-line-interface.html) if you have not already done this.

Use caution with setting the CI flag - it will create ~/.aws/credentials and ~/.ask/cli_config files. In CI environments, this is typically fine because they are run on "pristine" VMs each time. But this may (undesirably) overwrite existing files if run on a dev laptop.

Additionally when running locally, you can set the FUNCTION_NAME to an HTTPS URL. This will configure the skill endpoint to use that instead of a Lambda. This is particularly useful for local testing with our [bst proxy](https://read.bespoken.io/cli/commands/#proxy). Using the bst proxy, the payloads from Alexa will be sent directly to your laptop.

Most of these variables are taken automatically from one of two files, which vary by environment:
* [dev.env](https://github.com/jkelvie/ClassicMovieMusts/blob/master/build/dev.env) - DEV environment configuration
* [prod.env](https://github.com/jkelvie/ClassicMovieMusts/blob/master/build/prod.env) - PROD environment configuration

## Continuous Integration
The project is configured to use Travis for continuous integration.

You can check out the Travis Configuration in
[the .travis.yml file](https://github.com/jkelvie/ClassicMovieMusts/blob/master/.travis.yml).

The CI script will automatically deploy to prod and dev when a tag is added to Github that starts with `dev-*` or `prod-*`.

For example, the first release to dev is tagged `dev-1`. That will trigger our CI process to deploy to the dev environment. You can see an [example deployment via Travis here](https://travis-ci.org/jkelvie/ClassicMovieMusts/builds/603416737).

To setup your own CI process, you can leverage the above script. Just make sure to set the environment variables in the CI tool that are marked as CI ONLY. With regard to ASK_CLI_TOKEN and ASK_REFRESH_TOKEN, they will USUALLY need to be put in quotes.

# Questions?
[Talk to me on Gitter](https://gitter.im/bespoken/bst).


