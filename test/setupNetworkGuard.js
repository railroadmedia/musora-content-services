global.fetch = () => {
  throw new Error('Real network call detected in unit/integration test. Mock the HTTP layer.')
}
