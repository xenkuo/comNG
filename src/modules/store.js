const Store = require('electron-store')

const defaultFont =
    "'Cascadia Mono', Consolas, 'SF Mono', 'Ubuntu Mono', 'Lucida Console', 'Courier New', 'Source Han Sans SC', 'Microsoft YaHei', 'WenQuanYi Micro Hei'"

function initWithMigration(version) {
    return new Store({
        projectVersion: version,
        migrations: {
            '1.0.3': (db) => {
                db.delete('desert')
                db.delete('about')
                db.set('window.width', 600)
                db.set('window.height', 640)
                db.set('window.widthBefore', 600)
                db.set('window.heightBefore', 640)
                db.set('window.xBefore', 0)
                db.set('window.yBefore', 0)

                db.set('menu.hidden', true)
                db.set('menu.tab', 'general')

                db.set('baudIndex', 3)
                db.set('pathIndex', 0)

                db.set('general.hexmode', false)
                db.set('general.timestamp', false)
                db.set('general.customized', 4800)
                db.set('general.databitsIndex', 0)
                db.set('general.parityIndex', 0)
                db.set('general.stopbitsIndex', 0)
                db.set('general.flowcontrolIndex', 0)

                db.set('transmit.eof', '\r\n')

                db.set('advance.sign.switch', false)
                db.set('advance.sign.name', '')
                db.set('advance.breakpoint.switch', false)
                db.set('advance.breakpoint.onText', 'Error')
                db.set('advance.breakpoint.afterLines', 5)
                db.set('advance.barColor.head', '#ffba3a')
                db.set('advance.barColor.middle', '#ffba3a')
                db.set('advance.barColor.tail', '#ffba3a')
                // Dark theme bar colors
                db.set('advance.barColor.headDark', '#d4a017')
                db.set('advance.barColor.middleDark', '#c99613')
                db.set('advance.barColor.tailDark', '#be8d0f')
            },
            '1.0.4': (db) => {
                db.set('general.modemSignal', false)
                db.set(
                    'general.fontFamily',
                    "'Cascadia Mono', Consolas, 'SF Mono', 'Ubuntu Mono', Menlo, 'Lucida Console', 'Courier New', monospace"
                )
                db.set('general.fontSize', 12)
            },
            '1.0.6': (db) => {
                db.set('transmit.hexmode', false)
                db.set('about.insiderPreview', false)
            },
            '1.0.11': (db) => {
                db.set('fileops.capture.switch', false)
                db.set('fileops.capture.filePath', '')
                db.delete('general.modemSignal')
                db.set('general.modemSignal.switch', false)
                db.set('general.modemSignal.rts', false)
                db.set('general.modemSignal.dtr', false)
            },
            '2.0.4': (db) => {
                db.set('general.fontFamily', defaultFont)
            },
            '2.1.0': (db) => {
                db.set('transmit.eof', '\r\n')
            },
            '2.1.1': (db) => {
                db.set('transmit.clean', false)
            },
            '2.1.2': (db) => {
                db.delete('window.xBefore')
                db.delete('window.yBefore')
            },
            '2.3.2': (db) => {
                db.set('general.autoScrolldown', true)
                db.delete('fileops.capture.switch')
                db.delete('fileops.capture.filePath')
            },
            '4.0.0': (db) => {
                db.delete('transmit.clean')
            },
            '4.0.1': (db) => {
                db.set('transmit.messages', [
                    { content: 'reboot' },
                    { content: 'updateFirmware{version: "v2.0"}' },
                    { content: 'factoryReset' },
                    { content: '100300000001874B' },
                ])
            },
            '4.0.2': (db) => {
                db.set('general.darkTheme', false)
            },
        },
    })
}

function init() {
    return new Store()
}

module.exports = {
    init,
    initWithMigration,
}
