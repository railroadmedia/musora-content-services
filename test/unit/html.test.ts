import { hasVisibleText } from '../../src/lib/html'

describe('hasVisibleText', () => {
  test.each([
    [null],
    [''],
    ['   '],
    ['<p></p>'],
    ['<p><br></p>'],
    ['<ul><li></li></ul>'],
    ['<p>&nbsp;</p>'],
    ['<p>&#160; &#xA0;</p>'],
  ])('is false for %p', (html) => {
    expect(hasVisibleText(html)).toBe(false)
  })

  test.each([['Focus on the bridge'], ['<p><b>x</b></p>'], ['<p>&amp;</p>'], ['<p>&#9835;</p>']])(
    'is true for %p',
    (html) => {
      expect(hasVisibleText(html)).toBe(true)
    }
  )
})
