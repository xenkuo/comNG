# comNG

A modern and powerful COM tool.

## Introduction

Focus on stable serialport communication and best **on-site data explore**, **comNG** is the Next Generation of COM tool. comNG gives you best experience of on-site log exploring. comNG implemented several features to hit the mark:

- built-in comNGLang syntax
- built-in word highlighter
- globally highlight word you selected (monaco built-in)
- globally highlight word you searched (monaco built-in)
- breakpoint on certain text
- timestamp append and name sign
- cross platform: Windows, Linux and Mac

Of course it supports common features that other COM tools have:

- baud rate customize
- hex receive
- configuration of 8N1
- receive timestamp
- text transmit
- file save and open, drag-drop is supported

Features not supported:

- hex transmit
- flow control
- file transmit
- capture to file

## User Interface

![image](/image/preview.jpg)

## Usage

Download the release package according with you system, install, comNG should work well then.

For Linux user, you may need to add right to COM port before monitor it:

`sudo chmod 666 /dev/ttyS1`

Replace `ttyS1` with your real COM port.

## Development

### Clone Code

```
git clone git@github.com:xenkuo/comNG.git
```

### Install Dependencies

```
cd comNG
npm install
```

You may need install node native compile tools, if there's problem, `Google` or create issue.

### Develop and Build

```
code .
npm run start
npm run build
```

## Licence

comNG is [MIT](https://opensource.org/licenses/MIT) licensed and all it's dependencies are MIT licensed.

## The End

Wish you enjoy it.
