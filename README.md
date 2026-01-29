# 活动抽奖软件

年会/活动抽奖软件，支持 Windows 与 macOS，即开即用。参考设计要求与界面示例实现。

## 功能概览

- **主界面**：喜庆红主题，四个按钮 — 抽奖设置、开始抽奖、重新抽奖、退出抽奖；顶部显示快捷键说明。
- **抽奖设置**：基础设置、提示设置、抽奖结果页设置、抽奖封面设置；奖项与名单管理。
- **抽奖进行**：大屏展示当前奖项与名额，名单滚动后停在中奖名单；回车/空格开始或停止。
- **快捷键**：回车/空格 开始或停止抽奖；F1 显示抽奖封面；ESC 退出当前界面；F8 显示抽奖结果；F4 临时补奖。

## 运行方式

### 方式一：本地开发 / 即开即用

1. 安装依赖：`npm install`
2. 启动：`npm start`  
   启动后窗口会自动最大化。

### 方式二：在浏览器中打开

直接双击打开 `index.html`，即可在浏览器中使用（退出按钮不会关闭浏览器，仅返回主菜单）。

### 方式三：打包为 Windows 便携版

1. 安装依赖：`npm install`
2. 打包：  
   - 直接打包：`npm run build`  
   - **国内网络建议**（解决 GitHub 超时、app-builder 下载失败）：  
     `npm run build:cn`
3. 在 `dist` 目录下会生成便携 exe（或 `dist\win-unpacked` 文件夹），双击即可运行，无需安装。

#### 关于「default Electron icon is used」提示

这是**警告**，不是错误，打包已成功，exe 可正常使用。若要去掉该提示并换成自家图标：

1. 在项目根目录新建 `build` 文件夹，放入 `icon.ico`（建议 256×256）。
2. 在 `package.json` 的 `build.win` 里增加：`"icon": "build/icon.ico"`，再执行 `npm run build:cn`。

#### 若打包报错（网络超时 / app-builder.exe 无法执行）

- **从 GitHub 下载 Electron 超时**：项目已配 `.npmrc` 使用 npmmirror。请用 **`npm run build:cn`** 再试。
- **仍失败时**，在 PowerShell 中先设镜像再打包：
  ```powershell
  $env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
  $env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
  npm run build
  ```
- **`app-builder.exe` 无法执行**：多为杀毒/安全软件拦截。可暂时把项目目录加入信任，或到 `node_modules\app-builder-bin\win\x64\` 确认是否存在 `app-builder.exe`；若不存在，设置好上述镜像后重新执行 `npm install` 再打包。
- **只想要可运行目录、不生成单文件 exe**：使用 `npm run build:dir`，会在 `dist\win-unpacked` 生成绿色目录，双击其中的「活动抽奖.exe」即可。
- **“无法创建符号链接 / 客户端没有所需的特权”**：已通过关闭代码签名（`CSC_IDENTITY_AUTO_DISCOVERY=false`、`signAndEditExecutable: false`）避免使用 winCodeSign。若仍出现，请以**管理员身份**打开 PowerShell 再执行 `npm run build:cn`，或：**设置 → 隐私和安全性 → 针对开发人员 → 开发人员模式** 开启后再打包。

### 打包为 macOS 应用（需在苹果电脑上执行）

1. 在 **Mac** 上安装 Node.js，进入项目目录，执行：`npm install`
2. 打包：`npm run build:mac`（或国内网络用 `npm run build:mac:cn`）
3. 在 `dist` 目录会生成 `.dmg` 安装包和 `.zip`，双击 DMG 安装后即可在 Mac 上运行。

> 说明：macOS 应用**必须在苹果电脑上打包**，无法在 Windows 上直接生成 Mac 版。若没有 Mac，可使用下面的 **GitHub Actions 自动打 Mac 包**。

### 使用 GitHub Actions 打 Mac 包（无需本地 Mac）

1. 将项目推送到 GitHub 仓库。
2. 打开仓库 **Actions** 页，选择 **Build macOS** workflow，点击 **Run workflow** 运行（或推送代码到 `main`/`master` 分支时会自动触发）。
3. 运行完成后，在该次运行的 **Summary** 里打开 **Artifacts**，下载 **mac-build**，解压即可得到 `.dmg` 和 `.zip` 安装包。

Workflow 文件位置：`.github/workflows/build-mac.yml`。若国内网络导致 Electron 下载超时，可在该文件中把 `npm run build:mac` 改为 `npm run build:mac:cn`，并加上 `ELECTRON_MIRROR`、`ELECTRON_BUILDER_BINARIES_MIRROR` 环境变量（与 `build:mac:cn` 脚本一致）。

## 项目结构

```
├── main.js           # Electron 主进程（窗口最大化等）
├── index.html        # 主界面、设置页、抽奖页、封面、结果页
├── css/style.css     # 样式
├── js/app.js         # 视图切换、抽奖逻辑、名单与设置持久化
├── package.json
└── 软件设计要求.ruler
```

## 使用说明

1. **抽奖名单**：在「抽奖设置」→「抽奖名单设置」中录入姓名（每行一个），或从 txt/csv 文件导入。
2. **奖项**：在基础设置中可改奖项名称、数量、奖品名称；开奖顺序为列表由上到下。
3. **出奖方式**：可选「不允许重复中奖」或「允许重复中奖」。
4. **开始抽奖**：在主界面点「开始抽奖」进入抽奖界面，按回车或空格开始滚动，再按一次停止并确定中奖者。
5. **重新抽奖**：清空本次所有中奖记录，重新从第一个奖项开始抽取。

数据保存在浏览器本地（localStorage），关闭后再次打开会保留名单与设置。
