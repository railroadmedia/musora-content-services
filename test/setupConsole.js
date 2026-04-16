global.console.log = jest.fn()
global.console.warn = jest.fn()

if (typeof structuredClone === 'undefined') {
  global.structuredClone = (v) => JSON.parse(JSON.stringify(v))
}
