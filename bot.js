const { Telegraf } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');
const http = require('http');

const bot = new Telegraf('8819132197:AAFBGRk-8bRSb2-Dof4nMhDPV9xAQ1Ua_uQ');
let adminId = null;

// রেন্ডার বা ক্লাউড সার্ভারের জন্য একটি ডামি পোর্ট সার্ভার (যাতে বট ২৪ ঘণ্টা লাইভ থাকে)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!\n');
}).listen(PORT, () => {
    console.log(`🌍 Web server is listening on port ${PORT}`);
});

console.log('🌐 Direct Web Scraping Search Engine is starting...');

bot.use((ctx, next) => {
    const userId = ctx.from?.id;
    if (!adminId) {
        adminId = userId;
    }
    if (userId !== adminId) {
        return ctx.reply('⛔ এই সার্চ ইঞ্জিনের এক্সেস শুধু মূল অ্যাডমিনের জন্য সুরক্ষিত।');
    }
    return next();
});

bot.start((ctx) => {
    ctx.reply(
        '🌟 *রিয়েল-টাইম ডাইনামিক সার্চ ইঞ্জিন সক্রিয় আছে।*\n\n' +
        'যেকোনো ক্যাটাগরি বা কিওয়ার্ড লিখে সার্চ করুন। এটি একদম নতুন ও ভিন্ন ভিন্ন ভিডিওর তালিকা ও থাম্বনেইল নিয়ে আসবে।',
        { parse_mode: 'Markdown' }
    );
});

bot.on('text', async (ctx) => {
    const query = ctx.message.text.trim();
    if (!query || query.startsWith('/')) return;

    const searchMsg = await ctx.reply(`🔍 "${query}" এর রিয়েল-টাইম রেজাল্ট খোঁজা হচ্ছে...`);

    try {
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
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
            await ctx.reply(`📂 *"${query}" এর জন্য ক্যাটাগরি অনুযায়ী ভিন্ন ভিন্ন ফলাফল:*`);
            for (const v of videos) {
                const caption = `📌 *${v.title}*\n⏱ সময়: ${v.duration || 'N/A'}\n🔗 [ভিডিও প্লে করুন](${v.url})`;
                if (v.image) {
                    try {
                        await ctx.replyWithPhoto(v.image, { caption, parse_mode: 'Markdown' });
                    } catch (err) {
                        await ctx.reply(caption, { parse_mode: 'Markdown' });
                    }
                } else {
                    await ctx.reply(caption, { parse_mode: 'Markdown' });
                }
            }
        } else {
            await ctx.reply(`❌ "${query}" এর জন্য কোনো ভিডিও পাওয়া যায়নি।`);
        }

    }     catch (error) {
        console.error('Scraping Error:', error);
        await ctx.reply('⚠️ সার্চ করার সময় একটি সমস্যা হয়েছে।');
    }
});

bot.launch();
console.log('🚀 Web Scraping Search Engine Bot is fully running!');
