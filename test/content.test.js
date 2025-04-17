import { initializeTestService } from './initializeTests.js'
import contentModule, {getContentRows, getLessonContentRows, getNewAndUpcoming, getScheduleContentRows, getTabResults} from '../src/services/content.js'


const railContentModule = require('../src/services/railcontent.js')

describe('content', function () {
  beforeEach(() => {
    initializeTestService()
  })

//   test('getLessonContentRows', async () => {
//     const results = await getLessonContentRows()
//     console.log(results)
//   })

//   test('getTabResults-For-You', async () => {
//     const results = await getTabResults('drumeo','lessons','For You')
//     console.log(results)
//     expect(results.type).toBeDefined()
//     expect(results.type).toBe('sections')
//     expect(results.data).toBeDefined()
//     expect(results.meta).toBeDefined()
//     expect(results.meta.filters).toBeDefined()
//     expect(results.meta.sort).toBeDefined()
//   })

  test('getTabResults-Singles', async () => {
    const results = await getTabResults('drumeo','lessons','Individuals', {selectedFilters:['difficulty,All','difficulty,Beginner'], sort:'-published_on'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.type).toBe('catalog')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Courses', async () => {
    const results = await getTabResults('pianote','lessons','Collections', {selectedFilters:['difficulty,Expert'], sort:'slug'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.type).toBe('catalog')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Filters', async () => {
    const results = await getTabResults('pianote','lessons','Explore All', {selectedFilters:['difficulty,Expert'], sort:'slug'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Type-Filter', async () => {
    const results = await getTabResults('drumeo','lessons','Explore All', {selectedFilters:['type,Courses', 'type,Documentaries'], sort:'slug'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getTabResults-Type-Explore-All', async () => {
    const results = await getTabResults('drumeo','lessons','Explore All', {selectedFilters:[], sort:'slug'})
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
    expect(results.meta.filters).toBeDefined()
    expect(results.meta.sort).toBeDefined()
  })

  test('getContentRows', async () => {
    const results = await getContentRows('drumeo', 'lessons', 'Your-Daily-Warmup')
    console.log(results)
  })

//   test('getTabResults-Songs-For-You', async () => {
//     const results = await getTabResults('drumeo','songs','For You')
//     console.log(results)
//     expect(results.type).toBeDefined()
//     expect(results.type).toBe('sections')
//     expect(results.data).toBeDefined()
//     expect(results.meta).toBeDefined()
//     expect(results.meta.filters).toBeDefined()
//     expect(results.meta.sort).toBeDefined()
//   })
  test('getNewAndUpcoming', async () => {
    const results = await getNewAndUpcoming('drumeo')
    console.log(results)
    //expect(results.data).toBeDefined()
  })

  test('getScheduleContentRows', async () => {
    const results = await getScheduleContentRows('drumeo')
    console.log(results.data[1])
    expect(results.type).toBeDefined()
    expect(results.type).toBe('sections')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
  })

  test('getSpecificScheduleContentRow', async () => {
    const results = await getScheduleContentRows('drumeo', 'Leaving-Soon')
    console.log(results)
    expect(results.type).toBeDefined()
    expect(results.type).toBe('catalog')
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
  })

  test('getTabResults-Recent-Activity-All', async () => {
    let mock = null
    mock = jest.spyOn(railContentModule, 'fetchRecentUserActivities')
    var json = JSON.parse(
      `{"data":[{"id":335224,"title":"General Piano Discussion","action":"Post","contentType":"thread","date":"2025-04-17","thumbnail":"https:\/\/cdn.sanity.io\/images\/4032r8py\/production\/2331571d237b42dbf72f0cf35fdf163d996c5c5a-1920x1080.jpg","summary":"Ea delectus temporibus quis cumque voluptatibus iure. Aut modi vel assumenda qui illo optio non velit. Perspiciatis eius repudiandae illo dolorem."},{"id":423308,"title":"General Piano Discussion","action":"Post","contentType":"thread","date":"2025-04-17","thumbnail":"https:\/\/cdn.sanity.io\/images\/4032r8py\/production\/2331571d237b42dbf72f0cf35fdf163d996c5c5a-1920x1080.jpg","summary":"Voluptatem quidem aut possimus. Eveniet repellat hic optio quam autem sunt. Quam quas alias voluptatem vel dolore laborum est. Accusamus nostrum culpa cum sint vel temporibus aut."},{"id":75427,"title":"Merry Christmas Darling","action":"Start","contentType":"lesson","date":"2025-04-15","thumbnail":"https:\/\/cdn.sanity.io\/images\/4032r8py\/development\/c1c98137b14b0c8bfc43653d48564fa960515e38-1000x973.jpg","summary":""},{"id":144453,"title":"General Piano Discussion","action":"Post","contentType":"thread","date":"2025-04-15","thumbnail":"https:\/\/cdn.sanity.io\/images\/4032r8py\/production\/2331571d237b42dbf72f0cf35fdf163d996c5c5a-1920x1080.jpg","summary":"Iusto voluptate consequatur tenetur. Numquam quia unde tenetur molestias aut quo tempore. Quia nisi dolorem sint veritatis iusto aliquid sit."},{"id":126011,"title":"Improve Your Phrasing - The Stage (Ep. 41)","action":"Comment","contentType":"song","date":"2025-04-14","thumbnail":"https:\/\/cdn.sanity.io\/images\/4032r8py\/development\/48ded0c8360b5b5fecc9e2b70729dfaf205becf2-1920x1080.jpg","summary":""}],"links":{"first":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=1","last":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=11","prev":null,"next":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=2"},"meta":{"current_page":1,"from":1,"last_page":11,"links":[{"url":null,"label":"&laquo; Previous","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=1","label":"1","active":true},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=2","label":"2","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=3","label":"3","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=4","label":"4","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=5","label":"5","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=6","label":"6","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=7","label":"7","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=8","label":"8","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=9","label":"9","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=10","label":"10","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=11","label":"11","active":false},{"url":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all?page=2","label":"Next &raquo;","active":false}],"path":"https:\/\/devapi.musora.com:8443\/api\/user\/activities\/v1\/all","per_page":5,"to":5,"total":52}}`
    )
    mock.mockImplementation(() => json)

    const results = await getTabResults('drumeo','recent-activities','Lessons')
    console.log(results.data)
    expect(results.type).toBeDefined()
    expect(results.data).toBeDefined()
    expect(results.meta).toBeDefined()
//     expect(results.meta.filters).toBeDefined()
//     expect(results.meta.sort).toBeDefined()
  })

})
