import { sendAccountSetupEmail } from '@/services/user/account'

const mockPost = jest.fn()

jest.mock('@/infrastructure/http/HttpClient', () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    post: mockPost,
  })),
}))

jest.mock('@/services/config.js', () => ({
  globalConfig: {
    baseUrl: 'https://test.musora.com',
    sessionConfig: { token: null, userId: null },
  },
}))

describe('sendAccountSetupEmail', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('posts to the correct url with token in body when token provided', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await sendAccountSetupEmail('user@example.com', 'abc123')

    expect(mockPost).toHaveBeenCalledWith(
      '/api/user-management-system/v1/accounts/user%40example.com/send-setup-email',
      { token: 'abc123' }
    )
  })

  it('posts to the correct url with undefined token when token omitted', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await sendAccountSetupEmail('user@example.com')

    expect(mockPost).toHaveBeenCalledWith(
      '/api/user-management-system/v1/accounts/user%40example.com/send-setup-email',
      { token: undefined }
    )
  })

  it('encodes special characters in email for the url', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await sendAccountSetupEmail('user+tag@example.com', 'tok')

    expect(mockPost).toHaveBeenCalledWith(
      '/api/user-management-system/v1/accounts/user%2Btag%40example.com/send-setup-email',
      { token: 'tok' }
    )
  })
})
