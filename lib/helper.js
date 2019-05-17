module.exports = class Helper {
    static attributes(handlerInput) {
        const attributes = handlerInput.attributesManager.getAttributes();
        handlerInput.attributesManager.setSessionAttributes(attributes);
        handlerInput.attributesManager.setPersistentAttributes(attributes);
        return handlerInput.attributesManager.savePersistentAttributes();
    }
}