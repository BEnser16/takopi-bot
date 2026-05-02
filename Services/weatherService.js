const cron = require('node-cron');

const TAIPEI_LAT = '25.0330';
const TAIPEI_LON = '121.5654';

/** @type {{ min: number, message: string }[]} */
const wearMap = [
    { min: 25, message: '短袖、注意防曬。' },
    { min: 15, message: '薄長袖、防風外套。' },
    { min: -99, message: '發熱衣、厚大衣。' },
];

/** @type {{ threshold: number, message: string }[]} */
const popMap = [
    { threshold: 0.8, message: '外面看起來快淹水了，一定要帶傘並注意交通安全！' },
    { threshold: 0.5, message: '哎呀，今天好像很有機會下雨呢，出門記得帶把傘喔...' },
    { threshold: 0.2, message: '雲量好像有點多，不放心的話可以帶把小折疊傘備用。' },
    { threshold: 0, message: '今天天氣不錯，看起來不太會下雨，放心出門吧！' },
];

function wearForTemp(tempC) {
    const sorted = [...wearMap].sort((a, b) => b.min - a.min);
    const hit = sorted.find((row) => tempC >= row.min);
    return hit ? hit.message : wearMap[wearMap.length - 1].message;
}

function rainDescForPop(pop01) {
    const sorted = [...popMap].sort((a, b) => b.threshold - a.threshold);
    const hit = sorted.find((row) => pop01 >= row.threshold);
    return hit ? hit.message : popMap[popMap.length - 1].message;
}

async function fetchOpenWeatherMap() {
    const key = process.env.OPENWEATHERMAP_API_KEY;
    if (!key) {
        throw new Error('OPENWEATHERMAP_API_KEY is not set');
    }
    const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
    url.searchParams.set('lat', TAIPEI_LAT);
    url.searchParams.set('lon', TAIPEI_LON);
    url.searchParams.set('appid', key);
    url.searchParams.set('lang', 'zh_tw');
    url.searchParams.set('units', 'metric');

    const res = await fetch(url);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenWeatherMap HTTP ${res.status}: ${text}`);
    }
    return res.json();
}

function parseWeatherResponse(data) {
    const item = data?.list?.[0];
    if (!item) {
        throw new Error('OpenWeatherMap response missing list[0]');
    }
    const temp = item.main.temp;
    const feelsTemp = item.main.feels_like;
    const humidity = item.main.humidity;
    const pop = item.pop ?? 0;

    const wear = wearForTemp(temp);
    const rain_desc = rainDescForPop(pop);

    const popPct = Math.round(pop * 100);

    return [
        '☀️ 大家早安嗶!',
        `收到今天的天氣預報啦~ ${rain_desc}`,
        '城市: 🌆 台北',
        `氣溫: ${temp}°C`,
        `體感溫度: ${feelsTemp}°C`,
        `濕度: ${humidity}%`,
        `降雨: ${popPct}%`,
        `建議穿搭: ${wear}`,
    ].join('\n');
}

async function sendWeatherReport(client) {
    const channelId = process.env.WEATHER_CHANNEL_ID;
    if (!channelId) {
        console.error('[weather] WEATHER_CHANNEL_ID is not set; skip send');
        return;
    }

    let channel = client.channels.cache.get(channelId);
    if (!channel) {
        try {
            channel = await client.channels.fetch(channelId);
        } catch (e) {
            console.error('[weather] failed to fetch channel:', e);
            return;
        }
    }

    try {
        const data = await fetchOpenWeatherMap();
        const text = parseWeatherResponse(data);
        await channel.send(text);
    } catch (err) {
        console.error('[weather] cron/send failed:', err);
    }
}

function dailyWeatherCronJob(client) {
    cron.schedule(
        '0 7 * * *',
        () => {
            sendWeatherReport(client);
        },
        { timezone: 'Asia/Taipei' },
    );
}

module.exports = {
    wearMap,
    popMap,
    fetchOpenWeatherMap,
    parseWeatherResponse,
    dailyWeatherCronJob,
};
