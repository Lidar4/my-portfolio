const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const path = require('path');

const BOT_TOKEN = '8819132197:AAFBGRk-8bRSb2-Dof4nMhDPV9xAQ1Ua_uQ';
const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://xvideos-bot-pszi.onrender.com';

// Express Setup
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bind port immediately for cloud hosting stability
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running smoothly on port ${PORT}`);
});

// Bot Start Command
bot.start((ctx) => {
    ctx.reply('👋 স্বাগতম! যেকোনো ভিডিওর কিওয়ার্ড লিখে সার্চ করুন, আমি দ্রুত ফলাফল খুঁজে দিচ্ছি।');
});

// Search & Scraping Handler
bot.on('text', async (ctx) => {
    const query = ctx.message.text.trim();
    if (!query || query.startsWith('/')) return;

    const searchMsg = await ctx.reply(`🔍 "${query}" খোঁজা হচ্ছে...`);

    try {
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });

        const $ = cheerio.load(data);
        const videos = [];

        $('.mozaique .thumb-block').each((i, element) => {
            if (videos.length >= 5) return;
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

        try { await ctx.telegram.deleteMessage(ctx.chat.id, searchMsg.message_id); } catch (e) {}

        if (videos.length > 0) {
            await ctx.reply(`📂 *"${query}" এর সেরা ফলাফলসমূহ:*`, { parse_mode: 'Markdown' });
            for (const v of videos) {
                const caption = `📌 *${v.title}*\n⏱ সময়: ${v.duration || 'N/A'}`;
                const webAppUrl = `${RENDER_URL}/?v=${encodeURIComponent(v.url)}`;
                const replyMarkup = {
                    inline_keyboard: [
                        [{ text: '🚀 মিনি অ্যাপে ভিডিও দেখুন', web_app: { url: webAppUrl } }]
                    ]
                };

                if (v.image) {
                    try {
                        await ctx.replyWithPhoto(v.image, { caption, parse_mode: 'Markdown', reply_markup: replyMarkup });
                    } catch (err) {
                        await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: replyMarkup });
                    }
                } else {
                    await ctx.reply(caption, { parse_mode: 'Markdown', reply_markup: replyMarkup });
                }
            }
        } else {
            await ctx.reply(`❌ দুঃখিত, কোনো ভিডিও পাওয়া যায়নি। অন্য কিছু দিয়ে চেষ্টা করুন।`);
        }
    } catch (error) {
        console.error('Scraping Error:', error.message);
        try { await ctx.telegram.deleteMessage(ctx.chat.id, searchMsg.message_id); } catch (e) {}
        await ctx.reply('⚠️ সার্ভারে সাময়িক সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
});

bot.launch().then(() => {
    console.log('Telegram bot is active and running!');
}).catch(err => {
    console.error('Bot launch failed:', err);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
