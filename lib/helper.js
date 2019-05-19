module.exports = {
    replaceEntityDirective: (slotyType, slotId, value, synonyms) => {
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