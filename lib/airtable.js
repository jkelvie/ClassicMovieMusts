const Airtable = require("airtable");

require("dotenv").config();
const base = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base("appzphXfDwo7y7xhm");

module.exports = class AirtableManager {
    static instance() {
        if (!AirtableManager.SINGLETON) {
            AirtableManager.SINGLETON = new AirtableManager();
        }
        return AirtableManager.SINGLETON;
    }

    constructor() {
        this.questions = undefined;
    }

    questionCount() {
        return this.questions.length;
    }

    question(index) {
        return this.questions[index];
    }

    async loadQuestions() {
        // If we have not loaded the questions yet, force an await for the load
        // Otherwise just return what we have on hand
        if (!this.questions) {
            await this.loadQuestionsImpl();
        }
        return this.questions;
    }

    async loadQuestionsImpl() {
        const records = await base("Questions").select({
            // Selecting the first 3 records in Grid view:
            maxRecords: 100,
            view: "Grid view",
        }).all();
        const questions = [];
        for (const record of records) {
            const synonymString = record.get("Synonyms");
            
            // Parse the synonyms
            let synonyms = [];
            if (synonymString) {
                synonyms = synonymString.split(",");
                synonyms = synonyms.map(value => value.trim());
            }

            const question = {
                answer: record.get("Answer"),
                episode: record.get("Episode"),
                movie: record.get("Movie"),
                question: record.get("Question"),
                synonyms: synonyms,
            };
            questions.push(question);
        }
        // console.log("Answers: " + JSON.stringify(answers, null, 2));
        this.questions = questions;
    }

};
