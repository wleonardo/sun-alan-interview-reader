// Brief editorial index, not a transcript. Order follows the public transcript,
// skipping its opening teaser montage. No inferred time offsets are assigned.
export const META = Object.freeze({
  title: 'AI 黄金时代，普通人如何下注？',
  published: '2026-10-16',
  duration: 2829,
  verified: '2026-10-18',
  video: 'https://www.bilibili.com/video/BV1X6JX6sEYJ/',
  transcript: 'https://www.bidclub.ai/e/justin-sun-deep-interview-btc-nasdaq-ai-20261016',
  notes: 'https://www.techflowpost.com/article/34662',
  metadata: 'https://api.bilibili.com/x/web-interface/view?bvid=BV1X6JX6sEYJ',
  rights: 'https://www.bidclub.ai/readme',
  scope: 'guide',
});

export const SECTIONS = [
  { id: 'jm-section-1', title: '链、交易与技术风险', range: '01—06' },
  { id: 'jm-section-2', title: '宏观判断与个人生活', range: '07—10' },
  { id: 'jm-section-3', title: '方法、奖项与 AI', range: '11—15' },
  { id: 'jm-section-4', title: '配置与业务', range: '16—20' },
];

// “review” is an original reader's checklist, not the interviewee's speech.
const rows = [
  ['Solana / DeFi', '大资金重视以太坊流动性。', '加密资产', 0,
    '阅读时把三个问题分开：是否合作、是否使用某条链、是否看好代币价格。这三种关系不能相互替代；还要留意发言者的资金规模是否适用于普通使用者。'],
  ['DEX / CEX', '竞争取决于监管待遇。', '加密资产', 0,
    '先找出判断里的条件，再看结论。讨论一种监管情景，不等于该规则已经生效；评估产品时还需要分别核对所在地限制、托管安排与退出渠道。'],
  ['BTC 风险', '担忧 AI 与量子计算冲击。', '加密资产', 0,
    '技术担忧、发生时间和价格影响是三层不同命题。这里没有独立验证相关技术预测，不能把采访中的推演当成密码学界共识或确定的时间表。', '自述：新地址冷存储。'],
  ['沉睡币', '升级存在协调难题。', '加密资产', 0,
    '区分“技术上能否升级”和“持有人是否行动”。再区分单个钱包的风险与整个市场的供给变化。讨论极端情景时，尤其要核对其前提是否同时成立。'],
  ['仍持 BTC？', '担忧不等于卖出。', '加密资产', 0,
    '记录观点与实际动作之间的差距很有价值：持有、减仓、对冲、做空不是同一个动作。没有交易记录与完整组合，无法据一句表态推算真实风险暴露。'],
  ['密码学预案', '讨论基础设施应对。', '加密资产', 0,
    '计划、测试、上线和经过审计是不同状态。不要把项目方对未来方案的介绍当成已经可用的保护，也不要据此直接进行不可逆的资产转移。'],
  ['人民币 / 美债', '看人民币走强，淡化美债危机。', '宏观资产', 1,
    '宏观观点需要说明观察期限及可证伪条件。可分别记录汇率方向、债券偿付能力、利率和债券价格，避免把“信用没有问题”理解成“价格不会下跌”。'],
  ['传统资产', '偏好新方向。', '宏观资产', 1,
    '给资产贴上新旧标签并不足以比较价值。阅读时可另列现金流、买入价格、竞争优势和持有期限，检查标签之外是否还有可检验的论据。'],
  ['情感与口碑', '评价并非永恒。', '人生与方法', 1,
    '这里是个人经验表达，不是对相关事件的调查结论。可以保留受访者如何理解经历，同时不替其他当事人下判断，也不把一句人生观推广成普遍答案。'],
  ['AI 与人生', '希望结合现有业务。', '人生与方法', 1,
    '把愿景和已经完成的实践分开记录。若借鉴到自己的工作，可以先写下一个具体问题、现有流程和验收标准，再判断工具是否真正带来改善。'],
  ['孙学与书单', '强调环境与博弈。', '人生与方法', 2,
    '回顾成功经验时，也要问：当时有哪些失败路径？需要哪些资源？是否存在幸存者偏差？事后看起来清晰的选择，未必在事前拥有同等确定性。'],
  ['孙宇晨奖', '小投入，持续迭代。', '人生与方法', 2,
    '理解一项实验可以关注四件事：它要验证什么、投入上限、接受什么证据、何时调整。奖项的实际规则和进展，应回到正式公告核对。'],
  ['AI 应用', '更看好 AI 应用。', 'AI应用', 2,
    '看应用时可以从用户需求出发：是否频繁发生、谁付费、数据如何获得、结果怎样验证。技术趋势成立，并不自动意味着每一家参与者都有可持续收入。'],
  ['存储 / 光模块', '认为硬件估值偏高。', 'AI应用', 2,
    '需求增长和投资回报是不同问题。讨论估值需要价格、利润、资本开支与时间范围；“未来会用到”本身不能回答今天的价格是否合理。'],
  ['健康数据', '关注连续管理。', 'AI应用', 2,
    '这是应用场景讨论，不是医疗建议。实际使用还需要核对数据质量、隐私授权、误报漏报与专业人员复核；不要根据访谈自行改变诊疗方案。', '场景：采集→AI→专家复核。'],
  ['美股配置', '仍持英伟达、纳指，但中线偏空。', '配置与业务', 3,
    '读市场表态时，先标注时间，再分清方向判断、仓位大小和是否采取行动。片段式持仓自述缺少成本、对冲与其他资产，无法还原完整投资组合。', '', '虽然我看空，还没做空。'],
  ['A 股', '自述未持仓。', '配置与业务', 3,
    '没有持仓并不自动等于看空所有公司。要区分研究兴趣、实际交易和长期配置，也不要把某个时点的自述当作持续更新的账户状态。'],
  ['ETH 调仓', '自述卖出八九成 ETH，转买美股。', '配置与业务', 3,
    '这是事后交易自述，未独立核验。复盘应同时检查未成功的交易、税费、滑点和组合风险，而不是只寻找一个可照搬的买卖价位。', '自述：约 $3,600—4,000 减持。'],
  ['RWA', '讨论链上资产入口。', '配置与业务', 3,
    '项目计划不是已经交付的产品。核对资产映射方式、持有人权利、赎回路径、发行主体及地区限制，才能理解链上凭证与直接持有资产的差别。'],
  ['TRON 费用', '品牌与网络支持溢价。', '配置与业务', 3,
    '商业解释和用户实际成本应分开看。比较网络时，需要把手续费、资源占用、兑换成本、退出成本与故障风险放在同一口径，而不只看宣传价格。'],
];

export const TOPICS = rows.map(([title, summary, category, section, review, example = '', quote = ''], i) => ({
  id: `jm-topic-${String(i + 1).padStart(2, '0')}`,
  order: i + 1, title, summary, category, section, review, example, quote,
}));

export function searchTopics({ query = '', category = '全部', unreadOnly = false, read = new Set() } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  return TOPICS.filter(t => (category === '全部' || category === t.category)
    && (!unreadOnly || !read.has(t.id))
    && terms.every(term => [t.title, t.summary, t.review, t.example, t.quote, t.category].join(' ').toLocaleLowerCase().includes(term)));
}

export function splitLocalText(text) {
  return text.replace(/^\uFEFF/u, '').replace(/\r\n?/g, '\n').split(/\n\s*\n/u).map(t => t.trim()).filter(Boolean);
}
