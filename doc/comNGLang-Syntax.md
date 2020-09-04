# `comNGLang` 语法

## 简述

`comNGLang` 是 `comNG` 定义的一套简单的串口日志语法格式。如果串口输出数据符合 `comNGLang` 的语法格式，这些数据就会在 `comNG` 里自动高亮显示。传统的日志高亮需要在串口数据里添加额外的标识符，比如 [ANSI escape codes](https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html)。这种方式有两个问题：

- 输出端的复杂度增大
- 大部分的串口助手不支持这种语法

`comNGLang` 不再有类似的问题。

`comNG` 的 editor 组件使用的是 [monaco editor](https://microsoft.github.io/monaco-editor/index.html)，vscode 同款。在 monaco editor 里自定义一套语法相对来说比较简单，于是就有了 `comNGLang`。

## 语法定义

`comNGLang` 的定义主要是一组正则表达式，现在的实现基本可用。但是由于本人能力有限，所以这套正则定义应该还有很大的提升空间，希望大家有时间可以优化下相关实现。

现在的正则有：

```js
        [/^\[?[f|F][a|A][t|T][a|A][l|L]\]?\s.*/, "fatal"],
        [/\s+\[?[f|F][a|A][t|T][a|A][l|L]\]?\s+/, "fatal"],
        [/^\[?F\]?\s.*/, "fatal"],
        [/\s+\[?F\]?\s+/, "fatal"],
        [/^\[?[e|E][r|R][r|R][o|O][r|R]\]?\s.*/, "error"],
        [/\s+\[?[e|E][r|R][r|R][o|O][r|R]\]?\s+/, "error"],
        [/^\[?E\]?\s.*/, "error"],
        [/\s+\[?E\]?\s+/, "error"],
        [/^\[?[w|W][a|A][r|R][n|N]\]?\s.*/, "warn"],
        [/\s+\[?[w|W][a|A][r|R][n|N]\]?\s+/, "warn"],
        [/^\[?W\]?\s.*/, "warn"],
        [/\s+\[?W\]?\s+/, "warn"],
        [/^\[?[i|I][n|N][f|F][o|O]\]?\s.*/, "info"],
        [/\s+\[?[i|I][n|N][f|F][o|O]\]?\s+/, "info"],
        [/^\[?I\]?\s.*/, "info"],
        [/\s+\[?I\]?\s+/, "info"],
        [/^\[?[t|T][r|R][a|A][c|C][e|E]\]?\s.*/, "trace"],
        [/\s+\[?[t|T][r|R][a|A][c|C][e|E]\]?\s+/, "trace"],
        [/^\[?T\]?\s.*/, "trace"],
        [/\s+\[?T\]?\s+/, "trace"],
        [/^\[?[d|D][e|E][b|B][u|U][g|G]\]?\s.*/, "debug"],
        [/\s+\[?[d|D][e|E][b|B][u|U][g|G]\]?\s+/, "debug"],
        [/^\[?D\]?\s.*/, "debug"],
        [/\s+\[?D\]?\s+/, "debug"],

        [/\[\d;\d{2}m/, "useless"],
        [/\[\dm/, "useless"],

        [/[{}()[\]]/, "bracket"],
        [/^\d{1,2}:\d{2}:\d{2}:\d{1,3}/, "timestamp"],
        [/\d{1,4}(-|\/|\.|:)\d{1,2}\1\d{1,4}/, "time"],
        [
          /(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)(-|\/|\.|:)(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\2(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)\2(25[0-5]|2[0-4]\d|[0-1]\d{2}|[1-9]?\d)/,
          "ip",
        ],
        [
          /[0-9a-fA-F]{2}(-|\/|\.|:)[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}\1[0-9a-fA-F]{2}/,
          "mac",
        ],
        [/\d*\.\d+([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number"],
        [/[0-9a-fA-F]{2,}/, "number"],
        [/\d+/, "number"],
```

这里定义了 **6 级** 日志等级，分别为：

- fatal
- error
- warn
- info
- trace
- debug

还定义了括号、时间戳、时间、ip、mac 地址以及数字。
串口输出的文本符合这些正则的话，在 `comNG` 里会按照定义的规则自动高亮。 高亮的规则如下：

```js
      { token: "number", foreground: "2e7d32" },
      { token: "bracket", foreground: "ff9800" },
      { token: "timestamp", foreground: "009688" },
      { token: "time", foreground: "2196f3" },
      { token: "ip", foreground: "03a9f4" },
      { token: "mac", foreground: "00bcd4" }
      { token: "fatal", foreground: "e91e63" },
      { token: "error", foreground: "f44336" },
      { token: "warn", foreground: "ff9800" },
      { token: "info", foreground: "9e9e9e" },
      { token: "trace", foreground: "9e9d24" },
      { token: "debug", foreground: "2e7d32" },
      { token: "useless", foreground: "cecece" },
```

## 示例

### 备注

- 下文的空格包含： space， tab

### 日志等级

几个日志等级的语法是类似的，只是关键字不一样，这里以 fatal 为例。

```js
        [/^\[?[f|F][a|A][t|T][a|A][l|L]\]?\s.*/, "fatal"],
        [/\s+\[?[f|F][a|A][t|T][a|A][l|L]\]?\s+/, "fatal"],
        [/^\[?F\]?\s.*/, "fatal"],
        [/\s+\[?F\]?\s+/, "fatal"],
```

- 以 **[fatal] + 空格 开始** 的行，整行被识别为 fatal 标签行，行内所有文本会设置为 fatal 标签的颜色。
  - 行内其他标签会被 fatal 标签覆盖
  - fatal 不区分大小写，比如： FATAL， fatal， Fatal， fAtal 都可以
  - [ 和 ] 为可选
- 匹配 **空格 + [fatal] + 空格** 的 fatal 单词被识别为 fatal 标签单词，该单词会被设置为 fatal 标签的颜色。
  - 前后必须有空格
  - fatal 不区分大小写，比如： FATAL， fatal， Fatal， fAtal 都可以。
  - [ 和 ] 为可选
- 以 **[F] + 空格 开始** 的行，整行被识别为 fatal 标签行，行内所有文本会设置为 fatal 标签的颜色。
  - 行内其他标签会被 fatal 标签覆盖
  - F 区分大小写
  - [ 和 ] 为可选
- 匹配 **空格 + [F] + 空格** 的 F 单词被识别为 fatal 标签单词，该单词会被设置为 fatal 标签的颜色。
  - 前后必须有空格
  - F 区分大小写
  - [ 和 ] 为可选

### 其他标签

其他的标签比较简单，这里也是尽量包含常用格式，大家试试应该就明白了。

## 备注

- `comNG` 会自动过滤掉 Ansi escape code.
- `comNG` 会把不可打印字符替换为 `-` 字符。
