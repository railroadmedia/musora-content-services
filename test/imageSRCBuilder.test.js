const { buildImageSRC, applySanityTransformations } = require('../src/services/imageSRCBuilder.js')

describe('imageSRCBuilder', function () {
  beforeEach(() => {})

  test('applySanityTransformations', async () => {
    const url =
      'https://cdn.sanity.io/images/4032r8py/production/83c3b6e7354a46c605804c093f707daa4e3f8f25-8000x4500.png'
    const width = 500
    const height = 100
    const quality = 95
    const resultingURL = applySanityTransformations(url, {
      width: width,
      quality: quality,
      height: height,
    })
    const expected = `${url}?fm=webp&w=${width}&h=${height}&q=${quality}`

    expect(resultingURL).toStrictEqual(expected)
  })

  test('buildImageSRC', async () => {
    const url = 'https://d2vyvo0tyx8ig5.cloudfront.net/books/foundations/level-2.jpg'
    const width = 500
    const height = 100
    const quality = 95
    const resultingURL = buildImageSRC(url, {
      width: width,
      quality: quality,
      height: height,
    })

    const expected = `https://www.musora-cdn.com/cdn-cgi/image/width=${width},height=${height},quality=${quality}/${url}`

    expect(resultingURL).toStrictEqual(expected)
  })
})
