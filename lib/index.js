const _ = require("lodash");
const AirtableManager = require("./airtable").instance();
const Alexa = require("ask-sdk");
const Constants = require("./constants");
const Helper = require("./helper");
const Podcaster = require("./podcaster");

require("aws-sdk").config.update({
    region: "us-east-1",
});

/* INTENT HANDLERS */
const LaunchRequestHandler = {
    canHandle(handlerInput) {
        console.log("RequestType: " + handlerInput.requestEnvelope.request.type);
        return handlerInput.requestEnvelope.request.type === "LaunchRequest";
    },
    async handle(handlerInput) {
        console.log("Inside LaunchRequestHandler");

        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes[Constants.ATTR_STATE] = Constants.STATE_LAUNCHED;
        attributes[Constants.ATTR_COUNTER] = 0;
        attributes[Constants.ATTR_SCORE] = 0;
    
        await AirtableManager.loadQuestions();
        const podcaster = await Podcaster.instance();
        handlerInput.attributesManager.setSessionAttributes(attributes);

        return handlerInput.responseBuilder
            .speak(Constants.SPEECH_WELCOME)
            .reprompt(Constants.SPEECH_HELP)
            .addDirective(podcaster.movieNameDirective())
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
        && (request.intent.name === "QuizIntent" 
        || request.intent.name === "AMAZON.StartOverIntent"
        || request.intent.name === "AMAZON.YesIntent");
    },

    handle(handlerInput) {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const firstQuestion = attributes[Constants.ATTR_STATE] === Constants.STATE_LAUNCHED;
        attributes[Constants.ATTR_STATE] = Constants.STATE_ANSWERING;
        console.log("Inside QuizHandler");
  
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
        
        console.log("Inside QuizAnswerHandler");
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request;

        return attributes[Constants.ATTR_STATE] === Constants.STATE_ANSWERING &&
           request.type === "IntentRequest" &&
           (request.intent.name === "AnswerIntent"
           || request.intent.name === "QuizIntent");
    },
    handle(handlerInput) {
        console.log("Inside QuizAnswerHandler - handle");
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        attributes[Constants.ATTR_STATE] = Constants.STATE_MORE;
        const response = handlerInput.responseBuilder;

        let speakOutput = "";
        let repromptOutput = "";
        const questionIndex = attributes[Constants.ATTR_QUESTION_INDEX];
        const question = AirtableManager.question(questionIndex);
    
        let userAnswer = _.get(handlerInput, "requestEnvelope.request.intent.slots.QuizAnswer.resolutions.resolutionsPerAuthority[0].values[0].value.name");
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
            speakOutput += " Do you want to answer another question?";
            repromptOutput = "Do you want to answer another question?";
    
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
        
        console.log("Inside RepeatHandler");
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request;

        return attributes[Constants.ATTR_STATE] === Constants.STATE_ANSWERING &&
           request.type === "IntentRequest" &&
           request.intent.name === "AMAZON.RepeatIntent";
    },

    handle(handlerInput) {
        console.log("Inside RepeatHandler - handle");
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
        console.log("Inside HelpHandler");
        const request = handlerInput.requestEnvelope.request;
        return request.type === "IntentRequest" &&
           request.intent.name === "AMAZON.HelpIntent";
    },
    handle(handlerInput) {
        console.log("Inside HelpHandler - handle");
        return handlerInput.responseBuilder
            .speak(Constants.SPEECH_HELP)
            .reprompt(Constants.SPEECH_HELP)
            .getResponse();
    },
};

const EndGameHandler = {
    canHandle(handlerInput) {
        console.log("Inside EndGameHandler");
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
        console.log("Inside ExitHandler");
        const request = handlerInput.requestEnvelope.request;

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
        console.log("Inside SessionEndedRequestHandler");
        return handlerInput.requestEnvelope.request.type === "SessionEndedRequest";
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        console.log("Inside ErrorHandler");
        return true;
    },
    handle(handlerInput, error) {
    //console.log("Inside ErrorHandler - handle");
        console.log("Error handled: " + error + "\n" + error.stack);
        //console.log(`Handler Input: ${JSON.stringify(handlerInput)}`);

        return handlerInput.responseBuilder
            .speak(Constants.SPEECH_HELP)
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
exports.handler = Alexa.SkillBuilders
    .standard()
    .addRequestHandlers(
        EndGameHandler,
        LaunchRequestHandler,
        Podcaster.playHandler(),
        Podcaster.pauseHandler(),
        Podcaster.playbackStoppedHandler(),
        QuizHandler,
        QuizAnswerHandler,
        RepeatHandler,
        Podcaster.resumeHandler(),
        HelpHandler,
        ExitHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withTableName("ClassicMovieMusts")
    .withAutoCreateTable(true)
    .withDynamoDbClient()
    .lambda();
