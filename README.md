# 刘松林 Solin · 个人网站

纯静态站点（3 个页面 + assets），无框架、无构建步骤。线上由 Cloudflare Pages 托管，源码放在 GitHub。

## 重要：这里只是发布产物

| 目录 | 作用 |
|---|---|
| `E:\WS\webpage` | **工作区**，真正改内容的地方（含 `tools/`、`partials/`、`backup/`） |
| `E:\WS\webpage-deploy` | **本目录**，只放线上要的文件，由 `python tools/export.py` 从工作区同步过来 |

不要在本目录手工改 HTML/CSS，改了下次导出会被覆盖。要改内容请回工作区。

## 目录结构

```
index.html          首页（门页入场 + hero + 三个 Q&A）
portfolio.html      照片墙（gallery 区块由 tools/build_wall.py 生成，勿手改）
about.html          关于我（头像 / 简介 / 书单 / 音乐 / 动画 / 调色板）
assets/style.css    样式，分 01–16 节
assets/main.js      交互，分 00–17 节
assets/hero/        首页两张封面（sunrise / bridge）
assets/img/         头像 avatar.jpg
assets/icons/       快门图标 shutter.png
assets/portfolio/thumbs/   墙面预览图（长边 1200）
assets/portfolio/large/    灯箱大图（长边 3200）
```

---

## 日常更新怎么做

### 一、加照片到照片墙

照片墙**不要手改 HTML**，它由脚本从照片母库自动生成。母库在 `E:\PhotoArchive`，**只读，不要改里面的原图**。

1. **筛选重命名**：新照片先进 `E:\PhotoArchive\Inbox_归集暂存`，用 XnView 选片、分「有 EXIF / 无 EXIF」，按拍摄日期重命名为 `YYYYMMDD_NN.jpg`（例：`20261120_01.jpg`）。
2. **归档**：核对无误后剪切进 `E:\PhotoArchive\Originals\00_EXIF_OK`（有 EXIF）或 `01_EXIF_LOST`（无 EXIF）。
3. **导出待上墙的**：把要上墙的图批量导出到 `E:\PhotoArchive\ForWeb`（有 EXIF）或 `E:\PhotoArchive\ForWeb_EXIF_LOST`（无 EXIF）。文件名保持 `YYYYMMDD_NN.jpg`。
4. **更新 EXIF 清单**（有 EXIF 的才需要）：
   ```powershell
   cd E:\WS\webpage
   python tools\archive_exif.py
   ```
   它读 `Originals\00_EXIF_OK`，只把**新文件名**追加进 `E:\PhotoArchive\照片EXIF清单.xlsx`，已有的跳过。
5. **重建照片墙**：
   ```powershell
   python tools\build_wall.py
   ```
   自动做两件事：生成 thumbs（1200）和 large（3200）两份派生图；重写 `portfolio.html` 的 gallery 区块（按拍摄日期倒序、按年份分组）。已下墙的照片其派生图会被自动清理。再次运行时，已有派生图不旧于源图就跳过，所以只有新照片需要缩图。

上墙不想要的某张：把文件名加进 `tools\build_wall.py` 顶部的 `EXCLUDE` 集合，再跑一次脚本。

### 二、改「关于我」

直接编辑工作区的 `E:\WS\webpage\about.html`。区块顺序：介绍 → 看过的书 → 喜欢的音乐类型 → 在看/看过的动画 → 调色板。改完跑一次 `python tools\sync_nav.py --check`（导航栏校验，正常会通过）。

**加一本书 / 一部动画**：照抄一条 `<li>`，编号顺延（`books__no`）：
```html
<li>
  <div class="books__row" role="button" tabindex="0" aria-expanded="false">
    <span class="books__no mono">05</span>
    <span class="books__title">书名</span>
    <span class="books__sign" aria-hidden="true"></span>
  </div>
  <div class="books__detail">
    <div class="books__inner">
      <div class="books__body">
        <p class="books__author">作者<span class="books__country">（国家 · Country）</span></p>
        <p class="books__desc">简介。</p>
      </div>
    </div>
  </div>
</li>
```

**加一个色块**：抄一个 `<button class="swatch">`，三处颜色要一致：
```html
<button class="swatch" data-hex="#RRGGBB" type="button">
  <span class="swatch__chip" style="background:#RRGGBB"></span>
  <span class="swatch__name">颜色名</span>
  <span class="swatch__hex mono">#RRGGBB</span>
</button>
```

### 三、加首页 Q&A

编辑工作区 `E:\WS\webpage\index.html`，在 `<section class="why" id="why"><div class="wrap">` 里，最后一个 `why__item` 后面加一块：
```html
      <div class="why__item reveal">
        <h2 class="why__title">问题写在这里？</h2>
        <div class="why__answer">
          <p>回答第一段。</p>
          <p>回答第二段，可省略。</p>
        </div>
      </div>
```
不用跑任何脚本。删问答就把整块 `why__item` 删掉。

