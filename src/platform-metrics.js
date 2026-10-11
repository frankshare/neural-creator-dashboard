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
//   legacy   可选。映射到通用字段（views/likes/comments/saves/follows/shares/
//            impressions/ctr）中的哪一个。作品卡片、KPI 带、排行榜这些地方还在读
//            通用字段，没有这层映射就会出现「卡片显示 0、详情显示 2647」的矛盾。
//            各平台对同一件事的叫法不同（X 叫「回复」、小红书叫「评论」），
//            在各自定义里指到同一个通用字段即可。
//
// 注意：aliases 的顺序有意义 —— 排在前面的优先。

export const PLATFORM_METRICS = {
  X: [
    {key: 'views',   zh: '观看', en: 'Views',     aliases: ['观看', '浏览', 'views'],               unit: '', legacy: 'views'},
    {key: 'likes',   zh: '点赞', en: 'Likes',     aliases: ['点赞', 'likes'],                       unit: '', legacy: 'likes'},
    {key: 'reposts', zh: '转推', en: 'Reposts',   aliases: ['转推', '转发', 'reposts', 'retweets'], unit: ''},
    {key: 'saves',   zh: '书签', en: 'Bookmarks', aliases: ['书签', 'bookmarks'],                   unit: '', legacy: 'saves'},
    {key: 'replies', zh: '回复', en: 'Replies',   aliases: ['回复', 'replies'],                     unit: '', legacy: 'comments'}
  ],
  抖音: [
    {key: 'views',      zh: '播放',   en: 'Plays',      aliases: ['播放', '观看', 'views', 'plays'], unit: '',  legacy: 'views'},
    {key: 'completion', zh: '完播率', en: 'Completion', aliases: ['完播率', '完播', 'completion'],   unit: '%'},
    {key: 'likes',      zh: '点赞',   en: 'Likes',      aliases: ['点赞', 'likes'],                  unit: '',  legacy: 'likes'},
    {key: 'comments',   zh: '评论',   en: 'Comments',   aliases: ['评论', 'comments'],               unit: '',  legacy: 'comments'},
    {key: 'shares',     zh: '分享',   en: 'Shares',     aliases: ['分享', '转发', 'shares'],         unit: '',  legacy: 'shares'}
  ],
  小红书: [
    {key: 'impressions', zh: '曝光',   en: 'Impressions', aliases: ['曝光', 'impressions'], unit: '',  legacy: 'impressions'},
    {key: 'ctr',         zh: '点击率', en: 'CTR',         aliases: ['点击率', 'ctr'],       unit: '%', legacy: 'ctr'},
    {key: 'saves',       zh: '收藏',   en: 'Saves',       aliases: ['收藏', 'saves'],       unit: '',  legacy: 'saves'},
    {key: 'follows',     zh: '涨粉',   en: 'Follows',     aliases: ['涨粉', 'follows'],     unit: '',  legacy: 'follows'}
  ],
  微信: [
    {key: 'views',  zh: '阅读', en: 'Reads',  aliases: ['阅读', 'views'],  unit: '', legacy: 'views'},
    {key: 'wow',    zh: '在看', en: 'Wow',    aliases: ['在看', 'wow'],    unit: ''},
    {key: 'shares', zh: '转发', en: 'Shares', aliases: ['转发', 'shares'], unit: '', legacy: 'shares'},
    {key: 'saves',  zh: '收藏', en: 'Saves',  aliases: ['收藏', 'saves'],  unit: '', legacy: 'saves'}
  ],
  B站: [
    {key: 'views',     zh: '播放', en: 'Plays',     aliases: ['播放', '观看', 'views'], unit: '', legacy: 'views'},
    {key: 'danmaku',   zh: '弹幕', en: 'Danmaku',   aliases: ['弹幕', 'danmaku'],       unit: ''},
    {key: 'likes',     zh: '点赞', en: 'Likes',     aliases: ['点赞', 'likes'],         unit: '', legacy: 'likes'},
    {key: 'coins',     zh: '投币', en: 'Coins',     aliases: ['投币', 'coins'],         unit: ''},
    {key: 'favorites', zh: '收藏', en: 'Favorites', aliases: ['收藏', 'favorites'],     unit: '', legacy: 'saves'}
  ]
};

// 未知平台（或没标平台）时用的通用指标。够用即可，不追求覆盖所有平台。
export const GENERIC_METRICS = [
  {key: 'views',    zh: '观看', en: 'Views',    aliases: ['观看', '浏览', '阅读', '播放', 'views'], unit: '', legacy: 'views'},
  {key: 'likes',    zh: '点赞', en: 'Likes',    aliases: ['点赞', 'likes'],    unit: '', legacy: 'likes'},
  {key: 'comments', zh: '评论', en: 'Comments', aliases: ['评论', 'comments'], unit: '', legacy: 'comments'},
  {key: 'saves',    zh: '收藏', en: 'Saves',    aliases: ['收藏', '书签', 'saves', 'bookmarks'], unit: '', legacy: 'saves'},
  {key: 'shares',   zh: '分享', en: 'Shares',   aliases: ['分享', '转发', 'shares'], unit: '', legacy: 'shares'}
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
