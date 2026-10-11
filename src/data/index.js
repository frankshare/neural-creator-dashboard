// 看板读取的数据入口。默认使用虚构示例；运行 `npm run import -- --vault <笔记文件夹>` 后会切换到 my-data.js。
export * from './sample.js';

// 数据来源标记：'sample' = 仓库自带虚构示例，'imported' = 从你自己的笔记导入。
export const DATA_SOURCE = 'sample';
