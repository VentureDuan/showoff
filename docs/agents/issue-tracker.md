# 任务跟踪：Local markdown

任务和规格保存在 `.scratch/`。

## 文件约定

- 每个功能使用一个目录：`.scratch/<feature-slug>/`。
- 规格：`.scratch/<feature-slug>/spec.md`。
- 实现任务：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，
  从 `01` 编号，每个任务独立一个文件。
- 任务文件顶部附近使用 `Status:` 记录 triage 状态，
  状态值见 `triage-labels.md`。
- 评论和讨论追加到文件末尾的 `## Comments` 下。

## 技能操作

“发布到任务跟踪器”：在对应功能目录中创建文件。
“获取相关任务”：读取用户提供的任务路径或编号对应的文件。

## Wayfinder 约定

- 工作地图：`.scratch/<effort>/map.md`，
  包含 Notes、Decisions-so-far、Fog。
- 子任务：`.scratch/<effort>/issues/NN-<slug>.md`。
- `Type:` 为 research、prototype、grilling 或 task。
- Wayfinder 的执行状态使用 `Status: open`、
  `Status: claimed` 或 `Status: resolved`。
- `Blocked by: NN, NN` 记录依赖；
  所有依赖均 resolved 时解除阻塞。
- 按编号选择首个 open、未阻塞且未领取的任务。
- 开始工作前保存 `Status: claimed`。
- 完成后在 `## Answer` 下追加答案，设为 resolved，
  并向 map.md 的 Decisions-so-far 追加摘要和链接。

Wayfinder 执行状态与普通任务的 triage 状态按各自工作流使用。
