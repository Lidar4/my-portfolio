const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');

const BOT_TOKEN = '8819132197:AAFBGRk-8bRSb2-Dof4nMhDPV9xAQ1Ua_uQ';
const bot = new Telegraf(BOT_TOKEN);
const app = express();
const PORT = process.env.PORT || 3000;

// Render-এর পোর্ট রিকোয়েস্ট পূরণের জন্য সিম্পল সার্ভার
app.get('/', (req, res) => {
    res.send('Bot is running successfully!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});

bot.start((ctx) => {
    ctx.reply('🌟 সার্চ ইঞ্জিন সক্রিয় আছে। যেকোনো কিওয়ার্ড লিখে সার্চ করুন।');
});

bot.on('text', async (ctx) => {
    const query = ctx.message.text.trim();
    if (!query || query.startsWith('/')) return;

    const searchMsg = await ctx.reply(`🔍 "${query}" খোঁজা হচ্ছে...`);

    try {
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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
            await ctx.reply(`📂 *"${query}" এর ফলাফল:*`, { parse_mode: 'Markdown' });
            for (const v of videos) {
                const caption = `📌 *${v.title}*\n⏱ সময়: ${v.duration || 'N/A'}`;
                const replyMarkup = {
                    inline_keyboard: [
                        [{ text: '▶️ সরাসরি ভিডিও দেখুন', url: v.url }]
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
            await ctx.reply(`❌ কোনো ভিডিও পাওয়া যায়নি।`);
        }
    } catch (error) {
        console.error('Error:', error);
        await ctx.reply('⚠️ সমস্যা হয়েছে।');
    }
});

bot.launch();
console.log('Bot is running!');
