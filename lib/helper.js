module.exports = {
    replaceEntityDirective: (slotyType, slotId, value, synonyms) => {
        // Remove spaces in slot id or it is not valid
        slotId = slotId.split(" ").join("");
        const replaceEntityDirective = {
            type: "Dialog.UpdateDynamicEntities",
            types: [
                {
                    name: slotyType,
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