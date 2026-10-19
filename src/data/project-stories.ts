export type DiagramKind = 'evidence' | 'analysis' | 'delivery' | 'tasks' | 'agents';
export interface ProjectStory {
  id: string;
  kind: DiagramKind;
  category: string;
  title: string;
  question: string;
  headline: string;
  intro: string;
  contribution: string;
  tags: string[];
  takeaway: string;
}

export const projectStories: ProjectStory[] = [
  {
    id: 'ask-venture', kind: 'evidence', category: 'AI 应用 / 深度调查',
    title: 'Ask-Venture Plugin',
    question: '跨模块排障，如何从线索走向证据？',
    headline: '让复杂的排障，\n有迹可循。',
    intro: '将真实故障中的调查经验组织成领域 Skills，连接日志、数据库、任务与实例，让研发、测试和运营沿着证据开展跨模块调查。',
    contribution: '独立完成用户调研、需求定义、设计开发、内部推广与迭代。',
    tags: ['MCP', '领域 Skills', 'Evaluation'],
    takeaway: '先找最后成功的步骤，再找最早失败的位置。',
  },
  {
    id: 'startup-analysis', kind: 'analysis', category: 'AI 应用 / 业务分析',
    title: '云游戏启动性能分析 Agent', question: '实例充足，用户为什么还在排队？',
    headline: '让告警后的第一轮调查，\n提前完成。',
    intro: '支持定时、主动和异常告警触发。程序准备结构化事实，LLM 结合业务规则分析解释，为支持人员止损、研发继续定位根因提供上下文。',
    contribution: '负责全部模块设计与实现。', tags: ['确定性计算', '业务 Skills', '调查报告'],
    takeaway: '监控上的“可用”，不等于业务规则中的“可分配”。',
  },
  {
    id: 'content-delivery', kind: 'delivery', category: '系统工程 / 内容交付',
    title: '内容分发与分层加速', question: '200 GB 以上的内容，如何应对两小时开服窗口？',
    headline: '先让实例可用，\n再让游戏跑得更快。',
    intro: '面对大型游戏包、1–2 Gbps 实例带宽与约 1.5 万路订单，将内容交付建模为装载、分发、部署与加速，围绕开服关键路径做优化。',
    contribution: '深度参与全流程，重点负责部署与加速。', tags: ['Ceph', 'CDC 差量', 'Dragonfly P2P'],
    takeaway: '部署完成即可从网络盘运行，加速不再阻塞开服。',
  },
  {
    id: 'instance-orchestration', kind: 'tasks', category: '系统工程 / 任务编排',
    title: '实例任务编排与调度协同', question: '用户还在使用时，资源任务如何安全推进？',
    headline: '让后台任务，\n等到正确的时机。',
    intro: '在 SaaS 与 IaaS 之间协调用户占用、实例调度和资源操作，用实例锁、同步下调度与持久化任务承接业务约束。',
    contribution: '主导系统设计与实现；部分 worker 执行逻辑及 IaaS 接口封装由同事完成。',
    tags: ['activity', '状态管理', '持久化恢复'], takeaway: '接收任务，与满足条件后执行，是两个阶段。',
  },
  {
    id: 'agent-management', kind: 'agents', category: '系统工程 / 实例侧架构',
    title: '实例 Agent 管理与状态收敛', question: '无盘实例重启后，服务和状态如何重新对齐？',
    headline: '实例会重置，\n服务仍要重新就绪。',
    intro: '以镜像内置的 CGInstanceAgent 管理其他服务，适应无盘裸金属的重置特性，并面向约 20 万实例设计业务状态与心跳汇聚。',
    contribution: '负责架构设计与实例侧代码实现。', tags: ['Bundle', '自更新', '状态收敛'],
    takeaway: '将状态比较下放到实例，用重试与周期上报保证收敛。',
  },
];
