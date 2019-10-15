const http = require("http");
const https = require("https");
const parser = require("fast-xml-parser");
const url = require("url");

module.exports = class RSS {
    /**
     * Parse an RSS feed from a file
     * @param file
     * @param callback Hands back an error or the file
     */
    async fromURL (rssUrlString) {
        const rssUrl = url.parse(rssUrlString);
        //The url we want is: 'www.random.org/integers/?num=1&min=1&max=10&col=1&base=10&format=plain&rnd=new'
        const options = {
            host: rssUrl.host,
            path: rssUrl.path,
        };
    
        let caller = http;
        if (rssUrl.protocol === "https:") {
            caller = https;
        }
    
        return new Promise((resolve) => {
            const httpCallback = (response) => {
                let payload = "";
        
                //another chunk of data has been recieved, so append it to `str`
                response.on("data", (chunk) => {
                    payload += chunk;
                });
        
                //the whole response has been recieved, so we just print it out here
                response.on("end", () => {
                    //console.log("Contents: " + payload);
                    const result = this.fromString(payload);
                    resolve(result);
                });
            };

            caller.request(options, httpCallback).end();
        });
    }
    
    fromString (xmlString) {
        const json = parser.parse(xmlString, {
            ignoreAttributes: false,
            trimValues: true,
        });
        return this.fromXML(json);
    }
    
    fromXML (xml) {
        //console.log(xml.channel.item.length);
        const results = [];
        //require("fs").writeFileSync("feed.xml", JSON.stringify(xml, null, 2));
        for (const item of xml.rss.channel.item) {
            const entry = {
                description: item.description,
                episode: item["itunes:episode"],
                imageURL: item["itunes:image"]["@_href"],
                title: item.title,
                url: item.enclosure["@_url"],
            };

            if (item.summary !== undefined) {
                entry.summaryAudioUrl = item.summary.$.url;
            }
    
            results.push(entry);
        }
    
        // Post-parse results
        results.forEach((item) => {
            // Get the movie name
            const movieAndYearString = item.title.split(")")[0];
            //console.log(movieAndYearString);
            if (movieAndYearString.indexOf("(") === -1) {
                return;
            }
            const movieAndYear = movieAndYearString.split("(");
            const movie = movieAndYear[0];
            const year = movieAndYear[1].substring(0, 4);
            //console.log("Movie: " + movie + " Year: " + year);
            item.movie = movie.trim();
            item.year = year.trim();
        });
        return { 
            podcasts: results,
        };
    }
};
