# 腾讯云静态发布

以下是 2026-10-23 验证过的部署约定，每次发布先读实际配置，不能把旧记录当作当前状态。

| 项目 | 现有值 |
| --- | --- |
| SSH 别名 | `tencent-ubuntu`，由本机 SSH 配置提供凭据 |
| 公网入口 | `http://1.12.231.25:8080` |
| 发布根目录 | `/var/www/showoff/releases/` |
| 活跃软链接 | `/var/www/showoff/current` |
| 服务 | `showoff-nginx` |
| Nginx 配置 | `/opt/showoff/nginx.conf` |
| 构建 canonical | `SITE_URL=https://taotao-today.site` |

`taotao-today.site` 曾因备案被拦截，HTTPS 未完成；实际发布链接优先用通过本次 GET 验证的入口。`README.md` 中 Sites 是备用托管，不是本技能的发布目标。服务器 80 端口还服务原 reservation-ui，发布只切换 showoff 的 current 链接。

## 发布前

从项目根目录运行（PowerShell）：

```powershell
ssh -o BatchMode=yes -o ConnectTimeout=10 tencent-ubuntu 'readlink -f /var/www/showoff/current; cat /opt/showoff/nginx.conf; systemctl is-active showoff-nginx'
```

检查 SSH 退出码和输出，记录实际旧目录，确认 Nginx root 仍为 current、8080 仍指向个人网站。SSH 失败时保留本地成果并报告凭据/网络阻断，不索取私钥。目标发生变化时先查清，不擅自换服务器。

运行 `npm run check`，退出码为 0 后再构建。构建前暂设 `SITE_URL` 为上表值，运行 `npm run build`，完成后恢复原环境变量；显式检查原生命令 `$LASTEXITCODE`，失败时停止。不要发布旧 dist。

确认 `dist/writing/<slug>/index.html` 生成且正文完整，`dist/blog/index.html`（札记为 `dist/notes/index.html`）有正确入口，相关图片存在。运行 `git diff --check`。

## 上传与切换

选择唯一 release ID，例如 `20261023-201500-<slug>-<random>`，仅使用 `[a-z0-9-]`；下面所有占位符在执行前替换为本次明确值。不要把文章标题、正文或未校验路径拼入远程 shell。

1. 将 `dist/` 打包到任务目录的 `site.tar.gz`。Windows tar 使用相对路径可避免盘符歧义：

   ```powershell
   tar -czf .scratch/publish-<slug>/site.tar.gz -C dist .
   scp -o BatchMode=yes .scratch/publish-<slug>/site.tar.gz tencent-ubuntu:/tmp/showoff-<release-id>.tar.gz
   ```

   每条命令成功后才继续。上传前后使用 `Get-FileHash -Algorithm SHA256` / `sha256sum` 核对包的哈希。

2. 在远程执行 `set -eu`：先用 `mkdir /var/www/showoff/releases/<release-id>` 创建全新目录（已存在即停止），解包；检查文章文件非空，必要资源齐全。此时 current 仍指向旧版。
3. 切换前再次读取 current，确认它与发布开始记录的旧目录一致；若已被其他发布改变，停止以避免覆盖并发发布。
4. 创建唯一临时链接，再原子替换：

   ```sh
   set -eu
   ln -s /var/www/showoff/releases/<release-id> /var/www/showoff/current-<release-id>
   mv -Tf /var/www/showoff/current-<release-id> /var/www/showoff/current
   readlink -f /var/www/showoff/current
   ```

保留旧版目录。静态链接切换无需 reload/restart Nginx，不清理历史 release。

## 线上验收与失败恢复

从本机通过公网 GET 请求 `/writing/<slug>/` 与对应列表，确认 HTTP 200、最终 URL 未跳到拦截页面；对文章返回 HTML 与本地构建 HTML 做全文比对或 SHA256 比对，不能只查标题。检查首页按现有规则的入口，验证本次新增图片能读取且内容匹配。必要时检查浏览器渲染，尤其包含图片或复杂 Markdown 的文章。

切换后验收失败，先确认 current 仍指向自己的新 release；是则用唯一临时链接和 `mv -Tf` 恢复到记录的旧目录并验证旧入口；若已被其他发布改变则停止并报告，避免覆盖他人发布。最多执行一次回滚，保留失败目录和诊断证据。远程命令中断时先读取 current 判断真实状态，再决定下一步，不盲目重复切换。

回滚只恢复远程软链接，本地文章保留供修复。任务记录中写入本次实际旧目录、链接名和完整回滚命令，不能只留下占位符。
