# 开发 / Development

## 克隆代码

```ps
git clone git@gitee.com:xenkuo/comNG.git
```

## 设置开发环境

### python 版本

node-gyp 和 comNG 里的模块都依赖 python。node-gyp 安装时如果发现环境变量里没有 path 会自动安装最新版本 python，目前是 3.12.x。

这个版本太新，和 comNG 里的模块有冲突。目前已知的兼容版本是 python v3.10.9， 可以在 [HuaWei Mirros](https://mirrors.huaweicloud.com/python/) 下载。

安装时一定记得 **添加 python 到环境变量**。

### node & yarn 安装

先安装 node，测试过的最新版本是 v16.20.2 LTS。comNG 需要编译 native module，也就是 node-gyp，所以下图选项需要勾选：

![](Image/README_2024-04-01-19-00-17.png)

Yarn 是使用的 Yarn 1， Yarn 2+没有测试过。安装命令如下：

```ps
npm install --global yarn
```

### 网络问题

如果网络有问题，建议使用以下 `.npmrc` 文件配置：

```ps
registry=https://registry.npm.taobao.org
electron_mirror=https://cdn.npm.taobao.org/dist/electron/
electron_custom_dir=7.2.4
```

### 已知问题

- yarn Error: certificate has expired
  - `yarn config set "strict-ssl" false -g`

- ModuleNotFoundError: No module named 'distutils'
  - reference: https://stackoverflow.com/questions/77247893/modulenotfounderror-no-module-named-distutils-in-python-3-12
  - `pip install setuptools`

- Node gyp ERR - invalid mode: 'rU' while trying to load binding.gyp
  - use python 3.10.x, new version can't support this mode

- An unhandled rejection has occurred inside Forge: Error: Failed with exit code: 4294967295
    - Install a dependency: `yarn add --dev @electron-forge/maker-squirrel electron-winstaller`

### 安装 node modules

```ps
cd comNG
yarn
```

## 运行

```ps
code .
yarn start
```

## 编译

```ps
yarn make
```
