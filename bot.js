const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const cheerio = require('cheerio');

const bot = new Telegraf('8819132197:AAFBGRk-8bRSb2-Dof4nMhDPV9xAQ1Ua_uQ');
let adminId = null;

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
        'যেকোনো ক্যাটাগরি বা কিওয়ার্ড (যেমন: HD, Bangla, Amateur ইত্যাদি) লিখে সার্চ করুন। এটি প্রতিবার একদম নতুন ও ভিন্ন ভিন্ন ভিডিওর তালিকা ও থাম্বনেইল নিয়ে আসবে।',
        { parse_mode: 'Markdown' }
    );
});

bot.on('text', async (ctx) => {
    const query = ctx.message.text.trim();
    if (!query || query.startsWith('/')) return;

    const searchMsg = await ctx.reply(`🔍 "${query}" এর রিয়েল-টাইম রেজাল্ট খোঁজা হচ্ছে...`);

    try {
        // সরাসরি ওয়েবসাইট থেকে পেজ ফেচ করা যাতে ক্যাশ বা রিপিট প্রবলেম না থাকে
        const searchUrl = `https://www.xvideos.com/?k=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(data);
        const videos = [];

        // পেজ থেকে ভিডিওর টাইটেল, থাম্বনেইল, লিংক এবং ডিউরেশন আলাদা করা
        $('.mozaique .thumb-block').each((i, element) => {
            if (videos.length >= 5) return; // সর্বোচ্চ ৫টি ভিন্ন ভিডিও নেব

            const titleElem = $(element).find('.title a');
            const title = titleElem.attr('title') || titleElem.text().trim();
            let relativeUrl = titleElem.attr('href');
            const url = relativeUrl ? `https://www.xvideos.com${relativeUrl}` : null;
            
            // থাম্বনেইল ইমেজ সংগ্রহ
            const imgElem = $(element).find('img');
            const image = imgElem.attr('data-src') || imgElem.attr('src');
            
            // ডিউরেশন সংগ্রহ
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

    } catch (error) {
        console.error('Scraping Error:', error);
        await ctx.reply('⚠️ সার্চ করার সময় একটি সমস্যা হয়েছে।');
    }
});

bot.launch();
console.log('🚀 Web Scraping Search Engine Bot is fully running!');
