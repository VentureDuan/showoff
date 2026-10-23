# 段锦涛的个人网站

白底橙黄 Bento 首页、项目详情、简历，以及 Markdown 文章与学习札记。Astro 静态生成，无登录、评论、统计、数据库或服务端运行依赖。

## 本地使用

需要 Node.js >=22.22.0、npm >=9.6.5。

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

开发与构建预览默认 http://127.0.0.1:4321/ ，不能同时占用同一端口。

## 内容维护

在本项目 Codex 会话中，可显式调用项目技能发布文章：

```text
$publish-article 帮我发布 "D:\workspace\blog\文章.md"
```

技能位于 `.agents/skills/publish-article/`，会保留原文、接入文章、检查构建、发布到腾讯云个人网站并验证线上结果。仅预览时明确说明“只做本地预览，不发布”。若当前会话尚未发现新技能，在本项目新建会话后调用，也可直接指定 `.agents/skills/publish-article/SKILL.md`。部署依赖本机可用的 `tencent-ubuntu` SSH 配置；不会自动提交或推送 Git。

- `src/data/profile.ts`：个人介绍、经历、技能与联系方式。
- `src/data/project-stories.ts`：五项项目的展示顺序、简介、职责与标签；首页、列表、正式详情和预览共用。
- `src/data/project-technical.ts`：项目技术章节、架构/时序/分支图数据与设计取舍。
- `src/content/projects/*.md`：保留原有素材；未纳入技术案例的 Markdown 项目仍生成兼容详情，`cloud-gaming` 入口展示三个工程案例与原概述。已纳入的项目以 `project-stories.ts` 和 `project-technical.ts` 为展示来源。
- `src/content/posts/**/*.md`：文章与札记，可使用子目录；正文支持 Markdown、代码高亮，目录自动生成。
- `src/content/resume.md`：网页简历。修改后运行 `npm run build`，下载版本会自动同步。
- `prototype/`：保留的设计探索，`npm run prototype`。不属于正式构建产物。

项目正式入口为 `/projects/`，预览入口 `/preview/projects/` 共用内容和组件，预览页设置 `noindex`。
详情中的技术图以完整静态图展示，无播放或轮播控件；窄屏时序图支持横向滚动与展开文字步骤，图解与正文不依赖 JavaScript。

文章示例：

```markdown
---
title: 一次技术实践
description: 用一句话说明文章讨论的问题。
date: 2026-10-16
dateLabel: 发布
kind: article
tags: [Go, 工程实践]
featured: true
draft: false
---

## 背景

正文……
```

`kind: note` 表示学习札记。`draft: true` 不生成详情页，也不进入列表、首页、搜索。
`featured: true` 在首页优先展示。没有原始日期时使用收录日期并填写 `dateLabel: 收录`，不要伪造发布日期。

文章与札记的列表默认按类型显示；输入关键词后，搜索双方标题、简介、标签与正文。搜索完全在浏览器本地进行。

图片放在 `public/images/`，正文引用 `![说明](/images/filename.png)`。不要使用本机绝对路径；Obsidian 双链需要先改成标准 Markdown 链接。

## 来源与编辑边界

首版个人资料来源于已有 2026-10-14 主简历；没有填入未经确认的性能收益。
博客迁移来自 `D:\workspace\blog`，只调整 frontmatter、标题与标题层级，原目录不改。
历史笔记未做技术校对，正文保留原有认识与代码；页面明确显示提示。

## 迁移已有博客

本次已从 `D:\workspace\blog` 迁入 22 篇内容（13 篇文章、9 篇札记）和 48 张配套图片。
原有 3 篇的访问地址和站点元数据保留；原目录保持不变。

若后续更新的是这批原始文章，可手动重新执行：

```sh
python scripts/migrate-blog.py
npm run build
```

这是单向覆盖正文的迁移，不是双向同步。站内旧版本会备份到 `.scratch/blog-migration/before-*`，
迁移记录在 `.scratch/blog-migration/manifest.json`。现有标题、日期、标签、分类和精选设置保留。
脚本按明确的文件清单迁移；原目录新增或重命名文件时会停止，需要先更新脚本中的映射。
在站内直接编辑过的正文再次迁移时会被原目录版本替换，请先选定维护位置。

## 部署

构建产物为 `dist/`，可以放在静态托管服务。当前路由按域名根路径部署；不支持直接放到 `/showoff/` 等子路径。
使用 ChatGPT Sites 托管，站点配置在 `.openai/hosting.json`，静态目录为 `dist`。
平台地址：<https://venture-duan.taotao-today.chatgpt.site>。

`astro.config.mjs` 默认使用该地址生成 canonical 链接；更换域名时，可通过构建环境变量 `SITE_URL` 覆盖。
本地修改不会自动上线：运行检查和构建后，通过 Sites 同步源码、保存版本并部署。
部署包仅包含静态产物，不包含 `prototype/`、`.scratch/` 等源码目录。

头像以姓名首字展示；简历支持 Markdown 下载与浏览器打印。没有独立 PDF 文件，PDF 可通过打印另存。
