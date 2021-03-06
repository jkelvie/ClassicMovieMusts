const _ = require("lodash");
const AirtableManager = require("./airtable").instance();
const Alexa = require("ask-sdk");
const Constants = require("./constants");
const Helper = require("./helper");
const Podcaster = require("./podcaster");
const Startup = require("./startup");
        
// Do initialization stuff before anything else
Startup.initialize();
        
/* INTENT HANDLERS */
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        // This is here only for testing purposes
        if (handlerInput.requestEnvelope.forceError) {
            throw "Forcing an error";
        }
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    },
    async handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes[Constants.ATTR_STATE] = Constants.STATE_LAUNCHED;
        attributes[Constants.ATTR_COUNTER] = 0;
        attributes[Constants.ATTR_SCORE] = 0;
    
        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            .speak(Constants.SPEECH_WELCOME)
            .reprompt(Constants.SPEECH_HELP)
            .getResponse();
    },
};

const QuizHandler = {
    canHandle(handlerInput) {
        if (!handlerInput.requestEnvelope.session) {
            return;
        }
        const request = handlerInput.requestEnvelope.request;
        const state = handlerInput.attributesManager.getSessionAttributes()[Constants.ATTR_STATE];
        return request.type === "IntentRequest" 
        && state !== Constants.STATE_ANSWERING // If the user is answering, treat this as an answer
        && _.get(handlerInput, "requestEnvelope.context.AudioPlayer.playerActivity") !== "PLAYING" // If not playing back audio - in case they say start over
        && (request.intent.name === "QuizIntent" 
        || request.intent.name === "AMAZON.YesIntent");
    },

    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const firstQuestion = attributes[Constants.ATTR_STATE] === Constants.STATE_LAUNCHED;
        attributes[Constants.ATTR_STATE] = Constants.STATE_ANSWERING;

        const response = handlerInput.responseBuilder;
    
        let previousQuestions = attributes[Constants.ATTR_PREVIOUS_QUESTIONS];
        if (!previousQuestions) {
            previousQuestions = [];
        }
        
        // Get a random question
        const randomIndex = randomQuestion(previousQuestions);
        previousQuestions.push(randomIndex);
        const question = AirtableManager.question(randomIndex);
    
        // Set question data
        attributes[Constants.ATTR_QUESTION_INDEX] = randomIndex;
        attributes[Constants.ATTR_COUNTER] = attributes[Constants.ATTR_COUNTER] + 1;
        attributes[Constants.ATTR_PREVIOUS_QUESTIONS] = previousQuestions;

        // Save attributes
        handlerInput.attributesManager.setSessionAttributes(attributes);

        // Create spoken output
        let speakOutput = question.question;
        if (firstQuestion) {
            speakOutput = Constants.SPEECH_START_QUIZ + " " + speakOutput;
        }
        const repromptOutput = question.question;

        // Create dynamic entities with the response
        const updateDirectives = Helper.replaceEntityDirective("QUIZ_ANSWER", 
            question.answer,
            question.answer,
            question.synonyms);
        return response.speak(speakOutput)
            .reprompt(repromptOutput)
            .addDirective(updateDirectives)
            .getResponse();
    },
};

const QuizAnswerHandler = {
    canHandle(handlerInput) {
        if (!handlerInput.requestEnvelope.session) {
            return;
        }
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request;

        // Treat any of the custom intents as an attempt to answer the question
        return attributes[Constants.ATTR_STATE] === Constants.STATE_ANSWERING &&
           request.type === "IntentRequest" &&
           (request.intent.name === "AnswerIntent"
           || request.intent.name === "PlayIntent"
           || request.intent.name === "PlayLatestIntent"
           || request.intent.name === "PlayThisIntent"
           || request.intent.name === "QuizIntent");
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes[Constants.ATTR_STATE] = Constants.STATE_MORE;
        const response = handlerInput.responseBuilder;

        let speakOutput = "";
        let repromptOutput = "";
        const questionIndex = attributes[Constants.ATTR_QUESTION_INDEX];
        const question = AirtableManager.question(questionIndex);
    
        let userAnswer; 
        const resolutions = _.get(handlerInput, "requestEnvelope.request.intent.slots.QuizAnswer.resolutions.resolutionsPerAuthority");
        if (resolutions) {
            for (const resolution of resolutions) {
                if (resolution.status.code === "ER_SUCCESS_MATCH") {
                    userAnswer = resolution.values[0].value.name;
                    break;
                }
            }
        }

        if (!userAnswer) {
            userAnswer = _.get(handlerInput, "requestEnvelope.request.intent.slots.QuizAnswer.value");
        }
        const correctAnswer = question.answer;
    
        let isCorrect = false;
        if (userAnswer && userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
            isCorrect = true;
        }

        if (isCorrect) {
            speakOutput = `${getSpeechCon(true)}  ${correctAnswer} is correct.`;
            attributes[Constants.ATTR_SCORE] = attributes[Constants.ATTR_SCORE] + 1;
        } else if (userAnswer) {
            speakOutput = `${getSpeechCon(false)}. ${userAnswer} is not correct. The correct answer is ${correctAnswer}.`;
        } else {
            speakOutput = `${getSpeechCon(false)}. That is not correct. The correct answer is ${correctAnswer}.`;
        }

        // Check if we have more questions
        const maxQuestions = process.env.UNIT_TEST ? 3 : AirtableManager.questionCount();
        const previousQuestions = attributes[Constants.ATTR_PREVIOUS_QUESTIONS];
        if (previousQuestions.length >= maxQuestions) {
            // End the session because there are no more questions
            speakOutput += " " + getFinalScore(attributes);
            speakOutput += " " + Constants.SPEECH_NO_MORE_QUESTIONS;
            return response.speak(speakOutput).withShouldEndSession(true).getResponse();

        } else {
            speakOutput += " " + getCurrentScore(attributes);
            speakOutput += ` Do you want to answer another question? Say yes or no, or say listen to hear episode ${question.episode} on ${question.movie}.`;
            repromptOutput = `Say yes for another question, say no to stop or say listen to hear the episode on ${question.movie}`;
    
            handlerInput.attributesManager.setSessionAttributes(attributes);  
            return response.speak(speakOutput).reprompt(repromptOutput).getResponse();
        }
    },
};

