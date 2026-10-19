# 本地实现交付记录

## 已交付

- /projects/：五项案例，顺序与用户确认一致。
- /projects/ask-venture/、/projects/startup-analysis/：技术案例替换旧文章模板。
- /projects/content-delivery/、/projects/instance-orchestration/、/projects/agent-management/：新增工程案例详情。
- /projects/cloud-gaming/：保留旧 URL、概述及章节，增加三个工程案例入口。
- 首页：代表项目接入同一份内容与证据链图解。
- 预览：共用组件与数据，保留 noindex，正式页面不链接到预览。
- 五项共 18 幅技术图：按用户最新要求完整静态展示；已移除全部播放、暂停、重播、进度及步骤高亮，不依赖 JS。
- 章节目录、窄屏横向滚动与展开文字步骤继续保留，正式页与预览同步。

## 内容来源

摘要：src/data/project-stories.ts；技术内容：src/data/project-technical.ts。
共享页面组件 ProjectStoriesIndex / ProjectStoryDetail；静态图解组件 TechnicalFigure。FigurePlayback 与 src/scripts/figure-flow.ts 已删除，相关样式与数据属性已清除。未新增依赖。

## 当前静态版本验证

- npm run check：27 个文件，0 errors / warnings / hints。
- npm run build：40 页，成功。
- 构建 HTML 检查：正式页保留 18 幅静态技术图；正式与预览共 10 个详情页均不存在播放控件、flow 包装与动态数据属性，章节目录保留。
- git diff --check：通过，仅行尾转换提示。

## 前一动态版本验证（历史记录）

- npm run check：29 个文件，0 errors / warnings / hints。
- npm run build：40 页，成功。
- 构建 HTML 验证：18 个正式页播放器；正式页 canonical、预览 noindex 正确；项目链接与章节锚点均有目标，无重复 ID；旧四章节锚点和云游戏概览链接保留；正式页没有预览链接。
- 浏览器定向交互：从预览进入正式 Agent 管理页；下一步显示第 1/6 步；键盘 End 选择第 6/6 步且下一步禁用；播放从头开始并显示暂停；暂停保持第 2/6 步。
- 重播验证：从第 1 步重新开始播放；全图验证：进度恢复 0/6、播放停止，恢复全图。
- 实际截图：evidence/flow-demo.png。
- 减少动态效果与关闭 JS 的降级通过源码和构建 HTML 检查，未实机模拟这两种浏览器设置。未运行完整跨浏览器/跨视口验收。

## 边界

仅本地实现与验证。未提交、推送、同步或部署；未处理既有 .scratch/sites-publish/issues/01-publish.md 改动。部署需要用户另行授权。
