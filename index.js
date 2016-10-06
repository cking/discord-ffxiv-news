"use strict"

const fetch = require("node-fetch")
const Promise = require("bluebird")
const NeDB = require("nedb")

const lodestone = require("./lib/lodestone-news")

const db = Promise.promisifyAll(new NeDB({ filename: __dirname + "/posted.nedb", autoload: true }))

process.on("uncaughtException", err => console.log("exception...", err))
process.on("unhandledRejection", (err, promise) => console.log("rejection...", err))

const username = process.env.WEBHOOK_USERNAME || "news"
const hook = process.env.WEBHOOK_URL

const messageTemplate = e => `${e.icon} \`[${(new Date(e.ts)).toISOString().split("T").shift()}]\`${e.tag? ` *(${e.tag})*`: ""} **${e.title}**
<${e.url}>${e.img? "\n" + e.img: ""}`

console.log(`Posting to ${hook} as ${username}`)

function newsCheck() {
    Promise.resolve(lodestone.fetchAllNews()) // convert to bluebird promise
    .tap(news => console.log(`found ${news.length} news entries`))
    .filter(newsEntry => db.findAsync({ id: newsEntry.id }).then(doc => !doc.length || !doc[0].posted))
    .tap(news => console.log(`filtered to ${news.length} new entries`))
    .mapSeries(entry => {
        const content = messageTemplate(entry)

        return Promise.resolve(fetch(hook, {
            method: "POST",
            redirect: "follow",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ content, username })
        })) // convert to bluebird promise
        .tap(res => { 
            if (!res.ok || res.status >= 400) throw new Error("Failed to post news entry, got " + res.status)
            console.log(`Posted ${entry.id} (${entry.title})!`) 
        })
        .then(res => db.insert({ id: entry.id, posted: true }))
        .delay(500)
    })
    .catch(err => console.error("err", err))
}

setInterval(newsCheck, 1000 * 60 * 30)
newsCheck()