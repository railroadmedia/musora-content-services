import { searchAlgolia } from '../../src/services/search'

const mockPost = jest.fn()

jest.mock('../../src/infrastructure/http/HttpClient', () => ({
    POST: (...args: unknown[]) => mockPost(...args),
}))

describe('searchAlgolia', () => {
    beforeEach(() => {
        mockPost.mockReset()
    })

    test('posts requests to the correct endpoint', async () => {
        mockPost.mockResolvedValue({ results: [] })

        await searchAlgolia([{ query: 'drum', hitsPerPage: 5 }])

        expect(mockPost).toHaveBeenCalledWith('/api/content/v1/search', {
            requests: [{ query: 'drum', hitsPerPage: 5 }],
        })
    })

    test('returns the response from the endpoint', async () => {
        const mockResponse = {
            results: [{ hits: [{ objectID: 'abc123' }], nbHits: 1 }],
        }
        mockPost.mockResolvedValue(mockResponse)

        const result = await searchAlgolia([{ query: 'drum' }])

        expect(result).toEqual(mockResponse)
    })

    test('passes multiple requests', async () => {
        mockPost.mockResolvedValue({ results: [] })

        await searchAlgolia([{ query: 'drum' }, { query: 'piano' }])

        expect(mockPost).toHaveBeenCalledWith('/api/content/v1/search', {
            requests: [{ query: 'drum' }, { query: 'piano' }],
        })
    })
})
