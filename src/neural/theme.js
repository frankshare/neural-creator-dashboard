// 配色与素材路径：中性深灰底 + 银灰光球 + 黑底发光水母；点缀为银白与香槟金。只放颜色与素材，不含交互。
import {asset} from '../config';

export const T = {
  kinds: {core: '#ecd9a6', folder: '#d9b6c1', post: '#c0b8ef', collect: '#e3b3c4', note: '#a9dccb', idea: '#e8c48c', draft: '#a9d3e4', concept: '#e4e6e8', tag: '#98a6a1', ghost: '#70746f'},
  // 模块（水母）的 color/filter/flip 已移入 graph.js 的 MODULES —— 那里是模块的唯一数据源，
  // 新增一个模块只需改那一处。这里只保留与模块无关的调色板。
  // 笔记类型标签配色：与上方 kinds 同一套调色板，按「权威 → 个人 → 清单」冷暖递进。
  types: {
    '文档': '#acd6e8',      // 青  —— 官方/权威说明
    '研究': '#c3bcf2',      // 薰衣草 —— 个人实践提炼
    '合集': '#e6cf98',      // 香槟金 —— 异构清单
    'Skill合集': '#ace0cf',  // 薄荷 —— 可安装 Skill 包
    '工具合集': '#e3b3c4',   // 玫瑰 —— 可运行工具/仓库
    '功能': '#a9dccb',
    '设计': '#d9b6c1',
    '修复': '#ff7385',
    '优化': '#6be3ad',
    '发布': '#e8c48c',
    '探索': '#e4e6e8'
  },
  // 来源平台配色。每个平台的品牌色感觉差异很大，这里统一到同一套低饱和调色板，
  // 保证和整体银灰主题协调；未列出的平台走 fallback。
  platforms: {
    'X': '#acd6e8',
    '抖音': '#e3b3c4',
    '小红书': '#ff7385',
    '微信': '#6be3ad',
    'B站': '#7ec8e3',
    'YouTube': '#ff8a80',
    '知乎': '#8fb8f0',
    '微博': '#e6cf98',
    '即刻': '#ecc98f'
  },
  platformFallback: '#98a6a1',
  media: {orb: asset('media/orb.mp4'), orbPoster: asset('media/orb.jpg'), jelly: asset('media/jellyfish.mp4'), jellyPoster: asset('media/jellyfish.jpg')},
  pulse: {out: ['#fffaf0', '#ecd39e'], in: ['#ffffff', '#e3b3c4']},
  ring: ['#ecd9a6', '#c9cac5'],
  logo: ['#7d7f7c', '#d8d9d6', '#ecd9a6', '#a9aba7'],
  mini: {glow0: '#ffffff', core: '#c9d6e0', dot: '#f2f4f5', mutual: '#ecd39e', pulseOut: '#ffffff', pulseIn: '#e3b3c4'},
  dust: ['236,236,232', '230,207,152', '200,205,210', '255,255,255'],
  canvas: {additive: true, mutual: '236,206,146', mutualIn: '232,176,196', wiki: '172,224,206', link: '205,208,204', pulseOne: '190,230,215', label: '#e6e7e3', spark: ['200,205,210', '225,228,232', '255,236,200'], glow: '66', light: '#ffffff'}
  };
