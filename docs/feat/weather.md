# 功能 每日早上 07:00 發送今日天氣報告


## 內容
每日早上 07:00 發送今天的天氣報告到群組
1. 告知今天氣溫
2. 建議穿著
3. 是否會下雨

## 業務邏輯
早上七點就直接 call OpenWeatherMap 的 api 拿到內容後進行發送
失敗就失敗 留下 log 後不 retry

不考慮時區 以台北用戶為准即可


## SD
### Services/weatherService.js

#### wearMap
設定 map 依照氣溫設定對應的穿搭文字
```
[
  { min: 25, message: "短袖、注意防曬。" },
  { min: 15, message: "薄長袖、防風外套。" },
  { min: -99, message: "發熱衣、厚大衣。" }
]
```

#### popMap
設定 map 依照降雨數值對應的描述
```
{ threshold: 0.8, message: "外面看起來快淹水了，一定要帶傘並注意交通安全！" },
{ threshold: 0.5, message: "哎呀，今天好像很有機會下雨呢，出門記得帶把傘喔..." },
{ threshold: 0.2, message: "雲量好像有點多，不放心的話可以帶把小折疊傘備用。" },
{ threshold: 0,   message: "今天天氣不錯，看起來不太會下雨，放心出門吧！" }
```

#### fetchOpenWeatherMap
提供 Service fetch openweathermap api 的 response

How to make an API call
https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API key}

會返回 list 我們取用最即時的 list[0]

必填 Params
| param name | value |
|------------|-------|
| lat | 25.0330 (台北) |
| lon | 121.5654 (台北) |
| appid | process.env.OPENWEATHERMAP_API_KEY |
| lang | zh_tw |
| units | metric |

#### parseWeatherResponse

把 response 轉換成要傳給伺服器的文字內容
接收 fetchOpenWeatherMap 的 response

文字內容範例
```
大家早安嗶!
收到今天的天氣預報啦~ ${rain_desc}
城市:台北
氣溫:${temp}
體感溫度:${feels_temp}
濕度:${humidity}
降雨:${pop}
建議穿搭:${wear}

```

轉換文字
| response欄位 | 轉換文字 |
|------------|-------|
| list.main.temp | ${temp} |
| list.main.feels_like | ${feels_temp} |
| list.main.humidity | ${humidity} |
| list.pop | ${pop} |
| 把 ${temp}丟進 wearMap 取得 | ${wear} |
| 把 ${pop}丟進 popMap 取得 | ${rain_desc} |

#### dailyWeatherCronJob

使用 node-cron 定義一個每天早上07:00 發送天氣報告內容到伺服器
- 封裝 `node-cron` 邏輯。
  - `client` 參數由 `index.js` 傳入，確保能呼叫 `client.channels.cache.get()`。

在 node-cron.schedule 參數加入 { timezone: "Asia/Taipei" }。
fetchOpenWeatherMap -> parseWeatherResponse
提供給 index.js 進行調用

### index.js
調用 dailyWeatherCronJob(client) 去建立 cronjob
把 parseWeatherResponse 的文字發送至群組

設定指令 /weather 觸發天氣報告 -> 提供手動觸發途徑