const RepeatHandler = {
    canHandle(handlerInput) {
        if (!handlerInput.requestEnvelope.session) {
            return;
        }
        
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request;

        return attributes[Constants.ATTR_STATE] === Constants.STATE_ANSWERING &&
           request.type === "IntentRequest" &&
           request.intent.name === "AMAZON.RepeatIntent";
    },

    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const questionIndex = attributes[Constants.ATTR_QUESTION_INDEX];
        const question = AirtableManager.question(questionIndex);

        return handlerInput.responseBuilder
            .speak(question.question)
            .reprompt(question.question)
            .getResponse();
    },
};

const HelpHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === "IntentRequest" &&
           request.intent.name === "AMAZON.HelpIntent";
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(Constants.SPEECH_HELP)
            .reprompt(Constants.SPEECH_HELP)
            .getResponse();
    },
};

const EndGameHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === "IntentRequest" && request.intent.name === "AMAZON.NoIntent";
    },
    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const speakOutput = getFinalScore(attributes) + " " + Constants.SPEECH_EXIT_SKILL;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const ExitHandler = {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        if (_.get(handlerInput, "requestEnvelope.context.AudioPlayer.playerActivity") === "PLAYING") {
            // If we are playing audio, don't treat this as an exit
            return false;
        }

        return request.type === "IntentRequest" && (
            request.intent.name === "AMAZON.StopIntent" ||
            request.intent.name === "AMAZON.PauseIntent" ||
            request.intent.name === "AMAZON.CancelIntent"
        );
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak(Constants.SPEECH_EXIT_SKILL)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    },
};

// Last intent to capture anything else that didn't get this
const FallbackIntentHandler = {
    canHandle() {
        return true;
    },

    handle(handlerInput) {
        const intent = _.get(handlerInput, "requestEnvelope.request.intent.name");
        console.log(`FALLBACK handled: Type: ${handlerInput.requestEnvelope.request.type} Intent: ${intent}\nJSON: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder
            .speak("Sorry I did not understand. " + Constants.SPEECH_HELP)
            .reprompt(Constants.SPEECH_HELP)
            .getResponse();        
    }, 
};

const ErrorHandler = {
    canHandle() {
        return true;
    },

    handle(handlerInput, error) {
        const intent = _.get(handlerInput, "requestEnvelope.request.intent.name");
        console.log(`ERROR handled: ${error} Type: ${handlerInput.requestEnvelope.request.type} Intent: ${intent}\n${error.stack}`);
        console.log(`ERROR-JSON ${JSON.stringify(handlerInput.requestEnvelope, null, 2)}`);
        return handlerInput.responseBuilder
            .speak("Sorry I did not understand. " + Constants.SPEECH_HELP)
            .reprompt(Constants.SPEECH_HELP)
            .getResponse();        
    },
};

/* HELPER FUNCTIONS */

function getCurrentScore(attributes) {
    return `Your current score is ${attributes[Constants.ATTR_SCORE]} out of ${attributes[Constants.ATTR_COUNTER]}.`;
}

function getFinalScore(attributes) {
    return `Your final score is ${attributes[Constants.ATTR_SCORE]} out of ${attributes[Constants.ATTR_COUNTER]}.`;
}
function getRandom(min, max) {
    return Math.floor((Math.random() * ((max - min) + 1)) + min);
}

// Recursive function for picking a random function
function randomQuestion(previousQuestions) {
    let random = getRandom(0, AirtableManager.questionCount() - 1);
    if (process.env.UNIT_TEST) {
        random = previousQuestions.length;
    }

    // Keep trying for a question we have not asked, if this one has already been
    if (previousQuestions.indexOf(random) !== -1) {
        return randomQuestion(previousQuestions);
    }
    return random;
}

function getSpeechCon(type) {
    if (type) return `<say-as interpret-as='interjection'>${Constants.SPEECHCONS_CORRECT[getRandom(0, Constants.SPEECHCONS_CORRECT.length - 1)]}! </say-as><break strength='strong'/>`;
    return `<say-as interpret-as='interjection'>${Constants.SPEECHCONS_WRONG[getRandom(0, Constants.SPEECHCONS_WRONG.length - 1)]} </say-as><break strength='strong'/>`;
}

/* LAMBDA SETUP */
const builder = Alexa.SkillBuilders
    .standard()
    .addRequestHandlers(
        EndGameHandler,
        LaunchRequestHandler,
        QuizHandler,
        QuizAnswerHandler,
        RepeatHandler,
        HelpHandler,
        ExitHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withTableName("ClassicMovieMusts")
    .withAutoCreateTable(true)
    .withDynamoDbClient();

// Add all the AudioPlayer handlers
Podcaster.handlers().forEach(handler => builder.addRequestHandlers(handler));

// Add the fallback handler last
builder.addRequestHandlers(FallbackIntentHandler);

// Add console output if we are deployed
if (!process.env.LOCAL) {
    builder.addRequestInterceptors(handlerInput => console.log("REQUEST-JSON:\n" + JSON.stringify(handlerInput.requestEnvelope, null, 2)));
    builder.addResponseInterceptors((handlerInput, response) => console.log("RESPONSE-JSON:\n" + JSON.stringify(response, null, 2)));
}
exports.handler = builder.lambda();
