/* eslint-disable no-undef */
function checkForUpdates() {
  const { remote, shell } = require('electron')
  const store = remote.getGlobal('store')
  const dialog = remote.dialog

  const appVersion = remote.app.getVersion()
  const appUpdaterUrl = 'https://gitee.com/api/v5/repos/xenkuo/comNG/releases/latest'

  function platformUpdateCheck(assets) {
    const os = require('os')
    let platform = os.platform()
    let suffix = 'exe'

    if ('darwin' === platform) suffix = 'dmg'
    else if ('linux' === platform) suffix = 'deb'

    for (const asset of assets) {
      if (asset.name !== undefined && -1 !== asset.name.indexOf(suffix)) {
        return true
      }
    }

    return false
  }

  fetch(appUpdaterUrl)
    .then((response) => {
      if (response.status == 200) return response.json()
      else throw new Error('Failed to fetch update information: ' + response.status)
    })
    .then((respJson) => {
      if (respJson.prerelease === true && store.get('about.insiderPreview') === false) return

      let latest = respJson.tag_name.split('v')[1]
      if (latest > appVersion && true === platformUpdateCheck(respJson.assets)) {
        const dialogOpts = {
          type: 'info',
          buttons: ['取消', '下载'],
          defaultId: 1,
          title: '发现新版本',
          message: 'Version: ' + latest + ' released!',
          detail: respJson.body,
        }

        dialog.showMessageBox(dialogOpts).then((returnValue) => {
          if (returnValue.response === 1)
            shell.openExternal(respJson.author.html_url + '/comNG/releases')
        })
      }
    })
    .catch((error) => {
      console.error(error)
    })

  document.getElementById('app-version').innerHTML = appVersion
  console.log('comNG Version: ', appVersion)
}

module.exports = {
  checkForUpdates,
}
