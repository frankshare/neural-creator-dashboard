// 作品库数据来自 src/data（示例或你导入的笔记）；收藏数据同源、结构相同。
import {posts as samplePosts, postContent, collects as sampleCollects, collectContent} from '../data';

export const posts = samplePosts;
export const workContent = postContent;
// 「收藏」= 收藏的他人内容（参考资料），和「作品」结构完全一样，只是语义不同。
// 老版本的数据文件没有这两个导出，所以兜底成空数组，避免整个看板崩掉。
export const collects = sampleCollects || [];
export const collectItems = collectContent || [];
// 「本月」以最新一篇作品所在月份为准；没有作品时留空，避免整个看板崩掉。
const latest = posts.map(p => p.date).sort().pop() || '';
export const monthPosts = latest ? posts.filter(p => p.date.slice(0, 7) === latest.slice(0, 7)) : [];
