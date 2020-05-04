# comNG -- 串口助手

`comNG` 是一款具有现代化 UI 设计并且功能强大的串口助手软件。

## 介绍

comNG 区别于其他串口助手的地方在于其强大的 “现场数据分析“ 能力。简单来说就是 comNG 提供的多种功能以帮助用户更方便的分析打印输出文本。这些功能包括：

- 内建的 comNGLang 高亮语法
- 内建的手动文本高亮功能（类似于 notepad++的 Style Token）
- 搜索文本高亮 （类似于 vscode 的搜索文本高亮）
- 选择文本高亮 （类似于 vscode 的选择文本高亮）
- 基于文本内容的中断功能，全新的功能
- 日志文档的签名（时间和姓名）
- 跨平台：Windows， Mac OS 以及 Ubuntu 等 Linux 系统

另外还包含一些串口助手通用的功能：

- Modem 信号指示和控制
- 自定义波特率
- 十六进制接收
- 接收时间戳
- 发送文本
- 流控
- 文件保存和打开，支持拖动

当然还有一些不支持的功能，比如：

- 十六进制发送
- 文件发送
- 抓取至文件

## 用户界面

![image](/image/preview.jpg)

## 使用方法

下载对应系统的安装文件，安装，然后就应该可以正常使用了。对于 Linux 系统，可能对串口设备文件执行以下命令：

`sudo chmod 666 /dev/ttyS1`

记得把 `ttyS1` 替换为你的串口设备文件。

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

### 编译

```
code .
yarn start
yarn make
```

## Licence

comNG is [MIT](https://opensource.org/licenses/MIT) licensed and all it's dependencies are MIT licensed.
