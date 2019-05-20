const RSS = require("../lib/RSS");

describe("rss", () => {
    test("parse classic movie musts", async () => {
        const rss = new RSS();
        const feed = await rss.fromURL("https://feed.podbean.com/www.classicmoviemusts.com/feed.xml");
        const results = feed.podcasts;
        expect(results.length).toBe(64);
        const chinatown = results.find(episode => episode.episode === 63);
        expect(chinatown).toBeDefined();
        expect(chinatown.movie).toBe("Chinatown");
        expect(chinatown.year).toBe("1974");
        expect(chinatown.url).toBe("https://mcdn.podbean.com/mf/web/88ex2j/Chinatown_1974_Ep_63.mp3");
        
    });
});