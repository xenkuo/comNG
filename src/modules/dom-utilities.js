const store = require('./store.js').init()


function autoScrolldownBtnInit() {
  const el = document.getElementById('auto-scrolldown-btn')
  const currentState = store.get('general.autoScrolldown')
  if (currentState === true) {
    el.classList.remove('grey')
  } else {
    el.classList.add('grey')
  }

  el.addEventListener('click', () => {
    let newState = !store.get('general.autoScrolldown')
    store.set('general.autoScrolldown', newState)
    if (newState === true) {
      el.classList.remove('grey')
    } else {
      el.classList.add('grey')
    }
  })
}

module.exports = {
  autoScrolldownBtnInit
}
