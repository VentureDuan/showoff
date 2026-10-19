# 接入 Sites 并公开发布

Status: ready-for-agent

## 范围

配置站点 ID、静态目录与 canonical 地址，验证构建，保存并部署版本，开放公开访问。

## Comments

- 初始 `git status --short` 为空。
- `npm run check` 已通过：18 files, 0 errors, 0 warnings, 0 hints。
- Sites 项目：`appgprj_6ad5e0c31c788191850ace3fcc2c2ad4`。
- 平台地址：`https://venture-duan.taotao-today.chatgpt.site`。
- 正式构建成功：31 pages；343 处站内导航与资源引用无缺失；所有页面已生成平台域名 canonical。
- 本地预览返回 HTTP 200，浏览器确认首页、文章列表与 ratelimit 搜索结果正常。
- 仅新增 Sites manifest、配置 canonical 默认域名和更新部署文档，未改动页面设计与内容。
- 下一步：Sites source helper 保存并推送此次源码、打包、部署，再将访问权限设为 public。
