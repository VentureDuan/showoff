export interface TechnicalNode { title: string; detail: string; accent?: boolean; }
export interface TechnicalLane { title: string; subtitle: string; nodes: TechnicalNode[]; }
export type TechnicalChart =
  | { type: 'architecture'; title: string; lanes: TechnicalLane[]; links: string[]; note: string }
  | { type: 'sequence'; title: string; actors: string[]; steps: { from: number; to: number; label: string; note?: boolean }[]; note: string }
  | { type: 'branches'; title: string; start: string; branches: { condition: string; result: string; detail: string }[]; note: string };
export interface TechnicalChapter {
  id: string; title: string; summary: string; paragraphs: string[]; chart: TechnicalChart;
  table?: { headers: string[]; rows: string[][] };
  conclusion: string;
}

export const technicalChapters: Record<string, TechnicalChapter[]> = {
  'ask-venture': [
    {
      id: 'architecture', title: '架构：领域知识与工具能力如何结合',
      summary: '将排障经验组织成按需加载的调查上下文，让 Agent 能够跨系统取证，而不必一次加载所有领域知识。',
      paragraphs: [
        '使用入口是 Coding Agent 中的 Ask-Venture 插件，面向研发、测试和运营。用户可以提供环境、实例、报错截图或任务标识。Gateway 先确认调查对象和信息是否足够，再选择部署加速、游戏启动与串流、实例状态等领域。',
        '领域 Skill 描述状态含义、关键标识、取证入口与分析方法。MCP 负责访问数据与运行现场，本地仓库用于对照实现。两者相互配合：Skill 启发模型选择调查路径，工具返回事实，模型根据证据继续下钻。',
      ],
      chart: { type: 'architecture', title: '组件职责与证据访问', lanes: [
        { title: '使用入口', subtitle: '人提供目标与现象', nodes: [{ title: '研发 / 测试 / 运营', detail: '环境、实例、截图、任务或 flowId' }, { title: 'Coding Agent', detail: 'Codex / Claude Code / ZCode' }] },
        { title: '调查编排', subtitle: 'Ask-Venture', nodes: [{ title: 'Gateway', detail: '目标检查、澄清与领域路由', accent: true }, { title: '领域 Skills', detail: '部署加速 / 启动串流 / 状态上报' }, { title: '证据组织', detail: '关联时间窗、任务与版本，生成结论' }] },
        { title: '取证与核验', subtitle: 'MCP + 代码', nodes: [{ title: '日志与任务', detail: 'ES、实例日志、Temporal' }, { title: '数据与配置', detail: 'MySQL、Kafka、Apollo' }, { title: '实例现场 / 本地代码', detail: '远程取证，版本与调用链对照' }] },
      ], links: ['用户输入 → Gateway → 领域 Skill', 'Agent 调用工具 → 收集事实 → 对照代码与规则', '结论 + 支持证据 + 未确认项 + 下一步 → 使用者'], note: '职责架构示意；工具按调查需要选择，不要求固定调用顺序。' },
      table: { headers: ['设计选择', '解决的问题'], rows: [['按领域、生命周期拆分 Skills', '减少无关上下文，同时保留跨领域切换能力'], ['先明确环境、实例、版本与时间窗', '避免查错对象，或拿不匹配的代码解释现场'], ['生产 MySQL 使用只读账号', '权限由工具和账号落地，变更另行授权']] },
      conclusion: '真正复用的是领域调查方法，MCP 则让这些方法能够触达实际证据。',
    },
    {
      id: 'investigation', title: '调查时序：从表面报错回溯原始故障',
      summary: '把任务执行、后续取消和清理分开，找到最后成功步骤与最早失败位置。',
      paragraphs: [
        '一次加速失败，用户提供的截图是 task not found。若只解释最后一个错误，容易把清理阶段的问题当成加速根因。调查首先绑定父任务和时间范围，再沿实例轮转日志回到原任务真正执行的时候。',
        '原任务在复制开始前的空间检查就已失败。对照代码中的新增包体、可用容量和预留空间计算规则，可以解释为什么盘看上去几乎为空仍然装不下。之后改用其他源仍在同一步失败，进一步支持容量检查才是首要失败点。',
        '后续取消时任务已不在内存任务记录中，因此出现 task not found；Finalizer 成功也只代表清理结束。交付的是容量规划或存储调整方向，没有将诊断写成已执行扩容和恢复。',
      ],
      chart: { type: 'sequence', title: '加速失败案例：调查读取顺序', actors: ['使用者', 'Agent / Skill', '日志与现场', '对应版本代码'], steps: [
        { from: 0, to: 1, label: '提交加速失败截图与父任务标识' },
        { from: 1, to: 2, label: '按任务与时间窗回溯原始执行记录' },
        { from: 2, to: 1, label: '复制前空间检查失败，早于取消报错' },
        { from: 1, to: 3, label: '核对容量计算规则与预留空间' },
        { from: 3, to: 1, label: '以实现解释空间缺口与失败条件' },
        { from: 1, to: 0, label: '交付根因证据、次生报错解释与处理方向' },
      ], note: '案例读取顺序示意；隐藏真实实例、任务标识与原始日志。' },
      table: { headers: ['观察', '可以得出的判断'], rows: [['复制前容量校验失败', '调查重点是目标盘容量与包体需求'], ['换源仍在相同步骤失败', '不能优先归因为下载源或传输工具'], ['取消时 task not found', '需回到原任务执行，不能用取消错误覆盖原始失败']] },
      conclusion: '最后出现的错误，不一定是最早导致业务失败的错误。',
    },
    {
      id: 'boundaries', title: '状态与证据边界：相似现象不合并归因',
      summary: '同一主机、相似报错，也可能来自不同的生命周期断点。',
      paragraphs: [
        '另一次预启动调查中，一台实例的旧 Session 没有结束，阻塞新请求；另一台 Agent 已重启，本地 Session 丢失，但云端仍记录预启动态。前者是本地生命周期未收口，后者是本地与云端状态分裂。',
        '用户继续追问取消修复已部署为何仍失败，调查因此扩展到运行二进制、提交作用范围和消费端代码。取消接口幂等返回成功，并不证明云端状态已经释放。对于怀疑被消费端业务过滤的路径，缺少消费日志时仍保留为候选断点。',
      ],
      chart: { type: 'branches', title: '按证据区分两个预启动失败路径', start: '新的预启动请求无法推进', branches: [
        { condition: '本地旧 Session 仍存在', result: '本地生命周期未结束', detail: '追踪 cancel / end / finalizer / destroy 的收口证据' },
        { condition: '本地 Session 已丢，云端仍预启动', result: '跨组件状态没有收敛', detail: '核对取消响应、事件内容、消费处理与云端最终状态' },
        { condition: '消费端日志或配置证据缺失', result: '停在已确认边界', detail: '说明待查项，不把可疑代码路径写成完整根因' },
      ], note: '判断分支为已讨论案例的调查方法，不是系统内部完整状态机。' },
      conclusion: '接口结果、进程状态和业务状态要分别验证；定位到原因、完成修复和验证恢复也是不同阶段。',
    },
    {
      id: 'evaluation', title: 'Evaluation：验证 Skills 是否真的有贡献',
      summary: '历史案例回放、自动规则检查和人工复核已实际运行。',
      paragraphs: [
        '用例包含原始用户输入、脱敏日志与数据库快照、对应版本代码和可调用工具，并定义预期原因或允许停止的边界。同时写明必须引用的证据与禁止结论，避免只因猜中根因就算通过。',
        '离线回放用固定材料或模拟 MCP 返回值，验证路由、查询参数与证据关联。隔离环境集成测试再检查真实 MCP 的连接、权限、分页、超时与查询范围。模型、材料、工具和预算保持一致，对照有无 Skills 的结果，并重复运行观察稳定性。',
      ],
      chart: { type: 'architecture', title: '评测与回归路径', lanes: [
        { title: '历史故障用例', subtitle: '固定输入与预期边界', nodes: [{ title: '事实与环境', detail: '日志 / 快照 / 版本代码 / 工具' }, { title: '判定规则', detail: '预期原因、必需证据、禁止结论' }] },
        { title: '同条件对照', subtitle: '多次运行', nodes: [{ title: '基础 Agent + MCP', detail: '相同模型、工具、材料、预算' }, { title: 'Agent + MCP + Skills', detail: '增加领域方法，观察判断与稳定性', accent: true }] },
        { title: '检查与迭代', subtitle: '离线 + 隔离环境', nodes: [{ title: '自动规则 / 人工复核', detail: '范围、结论、证据、不确定性、效率' }, { title: '失败分类与回归', detail: '知识 / 工具契约 / 取证 / 错误归因' }] },
      ], links: ['两组均使用相同用例 → 检查结果', '真实误判 → 补反例与规则 → 重新回放'], note: 'LLM as judge 尚未实施；未公开量化对照结果。' },
      table: { headers: ['结果', '评测判断'], rows: [['证据不足，但准确说明缺口', '可以通过'], ['根因猜对，但引用错任务证据', '不能通过'], ['未经授权执行写入或重启', '单独判为硬失败'], ['工具顺序与参考过程不同', '依据质量判断，不要求逐步照抄']] },
      conclusion: '质量基准是证据支持和操作边界，效率只在成功用例中比较。',
    },
  ],
  'startup-analysis': [
    {
      id: 'architecture', title: '分析架构：确定性事实与业务推理分层',
      summary: '程序负责数据与计算，Skill 提供业务语义，LLM 负责选择、关联和解释。',
      paragraphs: [
        '支持定时、用户主动发起和异常告警三种触发方式。定时分析帮助研发、产品识别阶段耗时和流程卡点；告警分析则为运维、测试、售前及技术支持提供第一轮业务调查结果。',
        '查询、聚合和变化量计算由固定 SQL 与 Python 分析能力完成，先形成结构化上下文。LLM 不自由生成报表数字，而是结合状态含义与业务规则选择分析方向，将事实组织为有依据的报告。',
      ],
      chart: { type: 'architecture', title: '从触发到报告的职责架构', lanes: [
        { title: '触发与事实准备', subtitle: '确定性程序', nodes: [{ title: '定时 / 主动 / 告警', detail: '进入分析任务' }, { title: '查询与计算', detail: '监控、MySQL、分析平台；固定 SQL / Python' }, { title: '结构化上下文', detail: '指标、实例状态、预启动结果、灰度标签' }] },
        { title: '语义分析', subtitle: 'LLM + 领域 Skill', nodes: [{ title: '选择领域 Skill', detail: '按现象与事实选择业务知识', accent: true }, { title: '关联事实与规则', detail: '阻塞条件、影响范围、灰度特征' }, { title: '组织分析报告', detail: '证据、解释、待查问题与建议' }] },
        { title: '交付与决策', subtitle: 'Webhook + 人员', nodes: [{ title: '下游通知', detail: '邮件或企微等下游通道' }, { title: '支持团队 / 运维', detail: '决定止损、停止灰度或回滚' }, { title: '研发 / Ask-Venture', detail: '承接上下文，继续根因调查' }] },
      ], links: ['先准备结构化事实 → 再选择 Skill 与分析', '报告通过下游触达使用者 → 人员决策', '研发携带报告上下文继续调查，而非自动修复'], note: '展示职责与数据流，未公开内部接口或定时频率。' },
      conclusion: '把“数字从哪里来”和“业务上意味着什么”分开，才便于核对报告。',
    },
    {
      id: 'alert-sequence', title: '告警时序：先完成第一轮调查，再支持止损',
      summary: '先把上下文准备好，减少支持人员反复向多个角色介绍现场的成本。',
      paragraphs: [
        '告警触发后，程序加载监控和告警信息，并预先查询实例状态、预启动结果与灰度标签。LLM 在这些事实基础上选择对应业务 Skill，必要时调用分析能力，再输出业务解释。',
        '报告帮助支持人员定位受影响群体，通知运维处理。随后研发读取报告，将上下文交给 Coding Agent，通过 Ask-Venture 查日志、运行状态与代码。这里是人员衔接的调查流程，不声称两个系统已建立自动闭环接口。',
      ],
      chart: { type: 'sequence', title: '一次告警分析与人员协作', actors: ['触发入口', '程序 / 数据', 'LLM / Skill', '人员 / 研发'], steps: [
        { from: 0, to: 1, label: '告警、主动请求或定时任务进入' },
        { from: 1, to: 1, label: '查询并计算：准备结构化事实', note: true },
        { from: 1, to: 2, label: '提交指标、状态、预启动结果与灰度标签' },
        { from: 2, to: 2, label: '选择 Skill，关联规则并组织证据', note: true },
        { from: 2, to: 3, label: '分析报告经下游通知交付' },
        { from: 3, to: 3, label: '人员止损；研发携上下文继续根因调查', note: true },
      ], note: '典型流程示意；报告推送成功与通知实际送达分开验证。' },
      table: { headers: ['第一轮调查', '后续深度调查'], rows: [['业务阻塞条件是什么', '预启动具体在哪一步失败'], ['影响集中在哪些实例、灰度群体', '关联日志、运行配置与代码根因'], ['提供停止灰度或回滚的依据', '研发修复并独立验证恢复']] },
      conclusion: '先给出足以支持止损的业务证据，再继续追查技术根因。',
    },
    {
      id: 'allocation-case', title: '业务案例：可用实例充足，却无法分配',
      summary: '基础状态与业务准入条件属于不同层次，报告需要把两者联系起来。',
      paragraphs: [
        '历史故障中，监控可用实例数量充足，用户仍在分配排队。排查发现该业务要求预启动成功才能分配；基础状态正常的机器中，预启动失败集中在最近灰度的实例上。那次故障最终通过回滚恢复。',
        '分析 Agent 将实例状态、预启动结果与灰度特征交叉解释。报告可以指出阻塞条件和受影响范围，但灰度相关性本身不证明具体代码根因。这里保留历史故障与现有工具流程的区别，不将两者拼成未经确认的全自动实战。',
      ],
      chart: { type: 'branches', title: '从指标到可分配条件的判断', start: '基础可用实例充足，但用户仍排队', branches: [
        { condition: '检查该业务分配前置规则', result: '必须预启动成功', detail: '基础健康只说明一部分条件，不等于满足业务准入' },
        { condition: '关联实例预启动结果', result: '识别真正阻塞分配的群体', detail: '报告解释“可用但不可分配”的差别' },
        { condition: '叠加灰度标签与异常分布', result: '支持止损与进一步调查', detail: '支持人员联系运维；研发继续定位预启动失败原因' },
      ], note: '这是该业务案例的规则，不推广为全部实例均必须预启动。' },
      table: { headers: ['报告需要交付的内容', '使用方式'], rows: [['业务阻塞条件与支持证据', '支持人员解释当前排队现象'], ['受影响实例与灰度关联', '为停止灰度、回滚提供依据'], ['未确认项与后续调查方向', '研发使用 Ask-Venture 继续定位'], ['定时阶段耗时与卡点', '研发和产品安排流程优化']] },
      conclusion: '模型的价值是连接指标与业务语义，不是把相关性包装成根因。',
    },
  ],
  'content-delivery': [
    {
      id: 'architecture', title: '交付架构：中心到边缘，再到实例',
      summary: '把内容交付拆为装载、分发、部署和加速四个领域，分别定义职责与完成条件。',
      paragraphs: [
        '装载机将客户游戏内容按平台格式打包，上传自有 OSS。边缘机房分发机下载内容并制作 Ceph 快照，实例通过 rbd-client 克隆出克隆盘并挂载。部署盘是 L3 网络盘，加速再将内容拷贝或下载到更快的介质。',
        '业务规模约 1.5 万路订单，存在单开和双开，不能等同于机器数。实例只有 1–2 Gbps 带宽，两小时又是全部版更的窗口，因此优化要覆盖所有阶段，而不仅是单次下载。',
      ],
      chart: { type: 'architecture', title: '四领域交付架构与数据产物', lanes: [
        { title: '中心侧', subtitle: '装载', nodes: [{ title: '客户游戏内容', detail: '大型游戏包，超过 200 GB' }, { title: '装载机', detail: '平台格式打包分片，不压缩' }, { title: '自有 OSS', detail: '上传并保存分发内容', accent: true }] },
        { title: '边缘机房', subtitle: '分发', nodes: [{ title: '分发机', detail: '下载内容，制作 Ceph 快照' }, { title: 'Dragonfly P2P', detail: '机房内改善并发下载效率' }, { title: 'Ceph 快照', detail: '供实例克隆部署' }] },
        { title: '实例侧', subtitle: '部署 / 加速', nodes: [{ title: 'rbd-client 克隆与挂载', detail: 'L3 Ceph 网络盘，部署后即可运行', accent: true }, { title: 'L2 SSD / L1 内存盘', detail: '按加速策略拷贝或下载内容' }, { title: '双开同实例内容复用', detail: '第二路可利用第一路已有内容' }] },
      ], links: ['装载机 → OSS → 边缘分发机 → Ceph 快照', 'Ceph 快照 → 实例克隆盘 → 挂载并对外服务', '后置加速 → 更快的介质；不是强制 L3 → L2 → L1 顺序'], note: '领域与产物示意，不公开内部部署拓扑和地址。' },
      table: { headers: ['阶段', '优化与观测口径'], rows: [['装载', '重点业务独立高性能机器 + rclone 文件差量；多轮平均约 15 分钟'], ['分发', 'P2P + CDC + 分片流水线；多次 P98 耗时平均约 40 分钟'], ['部署', '从快照克隆挂载；多次 P98 耗时平均约 5 分钟'], ['加速', '受限速策略影响，按完成比例与长尾观察']] },
      conclusion: '每阶段有自己的产物和完成条件，才能看清谁阻塞了开服。',
    },
    {
      id: 'critical-path', title: '关键路径：部署先行，加速后置',
      summary: '先满足业务可用数量，再在带宽约束下提升运行性能。',
      paragraphs: [
        '如果把加速完成视为开服前置条件，每台机器都要等待大体积内容复制。实际部署后的 Ceph 盘已经可运行游戏，所以将部署可用与加速完成分开：挂载后先外放，再限速执行加速。',
        '取舍是部分实例会先从网络盘运行，访问性能与完成加速后不同，但能优先保障开服窗口。业务至少要求 95% 成功率，故障机器通过冗余容量补足，不能让少量需要运维修复的机器拖住全部交付。',
      ],
      chart: { type: 'branches', title: '部署完成后的两条业务路径', start: 'Ceph 克隆盘已挂载，部署完成', branches: [
        { condition: '路径一：优先恢复业务容量', result: '实例外放，游戏从 L3 启动', detail: '机器达到可用状态，保障开服所需实例数量' },
        { condition: '路径二：后台限速加速', result: '逐步改善存储访问性能', detail: '向更快介质拷贝或下载，不再阻塞开服' },
        { condition: '个别机器故障', result: '冗余机器保障业务需求', detail: '故障实例等待运维处理，不承诺全部机器按时完成' },
      ], note: '两条业务工作分离示意，不表示实际调度线程或固定并发策略。' },
      conclusion: '约 70 分钟超过 98% 机器部署可用；加速完成时间另行统计。',
    },
    {
      id: 'delta-pipeline', title: '传输优化：更少的数据，更少的串行等待',
      summary: 'CDC 降低传输量，打包控制文件粒度，分片让上传与下载可以重叠。',
      paragraphs: [
        '一次代表性对比中，约 200 GB 游戏包，文件级差量仍有约 170 GB，CDC 后差量约 15 GB。内容领域采用全局唯一 ID 标识包，而不是绑定游戏集 ID + version，使不同游戏集的包也能进行差量计算。',
        '曾验证不打包以节省本地处理时间，但文件数量和 peer 增加时观察到 Dragonfly 内存急剧增长，因此保留打包。压缩虽然减少下载量，却增加压缩与解压时间，测试没有端到端收益，最终使用打包分片、不压缩。',
      ],
      chart: { type: 'sequence', title: '分片流水线：阶段重叠示意', actors: ['装载机', 'OSS', '边缘分发机'], steps: [
        { from: 0, to: 0, label: '准备分片 A（打包，不压缩）', note: true },
        { from: 0, to: 1, label: '上传已准备的分片 A' },
        { from: 0, to: 0, label: '继续准备后续分片', note: true },
        { from: 1, to: 2, label: '已上传分片开始下载' },
        { from: 0, to: 1, label: '后续分片持续上传' },
        { from: 1, to: 2, label: '后续分片持续下载' },
      ], note: '表示阶段可重叠，不代表精确耗时、分片协议或固定调度次序。' },
      table: { headers: ['候选方案', '观察与决策'], rows: [['游戏集 ID + 版本作为内容身份', '限制跨游戏集 CDC；选择内容包全局唯一 ID'], ['不打包，直接分发大量文件', 'peer 与文件增多时内存压力大；保留打包'], ['打包并压缩', '压缩/解压成本抵消传输收益；关闭压缩'], ['打包分片', '让准备、上传与下载阶段重叠']] },
      conclusion: '看端到端交付时间和稳定性，而不只看压缩率或单机下载速度。',
    },
    {
      id: 'tail-optimization', title: '长尾优化：第二路复用第一路的内容',
      summary: '按完成分布找到双开实例，而不是只看整体平均速度。',
      paragraphs: [
        '约 140 分钟时，90% 机器加速完成，剩余约 10% 主要是双开机器的第二路未完成。观察后调整算法，让第二路利用同实例第一路已有内容进行加速，将收尾时间从约 210 分钟缩短至约 160 分钟。',
        '多轮压测典型水平约为 70 分钟超过 98% 部署可用、140 分钟 90% 加速完成、160 分钟 99% 加速完成。数据经脱敏取整、基于回忆，不插值为连续曲线；加速受限速影响，也不作为纯下载性能基准。',
      ],
      chart: { type: 'architecture', title: '双开实例的内容来源调整', lanes: [
        { title: '已有来源', subtitle: '中心与机房内容', nodes: [{ title: '远端内容 / 网络盘', detail: '在实例带宽和加速限速约束内获取内容' }] },
        { title: '同一实例', subtitle: '第一路', nodes: [{ title: '已加速内容', detail: '第一路已有内容可供复用', accent: true }] },
        { title: '同一实例', subtitle: '第二路', nodes: [{ title: '利用第一路加速', detail: '减少第二路等待，改善完成长尾', accent: true }] },
      ], links: ['观察：第二路落后 → 来源调整：利用同实例第一路已有内容', '不公开具体拷贝实现；不将它解释为 CDC 或 reflink'], note: '内容复用关系示意；210 分钟旧方案的精确百分位未确认。' },
      conclusion: '优化前先知道卡在哪一类实例上，才能针对完成长尾改进。',
    },
  ],
  'instance-orchestration': [
    {
      id: 'architecture', title: '领域分工：资源任务与业务占用之间的协调层',
      summary: 'IaaS 不需要直接理解用户会话，实例领域承接任务与执行约束。',
      paragraphs: [
        '运营在前端筛选一批机器并提交退订或维护任务。调度领域维护用户占用，向实例领域同步；CGInstance 维护实例信息、云端状态、实例锁、状态机与待执行任务。',
        '两个业务约束贯穿全程：用户占用中不执行后台任务，任务执行中不允许实例被外放。锁协调冲突操作，下调度阻止新分配，两者不能相互替代。',
      ],
      chart: { type: 'architecture', title: '任务、状态与执行的责任边界', lanes: [
        { title: '业务与调度', subtitle: '使用状态', nodes: [{ title: '运营页面', detail: '筛选实例，批量提交任务' }, { title: '调度领域', detail: '占用状态、禁止新分配、恢复调度' }] },
        { title: '实例领域', subtitle: 'CGInstance', nodes: [{ title: '状态与准入', detail: '实例状态、项目保留数检查' }, { title: '实例锁 / 待执行任务', detail: '隔离冲突，等待执行条件', accent: true }, { title: '数据库持久化', detail: '保留任务执行数据' }] },
        { title: '执行与资源', subtitle: '无状态 worker', nodes: [{ title: '定时扫描', detail: '未占用 + 有待执行任务' }, { title: 'activity 执行', detail: '锁定、下调度、后台操作' }, { title: 'IaaS 接口', detail: '退订等资源操作' }] },
      ], links: ['调度占用变化 → CGInstance 状态同步', 'CGInstance → 同步下调度 → 确认禁止新分配', '满足条件的持久化任务 → worker 执行'], note: '职责示意；CGInstance 是云端实例领域，不是 CGInstanceAgent。' },
      conclusion: '把用户使用与资源操作的约束集中表达，减少跨层业务耦合。',
    },
    {
      id: 'execution-sequence', title: '执行时序：同步下调度，再等待并执行',
      summary: '用维护类任务说明完整闭环；退订成功则按终止资源分支收尾。',
      paragraphs: [
        'CGInstance 检查状态与项目保留数后立即抢锁，再同步请求调度领域下调度。确认不再接受新分配，已有用户仍在时先等待；退出由调度感知并同步占用变化。',
        '定时任务扫描空闲且有待执行任务的实例。执行后确认任务结束和实例可用，必要时调用巡检，再恢复调度和释放锁。与退订不同，只有需要继续提供服务的实例才进入恢复调度分支。',
      ],
      chart: { type: 'sequence', title: '维护任务：接入、隔离、执行、恢复', actors: ['运营 / 请求方', 'CGInstance', '调度领域', 'worker / 任务'], steps: [
        { from: 0, to: 1, label: '批量提交任务，校验状态与项目保留数' },
        { from: 1, to: 1, label: '抢实例锁', note: true },
        { from: 1, to: 2, label: '同步下调度：禁止新分配' },
        { from: 2, to: 1, label: '确认下调度；用户退出后同步占用状态' },
        { from: 1, to: 3, label: '定时扫描：未占用且有待执行任务' },
        { from: 3, to: 1, label: '任务执行完成，确认实例可用 / 巡检' },
        { from: 1, to: 2, label: '恢复调度（需要继续服务的任务）' },
        { from: 1, to: 1, label: 'CGInstance 负责释放实例锁', note: true },
      ], note: '业务顺序示意，不公开接口名；下调度是同步请求，不是异步事件消费。' },
      conclusion: '先隔离新分配，再等待已有占用退出，最后执行后台操作。',
    },
    {
      id: 'recovery', title: '失败与重启：策略处理，持久化恢复',
      summary: '等待、失败和执行进程重启都需要被流程显式承接。',
      paragraphs: [
        '锁实例、下调度、后台任务均属于 activity，失败后根据配置自动重试，或保持锁定等待处理。失败不意味着立刻释放实例并重新外放，否则任务与用户使用可能再次冲突。',
        'worker 无状态，所有执行数据保存在数据库表中，重启后可重新执行。这个机制使任务不依赖单个进程生命周期；是否会重复产生副作用仍取决于具体 activity 的实现，不能从持久化本身推导出恰好一次保证。',
      ],
      chart: { type: 'branches', title: 'activity 结果与执行恢复分支', start: '执行锁定、下调度或后台任务 activity', branches: [
        { condition: '执行成功', result: '推进后续步骤', detail: '任务类型决定检查可用、恢复服务或终止资源' },
        { condition: '失败，策略允许重试', result: '自动重试', detail: '保留任务执行数据；次数与退避未在本案例展开' },
        { condition: '失败，策略要求等待处理', result: '保持锁定', detail: '保留现场与冲突隔离，由后续处理推进' },
        { condition: 'worker 重启', result: '从数据库数据重新执行', detail: '实例锁仍由 CGInstance 统一管理和释放' },
      ], note: '失败处理示意，不宣称自动解锁、恰好一次或完整幂等保证。' },
      table: { headers: ['个人贡献', '协作范围'], rows: [['主导系统设计与实现', '实例状态、锁、批处理和失败恢复整体设计'], ['同事参与', '部分 worker 执行逻辑与 IaaS 接口封装']] },
      conclusion: '将流程状态与执行进程分开，再按风险决定重试还是保留锁等待处理。',
    },
  ],
  'agent-management': [
    {
      id: 'architecture', title: '部署边界：实例侧 Agent 与云端 Union 服务',
      summary: 'CGInstanceAgent 在实例内运行；CGInstanceMorintor 是对应的云端 Union 服务。',
      paragraphs: [
        'CGInstanceAgent 随系统镜像内置，是实例侧管理入口，负责其他 Agent 的安装、卸载、更新，并统一实例业务状态。CGVmAgent 承担云游戏业务，lightstreamer 承担串流，CGMetricsAgent 负责指标统一采集。',
        '其他 Agent 先将业务状态交给 CGInstanceAgent，再上报云端 CGInstanceMorintor。这里要区分实例内服务与云端接收服务，也要区分 Agent 健康、机器资源信息与业务是否可对外服务。',
      ],
      chart: { type: 'architecture', title: '实例与云端的服务边界', lanes: [
        { title: '实例内业务 / 运维 Agent', subtitle: '实例侧', nodes: [{ title: 'CGVmAgent', detail: '云游戏业务' }, { title: 'lightstreamer', detail: '串流业务' }, { title: 'CGMetricsAgent', detail: '统一指标采集' }] },
        { title: '实例内管理 Agent', subtitle: '镜像自带', nodes: [{ title: 'CGInstanceAgent', detail: '服务生命周期管理、统一业务状态', accent: true }, { title: '心跳与业务上报', detail: '健康 / 网络资源，以及业务服务状态' }] },
        { title: '云端 Union 服务', subtitle: '实例之外', nodes: [{ title: 'CGInstanceMorintor', detail: '对应的云端服务', accent: true }, { title: '云端记录与超时判断', detail: '业务状态写表；五周期无心跳标记关机' }] },
      ], links: ['实例内其他 Agent → CGInstanceAgent：业务状态', 'CGInstanceAgent → CGInstanceMorintor：业务状态与心跳', '运维云端触发安装 → CGInstanceAgent 执行 → 收到 Agent 状态后判定成功'], note: '服务名按项目实际命名保留；不将 CGInstanceAgent 画入 Union 云端边界。' },
      conclusion: '实例侧统一管理与汇聚，云端负责接收和状态记录，角色边界清楚。',
    },
    {
      id: 'update-sequence', title: '更新时序：先自更新，再更新 Bundle',
      summary: '无盘裸金属重启还原镜像，部署必须在实例准备阶段重新校准版本。',
      paragraphs: [
        '最初 Bundle 只需要保证任务执行完时 Agent 已部署。实例从 KVM 转为无盘裸金属后，重启会恢复系统镜像，之前安装的程序随之被还原，原有的一次性部署模型不再足够。',
        '最终分为两层更新：Agent 自更新先更新 CGInstanceAgent 自身；随后 bootload 对比云端记录与本地其他 Agent 版本，不一致就执行 Bundle 自更新。云端目标版本与本地实际版本由此在准备阶段重新对齐。',
      ],
      chart: { type: 'sequence', title: '实例准备阶段的版本收敛', actors: ['系统镜像 / 实例', 'CGInstanceAgent', '云端版本记录', '其他 Agent'], steps: [
        { from: 0, to: 1, label: '重启后从镜像内置服务启动' },
        { from: 1, to: 1, label: '先执行 Agent 自更新：更新自身', note: true },
        { from: 1, to: 2, label: 'bootload 对比云端记录与本地 Agent 版本' },
        { from: 2, to: 1, label: '取得目标版本差异' },
        { from: 1, to: 3, label: 'Bundle 自更新：更新版本不一致的其他 Agent' },
        { from: 3, to: 1, label: '对应 Agent 状态上报，确认部署成功' },
      ], note: '云端版本记录与具体数据访问接口未展开；不补写灰度、回滚等更新能力。' },
      table: { headers: ['机制', '更新对象与时机'], rows: [['Agent 自更新', 'CGInstanceAgent 自身；先执行'], ['Bundle 自更新', '其他 Agent 程序；实例准备时由 bootload 对比版本'], ['部署成功判定', 'CGInstanceAgent 收到对应 Agent 的状态上报']] },
      conclusion: '不是重启后保留旧安装，而是按云端目标重新建立正确版本。',
    },
    {
      id: 'reporting-sequence', title: '业务状态：变化上报与最终收敛',
      summary: '把状态比较下放实例侧，云端收到业务状态直接写表。',
      paragraphs: [
        '面对约 20 万实例，最初方案在云端收到业务上报后查表比较，不一致才写表。曾考虑 Redis 缓存实例状态，但综合容量、性能与依赖复杂度后，选择将比较放到实例 Agent 端。',
        '本地状态变化后开启业务上报，直到成功；失败持续重试。每隔 10 分钟还有兜底上报，用于修正云端偏差。因此“变化上报”不是只发一次，也不是永远没有周期性业务状态同步。',
      ],
      chart: { type: 'sequence', title: '状态变化、失败重试与周期兜底', actors: ['其他 Agent', 'CGInstanceAgent', 'CGInstanceMorintor', '云端状态表'], steps: [
        { from: 0, to: 1, label: '业务状态上报：是否能对外提供服务' },
        { from: 1, to: 1, label: '比较本地状态，变化时开启上报', note: true },
        { from: 1, to: 2, label: '发送业务状态；失败持续重试直到成功' },
        { from: 2, to: 3, label: '收到后直接写表，不再前置比较' },
        { from: 1, to: 2, label: '每隔 10 分钟兜底上报' },
        { from: 2, to: 3, label: '让云端重新收敛到实际业务状态' },
      ], note: '失败重试的退避、抖动和乱序处理未展开，不补写具体实现。' },
      table: { headers: ['选择', '取舍'], rows: [['云端每次查表比较', '公共存储承担重复读取与状态比较'], ['增加集中式缓存', '需要额外评估容量、性能与依赖复杂度'], ['实例侧比较 + 变化上报', '分散比较、减少重复上报；用重试和周期兜底补足收敛']] },
      conclusion: '这里不证明 Redis 不能承载，而是选择了更符合该场景的职责拆分。',
    },
    {
      id: 'heartbeat', title: '心跳与业务状态：两个信号分别判断',
      summary: '管理 Agent 健康，不自动等于云游戏与串流服务可用。',
      paragraphs: [
        '心跳反映 CGInstanceAgent 健康、机器网络资源等；业务状态表示相应服务能否对外提供服务。云端连续五个周期没有收到对应实例的心跳，就将实例业务状态标为已关机。',
        'CGInstanceAgent 感知心跳发送失败时也会触发业务上报，恢复后结合失败重试与 10 分钟兜底，让云端回到正确状态。心跳超时只是一种故障判定，不能据此断言机器已经物理断电。',
      ],
      chart: { type: 'branches', title: '心跳信号与状态纠偏', start: 'CGInstanceAgent 心跳与业务状态分别上报', branches: [
        { condition: '云端五个周期未收到心跳', result: '标记实例“已关机”', detail: '这是超时判定，可能涉及网络或上报链路' },
        { condition: '实例感知心跳发送失败', result: '触发业务状态上报', detail: '不等同于实例能直接知道云端所有超时判定' },
        { condition: '业务状态变化或周期兜底', result: '重试直至上报成功', detail: '修正心跳异常期间形成的云端状态偏差' },
      ], note: '心跳周期具体秒数未公开；20 万为设计承载规模，不换算未验证 QPS。' },
      conclusion: '将健康信号、业务可用性和云端判定拆开，故障解释才不会混淆。',
    },
  ],
};
