const _ = require("lodash");

module.exports = {
    matchedSlotValue(handlerInput, slotName) {
        const resolutions = _.get(handlerInput, `requestEnvelope.request.intent.slots.${slotName}.resolutions.resolutionsPerAuthority`);
        if (resolutions) {   
            for (const resolution of resolutions) {
                if (resolution.status.code === "ER_SUCCESS_MATCH") {
                    return resolution.values[0].value;
                }
            }
        }
        return undefined;
    },
    
    replaceEntityDirective: (slotType, slotId, value, synonyms) => {
        // Remove spaces in slot id or it is not valid
        slotId = slotId.split(" ").join("");
        const replaceEntityDirective = {
            type: "Dialog.UpdateDynamicEntities",
            types: [
                {
                    name: slotType,
                    values: [
                        {
                            id: slotId,
                            name: {
                                synonyms: synonyms,
                                value: value,
                            },
                        },
                    ],
                },
            ],
            updateBehavior: "REPLACE",
        };
        return replaceEntityDirective;
    },
};