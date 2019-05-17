/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */

// IMPORTANT: Please note that this template uses Dispay Directives,
// Display Interface for your skill should be enabled through the Amazon developer console
// See this screenshot - https://alexa.design/enabledisplay

const AirtableManager = require("./airtable").instance();
const Alexa = require("ask-sdk");
const Constants = require("./constants")

/* INTENT HANDLERS */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === `LaunchRequest`;
  },
  async handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    attributes[Constants.ATTR_STATE] = Constants.STATE_NEW;
    attributes[Constants.ATTR_COUNTER] = 0;
    attributes[Constants.ATTR_SCORE] = 0;
    
    await AirtableManager.loadQuestions();

    handlerInput.attributesManager.setSessionAttributes(attributes);

    return handlerInput.responseBuilder
      .speak(Constants.SPEECH_WELCOME)
      .reprompt(Constants.SPEECH_HELP)
      .getResponse();
  },
};

const QuizHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === "IntentRequest" &&
        (request.intent.name === "QuizIntent" 
        || request.intent.name === "AMAZON.StartOverIntent"
        || request.intent.name === "AMAZON.YesIntent");
  },

  handle(handlerInput) {
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const firstQuestion = attributes[Constants.ATTR_STATE] === Constants.STATE_NEW;
    attributes[Constants.ATTR_STATE] = Constants.STATE_QUIZ;
    console.log("Inside QuizHandler");
  
    const response = handlerInput.responseBuilder;
    
    let question = askQuestion(handlerInput);
    let speakOutput = question.question;
    if (firstQuestion) {
      speakOutput = Constants.SPEECH_START_QUIZ + " " + speakOutput;
    }
    let repromptOutput = question.question;
    return response.speak(speakOutput)
                   .reprompt(repromptOutput)
                   .getResponse();
  },
};

const QuizAnswerHandler = {
  canHandle(handlerInput) {
    console.log("Inside QuizAnswerHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return (attributes[Constants.ATTR_STATE] === Constants.STATE_QUIZ &&
           request.type === "IntentRequest" &&
           request.intent.name === "AnswerIntent");
  },
  handle(handlerInput) {
    console.log("Inside QuizAnswerHandler - handle");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const response = handlerInput.responseBuilder;

    let speakOutput = ``;
    let repromptOutput = ``;
    const questionIndex = attributes[Constants.ATTR_QUESTION_INDEX];
    const question = AirtableManager.question(questionIndex);
    
    const userAnswer = handlerInput.requestEnvelope.request.intent.slots.QuizAnswer.value;
    const correctAnswer = question.answer;
    
    let isCorrect = false;
    if (userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
      isCorrect = true;
    }

    if (isCorrect) {
      speakOutput = `${getSpeechCon(true)}  ${correctAnswer} is correct.`;
      attributes[Constants.ATTR_SCORE] = attributes[Constants.ATTR_SCORE] + 1;
    } else {
      speakOutput = `${getSpeechCon(false)} ${userAnswer} is not correct. The correct answer is ${correctAnswer}.`;
    }

    //IF YOUR QUESTION COUNT IS LESS THAN 10, WE NEED TO ASK ANOTHER QUESTION.
    speakOutput += " " + getCurrentScore(attributes);
    speakOutput += " Do you want to answer another question?";
    repromptOutput = "Do you want to answer another question?";

    handlerInput.attributesManager.setSessionAttributes(attributes);  
    return response.speak(speakOutput).getResponse();
  },
};

