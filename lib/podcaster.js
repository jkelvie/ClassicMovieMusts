const _ = require("lodash");
const Helper = require("./Helper");
const RSS = require("./rss");

class Podcaster {

    static pauseHandler() {
        return PauseHandler;
    }

    static playHandler() {
        return PlayHandler;
    }
    
    static playbackStoppedHandler() {
        return PlaybackStoppedHandler;
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

const PlayHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === "IntentRequest" 
            && request.intent.name === "PlayIntent";
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
            return response.speak("Could not find a podcast for the movie: " + movieRequested)
                .reprompt("Please request another movie")
                .getResponse();
        }
        
        const audioPlayerDirective = {
            "audioItem": {
                "metadata": {
                    "art": {
                        "sources": [
                            {
                                "url": "https://cdn.example.com/url-of-the-skill-image/brie-album-art.png",
                            },
                        ],
                    },
                    "backgroundImage": {
                        "sources": [
                            {
                                "url": "https://cdn.example.com/url-of-the-skill-image/brie-background.png",
                            },
                        ],
                    },
                    "subtitle": podcast.title,
                    "title": podcast.movie,
                },
                "stream": {
                    "offsetInMilliseconds": 0,
                    "token": movieRequested.id,
                    "url": podcast.url,
                },
            },
            "playBehavior": "REPLACE_ALL",
            "type": "AudioPlayer.Play",
        };
         
        podcast.directive = audioPlayerDirective;
        return response.speak("Playing podcast: " + podcast.title)
            .withShouldEndSession(true)
            .addDirective(audioPlayerDirective)
            .getResponse();
    },
};

const PauseHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === "IntentRequest" 
            && request.intent.name === "AMAZON.PauseIntent";
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

const PlaybackStoppedHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === "AudioPlayer.PlaybackStopped";
    },

    async handle(handlerInput) {
        // Grab the last time played
        const podcaster = await Podcaster.instance();
        podcaster.offsetInMilliseconds = handlerInput.requestEnvelope.offsetInMilliseconds;
    },
};

module.exports = Podcaster;