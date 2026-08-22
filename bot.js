const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const path = require('path');

const bot = new Telegraf('8819132197:AAFBGRk-8bRSb2-Dof4nMhDPV9xAQ1Ua_uQ');
const app = express();
const PORT = process.env.PORT || 3000;
let adminId = null;

// স্ট্যাটিক ফোল্ডার হিসেবে public ফোল্ডার চালু করা
app.use(express.static(path.join(__dirname, 'public')));

// স্ক্র্যাপিং এপিআই রাউট (মিনি অ্যাপের জন্য)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json([]);

    try {
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const $ = cheerio.load(data);
        const videos = [];

        $('.mozaique .thumb-block').each((i, element) => {
            if (videos.length >= 6) return;
            const titleElem = $(element).find('.title a');
            const title = titleElem.attr('title') || titleElem.text().trim();
            let relativeUrl = titleElem.attr('href');
            const url = relativeUrl ? `https://www.xvideos.com${relativeUrl}` : null;
            const imgElem = $(element).find('img');
            const image = imgElem.attr('data-src') || imgElem.attr('src');
            const duration = $(element).find('.duration').text().trim();

            if (title && url) {
                videos.push({ title, url, image, duration });
            }
        });
        res.json(videos);
    } catch (error) {
        res.status(500).json({ error: 'Scraping failed' });
    }
});

// এক্সপ্রেস সার্ভার চালু করা
app.listen(PORT, () => {
    console.log(`🌍 Mini App Server is running on port ${PORT}`);
});

// টেলিগ্রাম বট কমান্ড ও মিনি অ্যাপ বাটন
bot.start((ctx) => {
    ctx.reply(
        '🌟 *রিয়েল-টাইম মিনি অ্যাপ সার্চ ইঞ্জিনে স্বাগতম!*\n\nনিচের বাটনে ক্লিক করে মিনি অ্যাপ ওপেন করুন:',
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🚀 মিনি অ্যাপ ওপেন করুন', web_app: { url: `https://${process.env.RENDER_EXTERNAL_URL ? new URL(process.env.RENDER_EXTERNAL_URL).host : 'localhost:3000'}` } }]
                ]
            }
        }
    );
});

bot.launch();
console.log('🚀 Telegram Mini App Bot is fully running!');
