const RSS = require("../lib/rss");

let feed;

module.exports = {
    onTestSuiteStart: async () => {
        // Initialize stuff
        await require("../lib/startup").initialize();
    },

    resolve: async (variable) => {
        // interaction allows seeing any information from the interaction
        // and the parent test and testSuite you need
        if (!feed) {
            const rss = new RSS();
            console.log("FILTER LOADING FEED");
            feed = await rss.fromURL("https://feed.podbean.com/www.classicmoviemusts.com/feed.xml");
        }

        if (variable === "latestEpisode") {
            const episode = feed.podcasts[0].episode;
            console.log("FILTER LATEST EPISODE: " + episode);
            return episode;
        }
    },
};