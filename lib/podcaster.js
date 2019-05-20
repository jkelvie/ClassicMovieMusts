const _ = require("lodash");
const Helper = require("./Helper");
const RSS = require("./rss");

module.exports = class Podcaster {

    static playHandler() {
        return PlayHandler;
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
    
};

const PlayHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;

        return request.type === "IntentRequest" 
            && request.intent.name === "PlayIntent";
    },

    handle(handlerInput) {
        let movieRequested = Helper.getMatchedSlotValueName(handlerInput, "MovieName");
        const response = handlerInput.responseBuilder;
    
        if(!movieRequested) {
            movieRequested = _.get(handlerInput, "requestEnvelope.request.intent.slots.QuizAnswer.value");
            return response.speak("Could not find movie: " + movieRequested)
                .reprompt("Please request another movie")
                .getResponse();
        } else {
            return response.speak("Requested movie: " + movieRequested).getResponse();
        }
    },
};