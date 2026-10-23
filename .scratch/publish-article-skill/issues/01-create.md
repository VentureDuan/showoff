# 创建与验证技能

Status: ready-for-human

## 验收

- `.agents/skills/publish-article/SKILL.md` 与显式调用配置有效。
- 内容保留、图片、日期、重复发布、无关改动、失败停止与回滚均有明确处理。
- README 提供调用示例；技能校验和 diff 检查通过。

## 完成记录

- 已创建 SKILL.md、agents/openai.yaml 和腾讯云发布参考，README 已添加调用方式。
- quick_validate.py 通过；YAML 显式调用策略与参考文件存在性检查通过；git diff --check 通过。
- 本次仅创建技能与文档，未再次部署网站，未提交或推送 Git。
- 应用内技能选择器的实际加载需在后续会话确认；官方文档说明自动发现，未出现时重启 Codex。
