import { sendRevenueCatPurchaseMetadata } from '@/services/user/revenuecat'

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

describe('sendRevenueCatPurchaseMetadata', () => {
  beforeEach(() => {
    mockPost.mockReset()
  })

  it('posts to the correct url with previous_product_id when provided', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await sendRevenueCatPurchaseMetadata(
      'GPA.3378-5280-5022-02864',
      'upgrade_higher_cost',
      'musora_subscription:annual-plus'
    )

    expect(mockPost).toHaveBeenCalledWith('/api/revenuecat/v1/purchase-metadata', {
      transaction_id: 'GPA.3378-5280-5022-02864',
      purchase_intent: 'upgrade_higher_cost',
      previous_product_id: 'musora_subscription:annual-plus',
    })
  })

  it('omits previous_product_id from the body when not provided', async () => {
    mockPost.mockResolvedValueOnce(undefined)

    await sendRevenueCatPurchaseMetadata('GPA.3345-3073-4615-38885', 'new')

    expect(mockPost).toHaveBeenCalledWith('/api/revenuecat/v1/purchase-metadata', {
      transaction_id: 'GPA.3345-3073-4615-38885',
      purchase_intent: 'new',
    })
  })

  it('throws when transactionId is missing', async () => {
    await expect(sendRevenueCatPurchaseMetadata('', 'new')).rejects.toThrow(
      'transactionId is a required parameter'
    )
    expect(mockPost).not.toHaveBeenCalled()
  })

  it('throws when purchaseIntent is missing', async () => {
    // @ts-expect-error -- intentionally passing an invalid value to test the runtime guard
    await expect(sendRevenueCatPurchaseMetadata('GPA.3378-5280-5022-02864', '')).rejects.toThrow(
      'purchaseIntent is a required parameter'
    )
    expect(mockPost).not.toHaveBeenCalled()
  })
})
