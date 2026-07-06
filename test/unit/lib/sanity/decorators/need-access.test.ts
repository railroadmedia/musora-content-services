const mockDoesUserNeedAccess = jest.fn()

jest.mock('../../../../../src/services/permissions', () => ({
  getPermissionsAdapter: () => ({
    doesUserNeedAccess: mockDoesUserNeedAccess,
  }),
}))

import {
  NEED_ACCESS_FIELD,
  accessDecorator,
  decorateAccess,
  type AccessDecoratable,
} from '../../../../../src/lib/sanity/decorators/need-access'

const perms = {
  permissions: [78, 91],
  isAdmin: false,
  isModerator: false,
  isABasicMember: false,
  hasAllContentAccess: false,
}

describe('need-access decorator', () => {
  beforeEach(() => {
    mockDoesUserNeedAccess.mockReset()
  })

  describe('accessDecorator (factory)', () => {
    test('field is need_access', () => {
      const dec = accessDecorator(perms)
      expect(dec.field).toBe('need_access')
      expect(NEED_ACCESS_FIELD).toBe('need_access')
    })

    test('compute delegates to adapter with item + perms', () => {
      mockDoesUserNeedAccess.mockReturnValue(true)
      const dec = accessDecorator(perms)
      const item: AccessDecoratable = { permission_id: [78] }

      const result = dec.compute(item)

      expect(result).toBe(true)
      expect(mockDoesUserNeedAccess).toHaveBeenCalledWith(item, perms)
    })
  })

  describe('decorateAccess', () => {
    test('writes adapter result onto each item', () => {
      mockDoesUserNeedAccess.mockImplementation((item) =>
        item.permission_id?.includes(78) ? false : true
      )

      const items: AccessDecoratable[] = [
        { permission_id: [78] },
        { permission_id: [999] },
        {},
      ]
      const decorated = decorateAccess(items, perms)

      expect(decorated.map((i) => i.need_access)).toEqual([false, true, true])
    })

    test('decorates children recursively', () => {
      mockDoesUserNeedAccess.mockReturnValue(true)
      const tree: AccessDecoratable = {
        permission_id: [],
        children: [
          {
            permission_id: [],
            children: [{ permission_id: [] }],
          },
        ],
      }

      const decorated = decorateAccess(tree, perms)

      expect(decorated.need_access).toBe(true)
      expect(decorated.children![0].need_access).toBe(true)
      expect(decorated.children![0].children![0].need_access).toBe(true)
    })

    test('returns the same reference it was given', () => {
      mockDoesUserNeedAccess.mockReturnValue(false)
      const items: AccessDecoratable[] = [{ permission_id: [78] }]
      const decorated = decorateAccess(items, perms)
      expect(decorated).toBe(items)
    })
  })
})
