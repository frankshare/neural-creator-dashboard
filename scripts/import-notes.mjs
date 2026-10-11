#!/usr/bin/env node
// 把一个 Markdown 笔记文件夹（例如 Obsidian 仓库）转换成看板数据 src/data/my-data.js，并让看板改读它。
// 只用 Node 自带模块，不联网，不修改你的笔记。
//
// 用法：
//   node scripts/import-notes.mjs --vault <笔记文件夹> [选项]
//   node scripts/import-notes.mjs --reset            # 切回示例数据
//
// 选项：
//   --works <文件夹>     作品所在文件夹（相对 vault，可多次传）；不传时按文件夹名自动识别
//   --methods <文件夹>   方法笔记所在文件夹
//   --ideas <文件夹>     选题所在文件夹
//   --drafts <文件夹>    草稿所在文件夹
//   --all-as-notes       没被识别的笔记也作为方法笔记导入
//   --account <名字>     账号名（默认「我的账号」）
//   --followers <数字>   粉丝数
//   --max-works <数字>   最多导入多少篇作品（默认 30，按日期取最新）
//   --max-notes <数字>   最多导入多少篇方法笔记（默认 40）
//   --out <文件>         输出到指定文件，且不切换看板数据（用于测试）
import {readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync} from 'node:fs';
import {join, relative, resolve, dirname, basename, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
// 平台专属指标的定义在 src/platform-metrics.js —— 改指标只改那一个文件。
import {metricsFor} from '../src/platform-metrics.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/data');
const INDEX = join(DATA, 'index.js');
const indexFor = file => `// 看板读取的数据入口。默认使用虚构示例；运行 \`npm run import -- --vault <笔记文件夹>\` 后会切换到 my-data.js。\nexport * from './${file}';\n\n// 数据来源标记：'sample' = 仓库自带虚构示例，'imported' = 从你自己的笔记导入。\nexport const DATA_SOURCE = '${file === 'sample.js' ? 'sample' : 'imported'}';\n`;

// —— 参数 ——
const args = process.argv.slice(2);
const opt = {works: [], collects: [], methods: [], ideas: [], drafts: []};
for (let i = 0; i < args.length; i++) {
  const a = args[i], next = () => args[++i];
  if (a === '--vault') opt.vault = next();
  else if (['--works', '--collects', '--methods', '--ideas', '--drafts'].includes(a)) opt[a.slice(2)].push(next());
  else if (a === '--all-as-notes') opt.allAsNotes = true;
  else if (a === '--group-works') opt.groupWorks = true;
  else if (a === '--account') opt.account = next();
  else if (a === '--followers') opt.followers = Number(next());
  else if (a === '--max-works') opt.maxWorks = Number(next());
  else if (a === '--max-notes') opt.maxNotes = Number(next());
  else if (a === '--out') opt.out = next();
  else if (a === '--reset') opt.reset = true;
  else if (a === '-h' || a === '--help') opt.help = true;
  else { console.error(`未知参数：${a}（用 --help 查看用法）`); process.exit(1); }
}
if (opt.help) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
if (opt.reset) { writeFileSync(INDEX, indexFor('sample.js')); console.log('已切回示例数据（src/data/sample.js）。'); process.exit(0); }
if (!opt.vault || !existsSync(opt.vault) || !statSync(opt.vault).isDirectory()) { console.error('请用 --vault 指定一个存在的笔记文件夹。'); process.exit(1); }
const VAULT = resolve(opt.vault);
const maxWorks = opt.maxWorks || 30, maxNotes = opt.maxNotes || 40;

// —— 读取 Markdown ——
const SKIP = new Set(['.obsidian', '.trash', '.git', 'node_modules', '.DS_Store']);
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name), st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.toLowerCase().endsWith('.md')) out.push(p);
  }
  return out;
}

