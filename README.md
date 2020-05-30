# comNG -- 串口助手

`comNG` 是一款具有现代化 UI 设计并且功能强大的串口助手软件。

`Github` 上也有 `comNG` 的 repo，但是 github 的访问和上传速度太慢（comNG 的编译软件比较大，60M 左右），所以后期的更新、维护和发布会以 gitee 为主。

由于软件比较大，且没有自动化编译环境，所以只有在发布大版本时才会提供 Mac 和 Debian 的安装文件，小版本只会提供 Win10 的安装文件。

目前 github 和 sourceforge 上的本版比 gitee 上的版本都低，建议在 gitee 上下载最新版本。

## 文档

请参考 [comNG 完整文档](doc/Introduction.md)

## 介绍

comNG 区别于其他串口助手的地方在于其强大的 “现场数据分析“ 能力。简单来说就是 comNG 提供的多种功能以帮助用户更方便的分析打印输出文本。这些功能包括：

- 精致的 UI 和交互方式
- 内建的 comNGLang 高亮语法
- 内建的手动文本高亮功能：类似于 notepad++ 的 Style Token
- 搜索文本高亮：类似于 vscode 的搜索文本高亮
- 选择文本高亮：类似于 vscode 的选择文本高亮
- 基于文本内容的中断功能，这是一个全新设计的功能
- 专业的 Hex 模式
- 日志文档的签名：时间和姓名
- 常用命令支持快捷键操作，比如打开/关闭串口、打开/保存文件、清除文本、高亮文本等
- 跨平台：Windows， Mac OS 以及 基于 Debian 的 Linux 系统，比如 Ubuntu 和 Deepin
- 自定义主题（只支持软件下方 Bar 的背景色。。。）
- 一个简单的模拟 Terminal 模式

另外还包含一些串口助手通用的功能：

- Modem 信号指示和控制
- 自定义波特率
- 十六进制接收/发送
- 接收时间戳
- 发送文本
- 流控
- 文件保存和打开，支持拖动

一些不支持的功能，比如：

- 文件发送
- 抓取至文件

## 用户界面

![image](/image/preview.jpg)
![image](/image/demo.gif)

## 使用方法

下载对应系统的安装文件，安装，然后就可以正常使用了。对于 Linux 系统，可能需要对串口设备文件执行以下命令：

`sudo chmod 666 /dev/ttyS1`

记得把 `ttyS1` 替换为你的串口设备文件。

### 快捷键列表

- 打开文件： `CmdOrCtrl + O`
- 用 Hex 模式打开文件： `CmdOrCtrl + Shift + O`
- 保存文件： `CmdOrCtrl + S`
- 打开关闭串口：`CmdOrCtrl + D`
- 打开关闭串口，并且清空 Log：`CmdOrCtrl + Shift + D`
- 清空 Log：`CmdOrCtrl + X`
- 清空所有高亮：`CmdOrCtrl + Shift + X`
- 高亮/去高亮鼠标下方或选择的文本：`CmdOrCtrl + E`

## 开发

### 克隆代码

```
git clone git@gitee.com:xenkuo/comNG.git
```

### 安装依赖文件

```
cd comNG
yarn
```

Windows 下安装 node 和 electron 比较麻烦，建议使用以下 `.npmrc` 文件配置：

```
registry=https://registry.npm.taobao.org
electron_mirror=https://cdn.npm.taobao.org/dist/electron/
electron_custom_dir=7.1.11
```

Windows 下安装 native 编译工具更麻烦，建议多试试，因为我现在在其他 Windows 上也安装不成功了。。。

### 运行

```
code .
yarn run start
```

### 编译

```
yarn make
```

## Licence

comNG is [MIT](./LICENSE) licensed and all it's dependencies are MIT licensed.
