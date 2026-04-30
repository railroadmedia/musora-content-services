const _originalSetTimeout = global.setTimeout
global.setTimeout = function(fn, delay, ...args) {
  const timer = _originalSetTimeout(fn, delay, ...args)
  timer?.unref?.()
  return timer
}

const _originalSetInterval = global.setInterval
global.setInterval = function(fn, delay, ...args) {
  const timer = _originalSetInterval(fn, delay, ...args)
  timer?.unref?.()
  return timer
}
