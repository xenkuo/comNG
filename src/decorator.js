var decoIndex = 0

const decoMod = 7
const decoTable = [
  { style: 'hl-red', color: '#ff8a80' },
  { style: 'hl-orange', color: '#ffd180' },
  { style: 'hl-yellow', color: '#ffff8d' },
  { style: 'hl-green', color: '#b9f6ca' },
  { style: 'hl-blue', color: '#8dd8ff' },
  { style: 'hl-indigo', color: '#8c9eff' },
  { style: 'hl-purple', color: '#ea80fc' },
]

function get() {
  return decoTable[decoIndex++ % decoMod]
}

function init() {
  decoIndex = 0
}

function apply(model, text) {
  let matches = model.findMatches(
    text,
    false,
    false,
    true,
    // "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    null,
    false
  )
  let decoration = get()

  console.log(decoration.style, decoration.color)

  for (let i of matches) {
    let range = i.range

    model.deltaDecorations(
      [],
      [
        {
          range: range,
          options: {
            className: decoration.style,
            overviewRuler: {
              color: decoration.color,
              position: 4, // position right
            },
          },
        },
      ]
    )
  }
}

function removeV0(model, text) {
  let matches = model.findMatches(
    text,
    false,
    false,
    true,
    // "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?",
    null,
    false
  )

  for (let match of matches) {
    let decos = model.getDecorationsInRange(match.range)

    // super word remove decoration will cause sub word decoration to 1
    for (let deco of decos) {
      model.deltaDecorations([deco.id], [])
    }
  }
}

function remove(model, targetClassName) {
  let decos = model.getAllDecorations()

  for (let deco of decos) {
    if (targetClassName === deco.options.className) {
      model.deltaDecorations([deco.id], [])
    }
  }
}

module.exports = {
  get,
  init,
  apply,
  removeV0,
  remove,
}