const RepeatHandler = {
  canHandle(handlerInput) {
    console.log("Inside RepeatHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return attributes[Constants.ATTR_STATE] === Constants.STATE_QUIZ &&
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
    const speakOutput = getFinalScore(attributes) + Constants.SPEECH_EXIT_SKILL;
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    console.log("Inside ExitHandler");
    const attributes = handlerInput.attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request;

    return request.type === "IntentRequest" && (
              request.intent.name === "AMAZON.StopIntent" ||
              request.intent.name === "AMAZON.PauseIntent" ||
              request.intent.name === "AMAZON.CancelIntent"
           );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(exitSkillMessage)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    console.log("Inside SessionEndedRequestHandler");
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
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
      .speak(helpMessage)
      .reprompt(helpMessage)
      .getResponse();
  },
};

/* CONSTANTS */
const imagePath = "https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/state_flag/{0}x{1}/{2}._TTH_.png";
const backgroundImagePath = "https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/state_flag/{0}x{1}/{2}._TTH_.png"
const speechConsCorrect = ['Booya', 'All righty', 'Bam', 'Bazinga', 'Bingo', 'Boom', 'Bravo', 'Cha Ching', 'Cheers', 'Dynomite', 'Hip hip hooray', 'Hurrah', 'Hurray', 'Huzzah', 'Oh dear.  Just kidding.  Hurray', 'Kaboom', 'Kaching', 'Oh snap', 'Phew','Righto', 'Way to go', 'Well done', 'Whee', 'Woo hoo', 'Yay', 'Wowza', 'Yowsa'];
const speechConsWrong = ['Argh', 'Aw man', 'Blarg', 'Blast', 'Boo', 'Bummer', 'Darn', "D'oh", 'Dun dun dun', 'Eek', 'Honk', 'Le sigh', 'Mamma mia', 'Oh boy', 'Oh dear', 'Oof', 'Ouch', 'Ruh roh', 'Shucks', 'Uh oh', 'Wah wah', 'Whoops a daisy', 'Yikes'];

const useCardsFlag = true;

/* HELPER FUNCTIONS */

// returns true if the skill is running on a device with a display (show|spot)
function supportsDisplay(handlerInput) {
  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display
  return hasDisplay;
}

function getBadAnswer(item) {
  return `I'm sorry. ${item} is not something I know very much about in this skill. ${helpMessage}`;
}

function getCurrentScore(attributes) {
  return `Your current score is ${attributes[Constants.ATTR_SCORE]} out of ${attributes[Constants.ATTR_COUNTER]}. `;
}

function getFinalScore(attributes) {
  return `Your final score is ${attributes[Constants.ATTR_SCORE]} out of ${attributes[Constants.ATTR_COUNTER]}. `;
}

function getCardTitle(item) {
  return item.StateName;
}

function getSmallImage(item) {
  return `https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/state_flag/720x400/${item.Abbreviation}._TTH_.png`;
}

function getLargeImage(item) {
  return `https://m.media-amazon.com/images/G/01/mobile-apps/dex/alexa/alexa-skills-kit/tutorials/quiz-game/state_flag/1200x800/${item.Abbreviation}._TTH_.png`;
}

function getImage(height, width, label) {
  return imagePath.replace("{0}", height)
    .replace("{1}", width)
    .replace("{2}", label);
}

function getBackgroundImage(label, height = 1024, width = 600) {
  return backgroundImagePath.replace("{0}", height)
    .replace("{1}", width)
    .replace("{2}", label);
}

function getSpeechDescription(item) {
  return `${item.StateName} is the ${item.StatehoodOrder}th state, admitted to the Union in ${item.StatehoodYear}.  The capital of ${item.StateName} is ${item.Capital}, and the abbreviation for ${item.StateName} is <break strength='strong'/><say-as interpret-as='spell-out'>${item.Abbreviation}</say-as>.  I've added ${item.StateName} to your Alexa app.  Which other state or capital would you like to know about?`;
}

function formatCasing(key) {
  return key.split(/(?=[A-Z])/).join(' ');
}

function getQuestion(question) {
  return `${item.question}`;
}

function getAnswer(property, item) {
  return `The answer is ${item.answer} `;
}

function getRandom(min, max) {
  return Math.floor((Math.random() * ((max - min) + 1)) + min);
}

function askQuestion(handlerInput) {
  //GET SESSION ATTRIBUTES
  const attributes = handlerInput.attributesManager.getSessionAttributes();

  let previousQuestions = attributes[Constants.ATTR_PREVIOUS_QUESTIONS];
  if (!previousQuestions) {
    previousQuestions = [];
  }
  console.log("I am in askQuestion()");
  //GENERATING THE RANDOM QUESTION FROM DATA
  const randomIndex = randomQuestion(previousQuestions);
  previousQuestions.push(randomIndex);
  const question = AirtableManager.question(randomIndex);
  
  //SET QUESTION DATA TO ATTRIBUTES
  attributes[Constants.ATTR_QUESTION_INDEX] = randomIndex;
  attributes[Constants.ATTR_COUNTER] = attributes[Constants.ATTR_COUNTER] + 1;
  attributes[Constants.ATTR_PREVIOUS_QUESTIONS] = previousQuestions;

  //SAVE ATTRIBUTES
  handlerInput.attributesManager.setSessionAttributes(attributes);
  return question;
}

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

function compareSlots(slots, value) {
  for (const slot in slots) {
    if (Object.prototype.hasOwnProperty.call(slots, slot) && slots[slot].value !== undefined) {
      if (slots[slot].value.toString().toLowerCase() === value.toString().toLowerCase()) {
        return true;
      }
    }
  }

  return false;
}

function getSpeechCon(type) {
  if (type) return `<say-as interpret-as='interjection'>${speechConsCorrect[getRandom(0, speechConsCorrect.length - 1)]}! </say-as><break strength='strong'/>`;
  return `<say-as interpret-as='interjection'>${speechConsWrong[getRandom(0, speechConsWrong.length - 1)]} </say-as><break strength='strong'/>`;
}


/* LAMBDA SETUP */
exports.handler = Alexa.SkillBuilders
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
  .withDynamoDbClient()
  .lambda();
