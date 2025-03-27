const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

app.post('/webhook', async (req, res) => {
    const data = req.body;

    if (data.object === 'page') {
        data.entry.forEach(async (entry) => {
            const messagingEvent = entry.messaging[0];
            if (messagingEvent.message) {
                const senderId = messagingEvent.sender.id;
                const messageText = messagingEvent.message.text;

                console.log(`Saņemts ziņojums no ${senderId}: ${messageText}`);

                const aiResponse = await getAIResponse(messageText);

                sendMessage(senderId, aiResponse);
            }
        });
    }

    res.sendStatus(200);
});

async function getAIResponse(userMessage) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: userMessage }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Kļūda, izsaucot OpenAI API:', error);
        return 'Atvainojiet, radās problēma, mēģiniet vēlreiz!';
    }
}

function sendMessage(senderId, messageText) {
    axios.post(
        `https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
            recipient: { id: senderId },
            message: { text: messageText }
        },
        {
            headers: { 'Content-Type': 'application/json' }
        }
    ).catch(error => console.error('Kļūda, sūtot ziņu:', error));
}

app.listen(port, () => {
    console.log(`Serveris darbojas uz http://localhost:${port}`);
});