### 四、改导航栏（只有加新页面时才需要）

导航栏是单一来源：改 `E:\WS\webpage\partials\nav.html`（用 `{{ACTIVE:index}}` 这类占位符标当前页），然后：
```powershell
python tools\sync_nav.py          # 写入三页
python tools\sync_nav.py --check  # 只校验，不一致时退出码 1
```

---

## 发布上线

### 一键（推荐）

```powershell
cd E:\WS\webpage
.\tools\publish.ps1 "加 3 张照片"
```
它依次做：备份 → 校验导航栏 → 重建照片墙 → 导出到本目录 → `git commit` + `git push`。Cloudflare Pages 检测到 push 后自动重新部署。

备份只保留最近 5 份（`backup\<时间戳>-<标签>\`），脚本自动清理更旧的。

### 手动分步

```powershell
cd E:\WS\webpage
node tools\backup.js v60-加照片       # 1. 备份（建议每次改动前）
python tools\build_wall.py            # 2. 照片墙有变时才跑
python tools\sync_nav.py --check      # 3. 导航栏校验
python tools\export.py                # 4. 同步到 E:\WS\webpage-deploy，并自检引用是否 404

cd E:\WS\webpage-deploy
git add -A
git commit -m "加 3 张照片"
git push
```

`export.py` 其他用法：`--check`（只比对，有差异退出码 1）、`--dry-run`（只看不写）、`--force`（全部重写）。
它不会同步 `tools/ partials/ backup/ .shots/ .workbuddy/`，也不会删除本目录里手动维护的 `README.md`、`.gitignore`、`CNAME`、`_headers`、`_redirects`、`404.html` 和所有以 `.` 开头的文件。

---

## 首次部署（一次性，做完就不用再管）

1. **装 Git**：https://git-scm.com/download/win ，一路默认。装完新开一个终端执行 `git --version` 确认。之前没有 git 和 winget，只能手动装。
2. **初始化仓库**（在本目录 `E:\WS\webpage-deploy`）：
   ```powershell
   git init -b main
   git config user.name "你的名字"
   git config user.email "你的邮箱"
   git add -A
   git commit -m "首次发布"
   ```
3. **建 GitHub 仓库**：网页上 New repository，**不要**勾 README / .gitignore，建成空仓库，拿到地址后：
   ```powershell
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```
   首次 push 会弹浏览器授权，登录即可。仓库 Public / Private 都行，Cloudflare Pages 两种都支持。
4. **Cloudflare Pages**：登录 dash.cloudflare.com → Workers & Pages → Create → Pages → **Connect to Git** → 授权并选这个仓库。构建设置：
   - Framework preset：`None`
   - Build command：**留空**
   - Build output directory：`/`
   - 点 Save and Deploy，等十几秒拿到 `https://<项目名>.pages.dev`
5. **绑自己的域名**（可选）：Pages 项目 → Custom domains → 添加，按提示在域名 DNS 里加 CNAME。域名也托管在 Cloudflare 的话，两步就完成。

选 Cloudflare Pages 而不是 GitHub Pages 的原因：前者走 Cloudflare 全球边缘节点、带宽无限免费，国内访问比 GitHub Pages 稳定得多。

## 站点规模（当前）

71 个站点文件，24.8 MB。最大单文件 2.38 MB。Cloudflare Pages 单文件上限 25 MB，GitHub 单文件上限 100 MB，都很宽松，所以图片全部放仓库、不需要图床。

## 回滚

- 小改错：`backup\<时间戳>-<标签>\` 里是完整快照，把对应文件拷回来。
- 整站回退：`git log` 找到上一个提交，`git revert` 或 `git reset --hard <commit>` 后 push。
- 派生图坏了：删掉 `assets\portfolio\thumbs`、`large` 下的对应文件，重跑 `python tools\build_wall.py` 会重新生成。

## 注意事项

- **GitHub 推送需要代理**。本机系统代理是 `127.0.0.1:12450`，git 已配置全局规则，只对 github.com 生效：
  ```
  git config --global http.https://github.com.proxy http://127.0.0.1:12450
  ```
  代理软件换端口后要重配一次，否则 `git push` 会报 `Recv failure: Connection was reset`（直连 GitHub 就是这样被重置的，与仓库无关）。
- **母库 `E:\PhotoArchive` 只读**，脚本不写入、不改名任何原图。
- `portfolio.html` 的 gallery 区块由脚本生成，手改会被下次运行覆盖。
- 三页 HTML 换行符统一 LF；`sync_nav.py` 固定写 LF。
- 交付前清空 `E:\WS\webpage\.shots`（验证截图目录）。
- 未经允许不要往页面里加任何内容（文字、图标、说明、图例都不行）。
