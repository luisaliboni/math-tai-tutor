# Code Organization Guide

## 📁 New Project Structure

Your codebase has been reorganized for better maintainability and scalability.

### Key Directories

```
/
├── agents/              # AI agent configuration (UNCHANGED - as requested)
│   ├── agent-factory.ts
│   ├── workflow-stream.ts
│   └── workflow.ts
│
├── app/                 # Next.js App Router
│   ├── api/            # API routes (organized by feature)
│   ├── chat/           # Chat page
│   ├── login/          # Login page
│   └── signup/         # Signup page
│
├── components/          # React components (REORGANIZED)
│   ├── chat/           # Chat-related components
│   │   ├── ChatWithHistory.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ConversationSidebar.tsx
│   │   └── Sidebar.tsx
│   └── common/         # Shared UI components
│       └── LatexRenderer.tsx
│
├── database/           # SQL migration files (NEW)
│   ├── supabase-setup.sql
│   ├── supabase-conversations.sql
│   └── ...
│
├── hooks/              # Custom React hooks (NEW - ready for future use)
│
├── lib/                # Library utilities
│   ├── stream-adapter.ts
│   ├── supabase.ts
│   └── supabase-server.ts
│
├── services/           # API service layer (NEW)
│   └── api/
│       ├── chat.ts
│       ├── conversations.ts
│       └── files.ts
│
├── types/              # Shared TypeScript types (NEW)
│   └── index.ts
│
└── utils/              # Utility functions (NEW)
    ├── constants.ts
    └── date.ts
```

## 🎯 What Changed

### 1. **Type Safety** (`/types/`)
- Centralized all TypeScript interfaces
- Eliminates duplicate type definitions
- Ensures consistency across the app

**Usage:**
```typescript
import { Message, Conversation, UploadedFileInfo } from '@/types';
```

### 2. **Utilities** (`/utils/`)
- `constants.ts` - Application constants (file types, title lengths, etc.)
- `date.ts` - Date formatting utilities (removed duplicate code)

**Usage:**
```typescript
import { formatDate } from '@/utils/date';
import { MAX_TITLE_LENGTH, ACCEPTED_FILE_TYPES } from '@/utils/constants';
```

### 3. **Component Organization** (`/components/`)
- **`/chat/`** - All chat-related components grouped together
- **`/common/`** - Shared UI components (LatexRenderer, etc.)
- **`/auth/`** - Ready for authentication components

### 4. **API Services** (`/services/api/`)
- Centralized API calls with proper error handling
- Type-safe API functions
- Easy to mock for testing

**Usage:**
```typescript
import { getConversations, createConversation } from '@/services/api/conversations';
import { getChatHistory } from '@/services/api/chat';
import { uploadFile } from '@/services/api/files';
```

### 5. **Database Files** (`/database/`)
- All SQL migration files organized in one place
- Easy to find and manage database schema

## 📝 Import Paths Updated

All imports have been updated to use the new structure:

```typescript
// Components
import ChatWithHistory from '@/components/chat/ChatWithHistory';
import LatexRenderer from '@/components/common/LatexRenderer';

// Types
import { Message, Conversation } from '@/types';

// Utils
import { formatDate } from '@/utils/date';
import { MAX_TITLE_LENGTH } from '@/utils/constants';

// Services
import { getConversations } from '@/services/api/conversations';
```

## ✅ Benefits

1. **Better Organization** - Related code is grouped together
2. **Reduced Duplication** - Shared utilities eliminate duplicate code
3. **Type Safety** - Centralized types ensure consistency
4. **Easier Maintenance** - Clear structure makes finding code easier
5. **Scalability** - Structure supports future growth

## 🚀 Next Steps (Optional)

1. **Use API Services** - Gradually migrate components to use the new API service layer
2. **Create Custom Hooks** - Extract common logic into reusable hooks
3. **Add Error Boundaries** - Improve error handling with React error boundaries
4. **Extract More Constants** - Move magic strings/numbers to constants file

## 📚 Related Documents

- `REFACTORING_SUMMARY.md` - Detailed refactoring summary
- `MODEL_UPGRADE_RECOMMENDATION.md` - Guide for upgrading AI model

## ⚠️ Important Notes

- **`agents/` folder is UNCHANGED** - As requested, all agent configuration remains in place
- **No breaking changes** - All existing functionality works as before
- **All imports updated** - No need to manually fix import paths

