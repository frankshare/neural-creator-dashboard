// 平台专属指标定义 —— 唯一数据源。
//
// 看板显示哪些指标、导入脚本从 frontmatter 读哪些键，全部由这个文件决定。
// 改指标（加/删/改名/换单位）只需要改这里，不用动 import-notes.mjs，也不用动任何 UI 组件。
//
// 每个指标：
//   key      内部字段名，会出现在 my-data.js 的 post.metrics 里
//   zh / en  看板上的中英文标签
//   aliases  frontmatter 里认哪些键名（中英都列上）；导入脚本按顺序取第一个非空值
//   unit     显示后缀，'' | '%' | 's'
//   higher   数值越大越好？true/false；null 表示不做优劣判断
//
// 注意：aliases 的顺序有意义 —— 排在前面的优先。比如「收藏」在 X 上是书签、
// 在小红书上是收藏，两边各写各的，不会互相干扰。

export const PLATFORM_METRICS = {
  X: [
    {key: 'views',   zh: '观看', en: 'Views',     aliases: ['观看', '浏览', 'views'], unit: '',  higher: true},
    {key: 'likes',   zh: '点赞', en: 'Likes',     aliases: ['点赞', 'likes'],         unit: '',  higher: true},
    {key: 'reposts', zh: '转推', en: 'Reposts',   aliases: ['转推', '转发', 'reposts', 'retweets'], unit: '', higher: true},
    {key: 'saves',   zh: '书签', en: 'Bookmarks', aliases: ['书签', 'bookmarks'],     unit: '',  higher: true},
    {key: 'replies', zh: '回复', en: 'Replies',   aliases: ['回复', 'replies'],       unit: '',  higher: true}
  ],
  抖音: [
    {key: 'views',      zh: '播放',   en: 'Plays',      aliases: ['播放', '观看', 'views', 'plays'], unit: '',  higher: true},
    {key: 'completion', zh: '完播率', en: 'Completion', aliases: ['完播率', '完播', 'completion'],   unit: '%', higher: true},
    {key: 'likes',      zh: '点赞',   en: 'Likes',      aliases: ['点赞', 'likes'],                  unit: '',  higher: true},
    {key: 'comments',   zh: '评论',   en: 'Comments',   aliases: ['评论', 'comments'],               unit: '',  higher: true},
    {key: 'shares',     zh: '分享',   en: 'Shares',     aliases: ['分享', '转发', 'shares'],         unit: '',  higher: true}
  ],
  小红书: [
    {key: 'impressions', zh: '曝光',   en: 'Impressions', aliases: ['曝光', 'impressions'],  unit: '',  higher: true},
    {key: 'ctr',         zh: '点击率', en: 'CTR',         aliases: ['点击率', 'ctr'],        unit: '%', higher: true},
    {key: 'saves',       zh: '收藏',   en: 'Saves',       aliases: ['收藏', 'saves'],        unit: '',  higher: true},
    {key: 'follows',     zh: '涨粉',   en: 'Follows',     aliases: ['涨粉', 'follows'],      unit: '',  higher: true}
  ],
  微信: [
    {key: 'views',   zh: '阅读', en: 'Reads',   aliases: ['阅读', 'views'],   unit: '', higher: true},
    {key: 'wow',     zh: '在看', en: 'Wow',     aliases: ['在看', 'wow'],     unit: '', higher: true},
    {key: 'shares',  zh: '转发', en: 'Shares',  aliases: ['转发', 'shares'],  unit: '', higher: true},
    {key: 'saves',   zh: '收藏', en: 'Saves',   aliases: ['收藏', 'saves'],   unit: '', higher: true}
  ],
  B站: [
    {key: 'views',    zh: '播放',   en: 'Plays',    aliases: ['播放', '观看', 'views'], unit: '',  higher: true},
    {key: 'danmaku',  zh: '弹幕',   en: 'Danmaku',  aliases: ['弹幕', 'danmaku'],       unit: '',  higher: true},
    {key: 'likes',    zh: '点赞',   en: 'Likes',    aliases: ['点赞', 'likes'],         unit: '',  higher: true},
    {key: 'coins',    zh: '投币',   en: 'Coins',    aliases: ['投币', 'coins'],         unit: '',  higher: true},
    {key: 'favorites',zh: '收藏',   en: 'Favorites',aliases: ['收藏', 'favorites'],     unit: '',  higher: true}
  ]
};

// 未知平台（或没标平台）时用的通用指标。够用即可，不追求覆盖所有平台。
export const GENERIC_METRICS = [
  {key: 'views',   zh: '观看', en: 'Views',   aliases: ['观看', '浏览', '阅读', '播放', 'views'], unit: '', higher: true},
  {key: 'likes',   zh: '点赞', en: 'Likes',   aliases: ['点赞', 'likes'],   unit: '', higher: true},
  {key: 'comments',zh: '评论', en: 'Comments',aliases: ['评论', 'comments'],unit: '', higher: true},
  {key: 'saves',   zh: '收藏', en: 'Saves',   aliases: ['收藏', '书签', 'saves', 'bookmarks'], unit: '', higher: true},
  {key: 'shares',  zh: '分享', en: 'Shares',  aliases: ['分享', '转发', 'shares'], unit: '', higher: true}
];

// platform 可能是多值（frontmatter 里写了数组，导入时用「、」或「, 」拼成字符串），
// 取第一个能匹配上的平台定义。
export function metricsFor(platform) {
  const raw = String(platform || '').trim();
  if (raw) {
    for (const part of raw.split(/[,，、]/).map(s => s.trim()).filter(Boolean)) {
      if (PLATFORM_METRICS[part]) return PLATFORM_METRICS[part];
    }
  }
  return GENERIC_METRICS;
}
