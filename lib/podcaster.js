const _ = require("lodash");
const AirtableManager = require("./airtable").instance();
const Constants = require("./constants");
const Helper = require("./helper");
const RSS = require("./rss");

class Podcaster {
    static playDirective(podcast, offsetInMilliseconds = 0) {
        const audioPlayerDirective = {
            "audioItem": {
                "metadata": {
                    "art": {
                        "sources": [
                            {
                                "url": podcast.imageURL,
                            },
                        ],
                    },
                    "backgroundImage": {
                        "sources": [
                            {
                                "url": podcast.imageURL,
                            },
                        ],
                    },
                    "subtitle": podcast.title,
                    "title": podcast.movie,
                },
                "stream": {
                    "offsetInMilliseconds": offsetInMilliseconds,
                    "token": podcast.episode + "",
                    "url": podcast.url,
                },
            },
            "playBehavior": "REPLACE_ALL",
            "type": "AudioPlayer.Play",
        };
        return audioPlayerDirective;
    }

    static handlers () {
        return [
            CancelIntentHandler,
            PauseHandler,
            PlaybackNearlyFinishedHandler,
            PlaybackStartedHandler,
            PlaybackStoppedHandler,
            PlayHandler, 
            PlayLatestHandler, 
            PlayThisHandler,
            ResumeHandler,
            StartOverIntentHandler,
            SystemExceptionHandler,
            UnsupportedIntentHandler,
        ];
    }

    static async instance() {
        if (Podcaster.singleton) {
            return Podcaster.singleton;
        }

        const rss = new RSS();
        const feed = await rss.fromURL("https://feed.podbean.com/www.classicmoviemusts.com/feed.xml");
        Podcaster.singleton = new Podcaster(feed);
        return Podcaster.singleton;
    }
    
    constructor(feed) {
        this.feed = feed;
    }

    podcast(episode) {
        const episodeInteger = parseInt(episode);
        return this.feed.podcasts.find(podcast => podcast.episode === episodeInteger);
    }

    movieNameDirective() {
        const values = [];
        this.feed.podcasts.forEach((podcast) => {
            if (!podcast.movie) {
                return;
            }

            const id = podcast.movie.split(" ").join("");
            values.push({
                id: id,
                name: {
                    synonyms: [],
                    value: podcast.movie,
                },
            });
        });

        const replaceEntityDirective = {
            type: "Dialog.UpdateDynamicEntities",
            types: [
                {
                    name: "MOVIE_NAME",
                    values: values,
                },
            ],
            updateBehavior: "REPLACE",
        };
        return replaceEntityDirective;
    }
    
}

const CancelIntentHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "AMAZON.CancelIntent";
    },

    async handle(handlerInput) {
        const response = handlerInput.responseBuilder;
    
        const stopDirective = {
            "type": "AudioPlayer.Stop",
        };

        const attributes = await handlerInput.attributesManager.getPersistentAttributes();
        // Reset the podcast we are listening to - this is not a pause
        delete attributes.episode;
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        await handlerInput.attributesManager.savePersistentAttributes();

        return response.speak("Stopping the podcast").addDirective(stopDirective).getResponse();
    },
};

const PauseHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "AMAZON.PauseIntent" ||
            _.get(handlerInput, "requestEnvelope.request.intent.name") === "AMAZON.StopIntent";
    },

    async handle(handlerInput) {
        const response = handlerInput.responseBuilder;
    
        const stopDirective = {
            "type": "AudioPlayer.Stop",
        };

        return response.addDirective(stopDirective)
            .getResponse();
    },
};

const PlayHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "PlayIntent";
    },

    async handle(handlerInput) {
        const podcaster = await Podcaster.instance();
        let movieRequested = Helper.matchedSlotValue(handlerInput, "MovieName");
        const response = handlerInput.responseBuilder;
    
        let podcast;
        // Find the podcast associated with the user's request
        if (movieRequested) {
            podcast = podcaster.feed.podcasts.find(podcast => podcast.movie === movieRequested.name); 
        } 

        // If there is no match, ask them again
        if (!podcast) {
            movieRequested = _.get(handlerInput, "requestEnvelope.request.intent.slots.MovieName.value");
            return response.speak("Could not find a podcast for the movie: " + movieRequested + ". Please request another movie.")
                .reprompt("Please request another movie")
                .getResponse();
        }
         
        const audioPlayerDirective = Podcaster.playDirective(podcast, 0);
        return response.speak("Playing podcast: " + podcast.title)
            .withShouldEndSession(true)
            .addDirective(audioPlayerDirective)
            .getResponse();
    },
};

const PlayLatestHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "PlayLatestIntent";
    },

    async handle(handlerInput) {
        const podcaster = await Podcaster.instance();
        const response = handlerInput.responseBuilder;
    
        const podcast = podcaster.feed.podcasts[0];
        const audioPlayerDirective = Podcaster.playDirective(podcast, 0);
        return response.speak("Playing the latest episode: " + podcast.title)
            .withShouldEndSession(true)
            .addDirective(audioPlayerDirective)
            .getResponse();
    },
};

const PlayThisHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "PlayThisIntent";
    },

    async handle(handlerInput) {
        const podcaster = await Podcaster.instance();
        const response = handlerInput.responseBuilder;
    
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const questionIndex = attributes[Constants.ATTR_QUESTION_INDEX];
        if (questionIndex === undefined) {
            // If there is no question, means we are not in quiz mode
            return response.speak("I did not understand - what podcast would you like to listen to? " +
                "You can say something like play rear window or play latest")
                .reprompt("You can say play latest or play with a movie name")
                .getResponse();
        }
        const question = AirtableManager.question(questionIndex);
    
        const podcast = podcaster.podcast(question.episode);
        const audioPlayerDirective = Podcaster.playDirective(podcast, 0);
        return response.speak("Playing: " + podcast.title)
            .withShouldEndSession(true)
            .addDirective(audioPlayerDirective)
            .getResponse();
    },
};

const ResumeHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "AMAZON.ResumeIntent";
    },

    async handle(handlerInput) {
        const response = handlerInput.responseBuilder;
        const podcaster = await Podcaster.instance();
        
        const attributes = await handlerInput.attributesManager.getPersistentAttributes();
        if (!attributes.episode) {
            return response.speak("No episode has been paused. Would you like to play one?")
                .reprompt("What would you like to do?")
                .getResponse();
        }
        const offset = attributes.offsetInMilliseconds;
        const podcast = podcaster.podcast(attributes.episode);
        
        console.log("Resume Episode " + attributes.episode + " Offset: " + offset);
        
        const audioPlayerDirective = Podcaster.playDirective(podcast, offset);
        return response.speak("Resuming podcast: " + podcast.title)
            .withShouldEndSession(true)
            .addDirective(audioPlayerDirective)
            .getResponse();
    },
};

const PlaybackNearlyFinishedHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "AudioPlayer.PlaybackNearlyFinished";
    },

    async handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    },
};

const PlaybackStartedHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "AudioPlayer.PlaybackStarted";
    },

    async handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    },
};

const PlaybackStoppedHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "AudioPlayer.PlaybackStopped";
    },

    async handle(handlerInput) {
        // Grab the last time played
        const offset = handlerInput.requestEnvelope.request.offsetInMilliseconds;
        const token = handlerInput.requestEnvelope.request.token;
        const attributes = await handlerInput.attributesManager.getPersistentAttributes();
        attributes.offsetInMilliseconds = offset;
        attributes.episode = token;
        console.log("PlaybackStopped Episode: " + token + " Offset: " + offset);
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        await handlerInput.attributesManager.savePersistentAttributes();
        return handlerInput.responseBuilder.getResponse();
    },
};

const StartOverIntentHandler = {
    canHandle(handlerInput) {
        return _.get(handlerInput, "requestEnvelope.request.intent.name") === "AMAZON.StartOverIntent";
    },

    async handle(handlerInput) {
        const response = handlerInput.responseBuilder;
        const podcaster = await Podcaster.instance();
        
        const attributes = await handlerInput.attributesManager.getPersistentAttributes();
        if (!attributes.episode) {
            return response.speak("No episode is playing. Would you like to play one?")
                .reprompt("What would you like to do?")
                .getResponse();
        }
        const offset = attributes.offsetInMilliseconds;
        const podcast = podcaster.podcast(attributes.episode);
        
        console.log("StartOver Episode " + attributes.episode + " Offset: " + offset);
        
        const audioPlayerDirective = Podcaster.playDirective(podcast, 0);
        return response.speak("Starting over podcast: " + podcast.title)
            .withShouldEndSession(true)
            .addDirective(audioPlayerDirective)
            .getResponse();
    },
};

const SystemExceptionHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "System.ExceptionEncountered";
    },
    handle(handlerInput) {
        console.log(`SystemException Type: ${handlerInput.requestEnvelope.request.error.type} Message: ${handlerInput.requestEnvelope.request.error.message}` );
        return handlerInput.responseBuilder.getResponse();
    },
};

const UnsupportedIntents = {
    "AMAZON.LoopOffIntent": "Sorry the loop feature is not supported at this time",
    "AMAZON.LoopOnIntent": "Sorry, the loop feature is not supported at this time",
    "AMAZON.NextIntent": "Sorry, there is no queue of podcasts supported at this time",
    "AMAZON.PreviousIntent": "Sorry, there is no queue of podcasts supported at this time",
    "AMAZON.RepeatIntent": "Sorry, repeating is not supported at this time",
    "AMAZON.ShuffleOffIntent": "Sorry, the shuffle feature is not supported at this time",
    "AMAZON.ShuffleOnIntent": "Sorry, the shuffle feature is not supported at this time",
};

const UnsupportedIntentHandler = {
    canHandle (handlerInput) {
        const intent = _.get(handlerInput, "requestEnvelope.request.intent.name");
        return (Object.keys(UnsupportedIntents).find(i => i === intent));
    },

    handle(handlerInput) {
        const reply = UnsupportedIntents[handlerInput.requestEnvelope.request.intent.name];
        return handlerInput.responseBuilder.speak(reply)
            .withShouldEndSession(true)
            .getResponse();
    },

};

module.exports = Podcaster;