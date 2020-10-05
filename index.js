const express = require('express');
const bodyParser = require('body-parser');
const rateLimit = require("express-rate-limit");
const axios = require('axios');
const config = require('config');
const app = express();
const port = process.env.PORT || config.app.port;
var repoName = null; 

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 60 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(bodyParser.json());
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

const dbUrl = process.env.DB_URL || "http://localhost:8086";

app.get('/ping', (req, res) => res.json({"message": "pong"}));

app.post('/api/pr', async (req, res) => {
    console.log(req.body);
    const {name, pr_link: prLink, language, isFirstPR} = req.body;

    if (!prLink || !language) {
        res.status(400).json({"message": "wrong data"});
        return
    }

    try {
        const prUrl = new URL(prLink);
        repoName = prUrl.pathname.split('/')[2];
        if (!config.hosts.includes(prUrl.host)) {
            console.log(prUrl)
            throw Error("not github.com");
        }

        await axios({
            method: 'head',
            url: prLink
        })
    } catch (e) {
        console.log(e);
        res.status(400).json({"message": "wrong PR URL"});
        return;
    }

    const body = `pull_request,pr_link=${prLink.trim().replace(/ +/g, "-")},language=${language.trim().replace(/ +/g, "-")},repoName=${repoName},isFirstPR=${isFirstPR},name=${name} value=1`;

    const url = `${dbUrl}/write?db=hacktober_metrics`;
    console.log(`Sending request to: ${url}`);
    try {
        await axios({
            method: 'post',
            url,
            data: body,
        });
        res.sendStatus(204)
    } catch (e) {
        console.log(e);
        res.sendStatus(500)
    }
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
