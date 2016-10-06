"use strict"

const fetch = require("node-fetch")
const cheerio = require("cheerio")

const BASE_URL = "http://eu.finalfantasyxiv.com"

const ENDPOINTS = {
    TOPICS: {
        url: "/lodestone/topics/",
        icon: "★",

        list: ".news__content__list__topics",
    },
    NOTICES: {
        url: "/lodestone/news/category/1",
        icon: "🛈",

        list: ".news__content__list",
    },
    MAINT: {
        url: "/lodestone/news/category/2",
        icon: "🔧",

        list: ".news__content__list",
    },
    UPDATE: {
        url: "/lodestone/news/category/3",
        icon: "↻",

        list: ".news__content__list",
    },
    STATUS: {
        url: "/lodestone/news/category/4",
        icon: "⚠",

        list: ".news__content__list",
    },
}

exports.fetchAllNews = function fetchAllNews() {
    return Promise.all(Object.keys(ENDPOINTS).map(ep => exports.fetchNews(ep))).then(newsArray => newsArray.shift().concat(...newsArray).sort((a, b) => b.ts - a.ts))
}

exports.fetchNews = function fetchNews(endpoint) {
    if (!endpoint) endpoint = "TOPICS"
    if (!ENDPOINTS[endpoint.toUpperCase()]) throw new Error(`endpoint ${endpoint} not found, please use one of ${Object.keys(ENDPOINTS).join(", ")}`)

    const { url, icon, list } = ENDPOINTS[endpoint.toUpperCase()]

    return fetch(BASE_URL + url).then(res => res.text()).then(page => {
        const $ = cheerio.load(page)

        const listEntries = $("li", list)

        return listEntries.map((idx, el) => {
            const $el = $(el)
            const a = $el.find("a").first()
            const href = a.attr("href")

            return {
                id: href.match(/[^/]+$/)[0],
                url: BASE_URL + href,
                icon,
                title: a.text(),
                ts: $el.find("script").text().match(/ldst_strftime\((\d+)./)[1] * 1000,
                img: $el.find("img").attr("src"),
                tag: $el.find(".tag").text().replace(/^\[(.*)\]$/, "$1"),
            }
        }).get()
    })
}