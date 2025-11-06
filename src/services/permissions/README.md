# Permissions Module

Abstraction layer for permissions in Musora Content Services.

## Purpose

This module provides a flexible contract between content services and permissions implementations, enabling seamless switching between v1 and v2 without breaking consumer code.

## Files

- **`index.ts`** - Main exports (TypeScript)
- **`PermissionsAdapter.ts`** - Abstract base class defining the contract (TypeScript)
- **`PermissionsV1Adapter.ts`** - V1 implementation (current system, TypeScript)
- **`PermissionsV2Adapter.ts`** - V2 implementation (placeholder, TypeScript)
- **`PermissionsAdapterFactory.ts`** - Factory for getting appropriate adapter (TypeScript)

## Quick Usage

```typescript
import { getPermissionsAdapter } from './services/permissions/index.js'

// Get adapter (automatically selects v1 or v2 based on config)
const adapter = getPermissionsAdapter()

// Fetch user permissions
const permissions = await adapter.fetchUserPermissions()

// Check if user is admin
if (adapter.isAdmin(permissions)) {
  // Admin logic
}

// Check if user needs access to content
const needsAccess = adapter.doesUserNeedAccess(content, permissions)

// Generate GROQ filter for permissions
const filter = adapter.generatePermissionsFilter(permissions, {
  prefix: '',
  showMembershipRestrictedContent: false,  // Set true to show membership-restricted content for upgrades
})
```

## Configuration

Set `permissionsVersion` in `initializeService()`:

```javascript
import { initializeService } from 'musora-content-services'

initializeService({
  // ... other config
  permissionsVersion: 'v1', // 'v1' (default) or 'v2'
})
```

## Documentation

For full details, see the inline documentation in each TypeScript file.

## Architecture

```
Consumer Code
     ↓
PermissionsAdapterFactory (getPermissionsAdapter)
     ↓
PermissionsV1Adapter OR PermissionsV2Adapter
     ↓
V1/V2 Implementation
```

## Contract

All adapters must implement:

- `fetchUserPermissions()` - Fetch user's permissions data
- `doesUserNeedAccess(content, userPermissions)` - Check if user needs access
- `generatePermissionsFilter(userPermissions, options)` - Generate GROQ filter
- `getUserPermissionIds(userPermissions)` - Get permission IDs
- `isAdmin(userPermissions)` - Check if user is admin

## V1 Implementation

Current permissions system:
- Permission-based access using permission IDs
- Basic members automatically get access to songs content (permission 92 added to their permissions)
- Admins bypass all checks
- Content with no permissions is accessible to all

### Show Membership-Restricted Content

V1 adapter supports showing membership-restricted content for upgrade prompts:

```typescript
const filter = adapter.generatePermissionsFilter(permissions, {
  showMembershipRestrictedContent: true,
})
```

This shows content requiring paid membership (permissions 91 for Basic, 92 for Plus) even if user doesn't have it. Content requiring other permissions (packs, individual purchases) is still filtered.

**Use case:** Show non-members what membership-tier content is available to encourage upgrades.

## V2 Implementation

New permissions system (placeholder):
- Different permission structure (TBD)

## Testing

Mock the adapter for tests:

```typescript
import { PermissionsAdapter, UserPermissions } from './services/permissions/PermissionsAdapter.js'

class MockAdapter extends PermissionsAdapter {
  async fetchUserPermissions(): Promise<UserPermissions> {
    return { permissions: ['78', '91'], isAdmin: false, isABasicMember: true }
  }

  doesUserNeedAccess(content: any, userPermissions: UserPermissions): boolean {
    return false // User has access
  }

  // ... implement other methods
}
```

## Contributing

When implementing V2:

1. Update `PermissionsV2Adapter.ts` with v2 logic
2. Test with `permissionsVersion: 'v2'` in `initializeService()`
3. Update documentation
4. Coordinate with frontend team for data structure changes