// 简化的 YAML frontmatter：key: value、key: [a, b]、以及「- 项」列表。
function parse(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fm = {};
  if (m) {
    let key = null;
    for (const raw of m[1].split(/\r?\n/)) {
      const item = raw.match(/^\s*-\s+(.*)$/);
      if (item && key) { if (!Array.isArray(fm[key])) fm[key] = []; fm[key].push(unquote(item[1])); continue; }
      const kv = raw.match(/^([^:#][^:]*):\s*(.*)$/);
      if (!kv) continue;
      key = kv[1].trim();
      const v = kv[2].trim();
      fm[key] = v.startsWith('[') && v.endsWith(']') ? v.slice(1, -1).split(',').map(unquote).filter(Boolean) : v === '' ? '' : unquote(v);
    }
  }
  return {fm, body: m ? text.slice(m[0].length) : text};
}
const unquote = s => String(s).trim().replace(/^['"]|['"]$/g, '');
const pick = (fm, keys) => { for (const k of keys) for (const f of Object.keys(fm)) if (f.toLowerCase() === k.toLowerCase() && fm[f] !== '') return fm[f]; return undefined; };
function num(v) {
  if (v == null || v === '') return null;
  const s = String(v).replace(/[,，\s%秒s]/gi, '');
  const m = s.match(/^(-?\d+(?:\.\d+)?)(万|w|k|千)?$/i);
  if (!m) return null;
  const mul = {万: 1e4, w: 1e4, W: 1e4, k: 1e3, K: 1e3, 千: 1e3}[m[2]] || 1;
  return Math.round(Number(m[1]) * mul * 10) / 10;
}
const pad = n => String(n).padStart(2, '0');
function dateOf(v, file) {
  // 只有日期时按本地时间的 00:00 解析（避免被当成 UTC 而跨天）
  const s = v ? String(v).trim().replace(/\//g, '-').replace(/^(\d{4}-\d{1,2}-\d{1,2})$/, '$1 00:00') : '';
  const d = s ? new Date(s) : null;
  const t = d && !isNaN(d) ? d : statSync(file).mtime;
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
function tagsOf(fm, body) {
  const raw = pick(fm, ['tags', 'tag', '标签', '话题']);
  const list = Array.isArray(raw) ? raw : raw ? String(raw).split(/[,，\s]+/) : [];
  for (const m of body.matchAll(/(?:^|\s)#([^\s#，。,.!?！？、；;:：()（）[\]]+)/g)) list.push(m[1]);
  return [...new Set(list.map(t => t.replace(/^#/, '').trim()).filter(t => t && !/^\d+$/.test(t)))].slice(0, 12);
}
const clean = body => body.replace(/\r/g, '').trim().slice(0, 6000);

// —— 分类 ——
const RULES = [
  ['works', /(作品|works?$|published|已发布)/i],
  // 收藏的他人内容：和「作品」结构相同（有标题/日期/平台/指标），但语义是参考资料。
  // 必须排在 methods 之前 —— 「归档」这类词不该掉进方法库。
  ['collects', /(收藏|书签|归档|剪藏|collects?$|clips?$|bookmarks?$)/i],
  ['drafts', /(草稿|创作台|drafts?$|正在写|写作中)/i],
  ['ideas', /(选题|ideas?$|灵感)/i],
  ['methods', /(方法|methods?$|模板|templates?$|流程|workflow|知识|卡片|notes?$)/i]
];
const norm = p => p.split(/[\\/]/).filter(Boolean).join('/');
function classify(rel) {
  const dirs = rel.split(sep).slice(0, -1);
  for (const kind of ['works', 'collects', 'drafts', 'ideas', 'methods']) for (const f of opt[kind]) {
    const prefix = norm(f);
    if (norm(rel).startsWith(prefix + '/')) return {kind, root: prefix.split('/').length};
  }
  for (let i = 0; i < dirs.length; i++) for (const [kind, re] of RULES) {
    if (opt[kind].length) continue;
    if (re.test(dirs[i])) return {kind, root: i + 1};
  }
  return opt.allAsNotes ? {kind: 'methods', root: 0} : null;
}

// —— 平台推断 ——
// 策略：目录名推断为主，frontmatter 可覆盖。
//   · 作品（works）天然绑定平台，所以从分类根目录名推断：
//       「X书签归档」→ 去掉后缀「归档」→「X书签」→ 别名归一 →「X」
//       「抖音归档」→「抖音」
//   · 方法/选题/草稿是跨平台的功能概念（一篇方法笔记跟它在哪个平台收藏的无关），
//     所以这些桶**不从目录推断**，只有 frontmatter 显式写了才算。
// frontmatter 里 platform / 平台 一律优先，且支持多值（YAML 数组）。
const PLATFORM_ALIAS = [
  [/^(x|twitter|推特|x书签|twitter书签)$/i, 'X'],
  [/(抖音|douyin|tiktok)/i, '抖音'],
  [/(小红书|xiaohongshu|rednote|redbook)/i, '小红书'],
  [/(微信|wechat|公众号|视频号)/i, '微信'],
  [/(b站|bilibili|哔哩)/i, 'B站'],
  [/(youtube|油管)/i, 'YouTube'],
  [/(知乎|zhihu)/i, '知乎'],
  [/(微博|weibo)/i, '微博'],
  [/(即刻|jike)/i, '即刻']
];
// 有些目录名只是「一个桶」，不携带平台信息（4-我的作品 / 3-资料 / 收藏 …）。
// 这些目录要把平台判定权交给 frontmatter，而不是把目录名本身当成平台名。
const GENERIC_DIR = /^(我?的?作品|作品库|收藏|资料|笔记|归档|草稿|选题|materials?|works?|collects?|notes?|drafts?|ideas?)$/i;
function platformFromDir(dir) {
  const base = String(dir)
    .replace(/^\d+[-_.、]/, '')                                                      // 去掉 vault 编号前缀（4-我的作品 → 我的作品）
    .replace(/[\s_-]*(归档|书签|收藏|笔记|合集|notes?|collection|archive)$/i, '')     // 去掉「X书签归档」这类后缀
    .trim() || String(dir);
  if (GENERIC_DIR.test(base)) return '';                                            // 只是桶 → 交给 frontmatter
  for (const [re, name] of PLATFORM_ALIAS) if (re.test(base)) return name;
  return base;
}
function platformFor(kind, rel, fm, root) {
  const explicit = pick(fm, ['platform', '平台', '来源平台']);
  if (explicit) return Array.isArray(explicit) ? explicit.join(', ') : String(explicit).trim();
  // 作品与收藏都天然绑定平台（一篇内容必然来自某个平台），从分类根目录名推断。
  if (kind !== 'works' && kind !== 'collects') return '';
  const parts = rel.split(sep).filter(Boolean);
  const dir = root > 0 ? parts[root - 1] : parts[0];
  return dir ? platformFromDir(dir) : '';
}

const files = walk(VAULT);
const bucket = {works: [], collects: [], methods: [], ideas: [], drafts: []};
for (const file of files) {
  const rel = relative(VAULT, file), c = classify(rel);
  if (!c) continue;
  const {fm, body} = parse(readFileSync(file, 'utf8'));
  const title = String(pick(fm, ['title', '标题', 'name']) || basename(file).replace(/\.md$/i, '')).trim();
  bucket[c.kind].push({file, rel, root: c.root, fm, body, title, platform: platformFor(c.kind, rel, fm, c.root)});
}

// —— 生成数据 ——
// --group-works：把同一个目录下的多个笔记合并成一条「作品」（优先取 导读.md 作主笔记）。
// 归档目录的常见形态是「导读.md + 帖子.md + 链接内容.md」，不聚合会把一条帖子算成三条作品。
function groupWorks(items) {
  const groups = new Map();
  for (const x of items) {
    const dir = x.rel.split(sep).slice(0, -1).join('/');
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir).push(x);
  }
  return [...groups.values()].map(files => {
    const primary = files.find(f => basename(f.file).toLowerCase() === '导读.md') || files[0];
    const body = files.map(f => clean(f.body)).join('\n\n---\n\n');
    const tags = [...new Set(files.flatMap(f => tagsOf(f.fm, f.body)))].slice(0, 12);
    return {primary, body, tags};
  });
}
// 把一批「作品形态」的笔记转成看板数据。
// 「你自己的作品」(works) 和「收藏的他人内容」(collects) 结构完全相同 ——
// 都有标题/日期/平台/指标/正文，所以共用这一个函数，只是 id 前缀不同。
function buildEntries(items, group, idPrefix) {
  const list = group ? groupWorks(items) : items.map(x => ({primary: x, body: clean(x.body), tags: tagsOf(x.fm, x.body)}));
  return list.map(({primary: x, body, tags}) => {
    const media = /视频|video/i.test(String(pick(x.fm, ['media', '类型', 'type', '形式']) || '')) ? 'video' : 'images';
    // 笔记类型（文档 / 研究 / 合集 / Skill合集 / 工具合集 …），用于看板上的彩色分类标签。
    const noteType = String(pick(x.fm, ['type', '分类', 'category']) || '').trim();
    // 来源平台（X / 抖音 / 小红书 …）：按平台分组、按平台渲染指标都靠它。
    const platform = x.platform || '';
    // 平台专属指标：按 src/platform-metrics.js 的定义从 frontmatter 读，键名认中英别名。
    // 只保留真正读到值的项 —— UI 据此判断「这个指标有没有数据」，而不是拿 0 冒充。
    const defs = metricsFor(platform);
    const metrics = {};
    for (const d of defs) {
      const v = num(pick(x.fm, d.aliases));
      if (v != null) metrics[d.key] = v;
    }
    // legacy 映射：定义里声明了 legacy 的指标，回填到对应通用字段。
    // 各平台对同一件事叫法不同（X 叫「回复」、小红书叫「评论」），在定义里指到同一个通用字段。
    const legacyOf = {};
    for (const d of defs) if (d.legacy && metrics[d.key] != null) legacyOf[d.legacy] = metrics[d.key];
    // 平台指标优先：同一个数字既进 metrics，也回填到通用字段 ——
    // 卡片、KPI 带、排行榜这些还在读通用字段的地方才不会显示 0。
    // 用 ?? 而不是 ||，这样真实的 0 不会被当成「没数据」。
    const g = (k, aliases, dflt) => legacyOf[k] ?? metrics[k] ?? num(pick(x.fm, aliases)) ?? dflt;
    const p = {
      title: x.title, type: noteType, platform, metrics, date: dateOf(pick(x.fm, ['date', '发布时间', '发布日期', 'published', 'publishedAt', 'created', '创建时间']), x.file),
      views: g('views', ['views', '观看', '浏览', '阅读', '播放'], 0),
      likes: g('likes', ['likes', '点赞'], 0),
      comments: g('comments', ['comments', '评论'], 0),
      saves: g('saves', ['saves', '收藏', '书签'], 0),
      follows: g('follows', ['follows', '涨粉'], null),
      shares: g('shares', ['shares', '分享', '转发'], 0),
      impressions: g('impressions', ['impressions', '曝光'], null),
      ctr: g('ctr', ['ctr', '点击率', '封面点击率'], null),
      duration: num(pick(x.fm, ['duration', '平均观看', '平均观看时长', '时长']))
    };
    return {post: p, content: {title: x.title, type: noteType, platform, body, tags, media}};
  }).sort((a, b) => b.post.date.localeCompare(a.post.date)).slice(0, maxWorks)
    .map((w, i) => ({...w, post: {id: idPrefix + (i + 1), ...w.post}}));
}

const works = buildEntries(bucket.works, opt.groupWorks, 'w');
const collects = buildEntries(bucket.collects, opt.groupWorks, 'c');

const notes = bucket.methods.slice(0, maxNotes).map((x, i) => {
  const parts = x.rel.split(sep);
  const sub = parts[x.root] && x.root < parts.length - 1 ? parts[x.root] : (parts[x.root - 1] || '笔记');
  return {id: 'n' + (i + 1), title: x.title, path: `05-方法库 methods/${sub}/${parts[parts.length - 1]}`, body: clean(x.body), tags: tagsOf(x.fm, x.body)};
});

const ideas = bucket.ideas.map((x, i) => {
  const status = String(pick(x.fm, ['status', '状态']) || '待写');
  return {id: i + 1, title: x.title, platform: String(pick(x.fm, ['platform', '平台']) || '小红书'), priority: ['高', '中', '低'].includes(String(pick(x.fm, ['priority', '优先级']))) ? String(pick(x.fm, ['priority', '优先级'])) : '中',
    status: ['待写', '待扩展', '已转草稿'].includes(status) ? status : '待写', note: String(pick(x.fm, ['note', '备注', 'description', '简介']) || clean(x.body).replace(/^#.*\n/, '').trim().slice(0, 120))};
});

const drafts = bucket.drafts.map((x, i) => {
  const src = String(pick(x.fm, ['source', '来源选题', '选题']) || '');
  const idea = ideas.find(d => d.title === src);
  return {id: 'draft-' + (i + 1), title: x.title, body: clean(x.body), source: idea ? idea.id : null};
});

// 概念词：至少在两条内容里出现的话题标签，取出现最多的 20 个。
const count = new Map();
for (const t of [...works.flatMap(w => w.content.tags), ...collects.flatMap(c => c.content.tags), ...notes.flatMap(n => n.tags)]) count.set(t, (count.get(t) || 0) + 1);
const concepts = [...count].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => [t, [t.toLowerCase()]]);

const dates = works.map(w => w.post.date.slice(0, 10)).sort();
const today = new Date();
const snapshot = {
  account: opt.account || '我的账号', followers: Number.isFinite(opt.followers) ? opt.followers : null,
  capturedAt: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
  publishedFrom: dates[0] || '', publishedTo: dates[dates.length - 1] || '', source: '导入自本地笔记'
};

if (!works.length) {
  console.warn(`提示：「作品库」是空的 —— 它装的是**你自己发布的作品**（指标是你的表现）。\n想填充它，请把你自己的作品放进名字包含「作品 / works」的文件夹，或用 --works <文件夹> 指定。\n收藏的他人内容应该用 --collects 指定，它会进「收藏」模块。\n已识别：收藏 ${collects.length}、方法笔记 ${notes.length}、选题 ${ideas.length}、草稿 ${drafts.length}。`);
}

const J = v => JSON.stringify(v, null, 1);
const out = `// 由 scripts/import-notes.mjs 从「${basename(VAULT)}」生成。包含你的个人笔记内容，默认不提交到 git（见 .gitignore）。
// 重新导入：npm run import -- --vault <笔记文件夹>；切回示例数据：npm run import -- --reset

export const snapshot = ${J(snapshot)};

export const posts = ${J(works.map(w => w.post))};

export const postContent = ${J(works.map(w => w.content))};

export const collects = ${J(collects.map(c => c.post))};

export const collectContent = ${J(collects.map(c => c.content))};

export const notes = ${J(notes.map(({tags, ...n}) => n))};

export const seedIdeas = ${J(ideas)};

export const seedDrafts = ${J(drafts)};

export const concepts = ${J(concepts)};
`;
const target = opt.out ? resolve(opt.out) : join(DATA, 'my-data.js');
mkdirSync(dirname(target), {recursive: true});
writeFileSync(target, out);
if (!opt.out) writeFileSync(INDEX, indexFor('my-data.js'));

console.log(`导入完成：作品 ${works.length}、收藏 ${collects.length}、方法笔记 ${notes.length}、选题 ${ideas.length}、草稿 ${drafts.length}、概念词 ${concepts.length}`);
console.log(`输出：${relative(process.cwd(), target) || target}${opt.out ? '' : '（看板已切换到这份数据）'}`);
if (!concepts.length) console.log('提示：没有生成概念词（需要同一个话题标签出现在至少两条笔记里），可以手动编辑输出文件末尾的 concepts。');
if (bucket.works.length > maxWorks) console.log(`提示：作品共 ${bucket.works.length} 篇，只取了最新的 ${maxWorks} 篇（--max-works 可调整）。`);
if (bucket.collects.length > maxWorks) console.log(`提示：收藏共 ${bucket.collects.length} 篇，只取了最新的 ${maxWorks} 篇（--max-works 可调整）。`);
