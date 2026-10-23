# 接入与发布文章

Status: ready-for-human

## 验收

- 正文与源文件一致（除移入元数据的一级标题）。
- check/build 通过，文章出现在列表和首页。
- 腾讯云发布后公网正文匹配，保留旧版本。

## 完成记录

- 正文逐字符比对源文件通过，仅去除重复一级标题并添加 frontmatter。
- npm run check：0 errors、0 warnings、0 hints；build：41 pages。
- 发布目录：/var/www/showoff/releases/20261023-day23-2015；current 已切换。
- 上一版 /var/www/showoff/releases/36c210a 保留。
- 公网文章、/blog/ 和首页均 HTTP 200 并包含文章标题；线上文章 HTML 与本地构建产物完全一致。
- 未提交或推送 Git；未更新 Sites 备用站点。
