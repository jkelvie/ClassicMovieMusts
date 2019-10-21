[![Build Status](https://travis-ci.org/jkelvie/ClassicMovieMusts.svg?branch=master)](https://travis-ci.org/jkelvie/ClassicMovieMusts)
[![codecov](https://codecov.io/gh/jkelvie/ClassicMovieMusts/branch/master/graph/badge.svg)](https://codecov.io/gh/jkelvie/ClassicMovieMusts)

# Classic Movie Musts
[![ClassicMovieMusts](https://mcdn.podbean.com/mf/web/hqtbi7/Max_Baril_-_Classic_Movie_Musts_Twitter.jpg)](https://classicmoviemusts.com)

## Overview
Listen to the latest episodes from Classic Movie Musts, and play a fun trivia game inspired by the podcast! Go here to enable the skill and try it out - [Classic Movie Musts skill on Amazon.com](https://www.amazon.com/Bespoken-Classic-Movie-Musts/dp/B07ZB7RV7X).

This is also a showcase for best practices for Alexa skill development and using Bespoken for testing skills.

This project demonstrates:
* Automated unit-testing
* Local development with REAL payloads using [`bst proxy`](https://read.bespoken.io/cli/commands/#proxy)
* Local debugging with VS Code
* Continuous Integration with Travis CI
* Automated deployment (WIP)

## Code
The code is divided into two major sections:
* [lib/index.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/index.js) - The trivia game
* [lib/podcaster.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/podcaster.js) - The podcast playback

Additional key supporting classes:
* [lib/rss.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/rss.js) - Loads in the podcast RSS feed
* [lib/airtable.js](https://github.com/jkelvie/ClassicMovieMusts/blob/master/lib/airtable.js) - Loads trivia questions from Airtable

## Debugging
The project is setup to be debugged in VSCode.

Check out the [launch.json configuration](https://github.com/jkelvie/ClassicMovieMusts/blob/master/.vscode/launch.json)

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

## Continuous Integration
The project is configured to use Travis for continuous integration.

You can check out the Travis Configuration here:
[.travis.yml](https://github.com/jkelvie/ClassicMovieMusts/blob/master/.travis.yml)

## Deployment
Deployment can be run locally using the task for dev:
```
npm deploy.dev
```

For prod:
```
npm deploy.prod
```

COMING SOON - integration of deployment into Travis.