# Current ToDos
- [ ] Add fuzzy matching on movie name
- [ ] Change acknowledgement on correct answers
- [ ] Force feed reload
- [ ] Add episode number to PlayIntent response
- [ ] Create end-to-end tests
  - [ ] Test core scenarios
  - [ ] Tie into deployments
  - [ ] Document :-)
- [ ] For ASK CLI, now can use environment variables https://developer.amazon.com/docs/smapi/manage-credentials-with-ask-cli.html#ask-cli-env-vars
  - [ ] No need to create global CLI config file
  - [ ] Can we bypass the AWS global configuration as well? https://developer.amazon.com/docs/smapi/manage-credentials-with-ask-cli.html#ask-cli-env-vars

# Complete 11/2/19
- [X] Upgrade Lambda node.js
- [X] Improve the README
  - [X] Include deployment steps overview
  - [X] include deployment environment variables descriptions
- [X] Make Vendor ID an environment variable
- [X] Upgrade node.js version in code/tests

# Up to 10/26/19
## For Test
- [X] Test what happens when all questions are answered
- [X] Add logo
- [X] Accidentally catching quiz intent with answers
- [X] Setup ask cli deployment
- [X] Add eslint
- [X] CI and codecov
- [X] Move speechcons
- [X] Update skill.json with correct values

## For submission
- [X] Use dynamic entities
- [X] Add synonyms to airtable
- [X] Update skill description
- [X] Test pause and resume
- [X] Say the name of the podcast to listen to after trivia question
- [X] Review error logs for bugs to fix from cloudwatch

## For audioplayer
- [X] Add podcast
- [X] Add play intent
- [X] Add pause and resume intents for audioplayer
- [X] Update playback metadata
- [X] Put active podcast in session
- [X] Create generic play/resume function
- [X] Add missing intents
- [X] Add query about what movie do you want at the start?
- [X] Add play latest episode
- [X] Add question to playback related episode

## Hygiene
- [X] Don't replace URL/lambda configuration when updating dev
- [X] Add alerts for exceptions in cloudwatch