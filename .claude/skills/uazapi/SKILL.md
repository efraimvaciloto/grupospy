---
name: uazapi
description: Use when working with uazapi WhatsApp API integration — creating/modifying endpoints, debugging webhook events, testing API calls, mapping response fields, or building features that interact with WhatsApp instances, groups, messages, contacts, or campaigns via uazapi.
argument-hint: [describe what you need — e.g. "test instance create", "debug webhook", "add group endpoint"]
allowed-tools: Bash(curl *), Read, Grep, Glob, Edit
---

# uazapi WhatsApp API Integration Skill

You are working with the **uazapiGO v2.0.1** WhatsApp API. This skill contains the complete API reference, authentication patterns, response formats, and project-specific integration details.

## Quick Reference

- **OpenAPI Spec**: `.claude/uazapi-openapi-spec.yaml` (541KB, full spec — read specific sections with offset/limit)
- **Base URL**: `https://free.uazapi.com` (env: `UAZAPI_BASE_URL`)
- **Admin Token**: env `UAZAPI_ADMIN_TOKEN` (header: `admintoken`)
- **Instance Token**: per-instance (header: `token`)
- **Backend service**: `backend/src/services/uazapi.js`
- **Routes using uazapi**: `backend/src/routes/numbers.js`, `backend/src/routes/webhookAndBroadcasts.js`

## Authentication

Two authentication modes:

### Admin Token (system-wide operations)
```
Header: admintoken: <UAZAPI_ADMIN_TOKEN>
Used for: creating instances, listing all instances, admin operations
```

### Instance Token (per-instance operations)
```
Header: token: <instance_token>
Used for: all operations on a specific instance (messages, groups, contacts, etc.)
Obtained from: POST /instance/create response → response.token
```

## Response Format Patterns

**CRITICAL**: uazapi responses nest the instance data inside an `instance` sub-object. Always extract fields correctly:

```javascript
// Creating an instance
const result = await uazapi.createInstance(name, tenantId)
// result = { response: "...", instance: { id, token, status, ... }, token: "...", name: "..." }
const instanceId = result.instance?.id
const instanceToken = result.token  // token is ALSO at root level

// Getting instance status
const result = await uazapi.getInstanceStatus(token)
// result = { instance: { id, status, qrcode, paircode, profileName, ... }, status: { connected, loggedIn, jid } }
const status = result.instance?.status          // "connected" | "disconnected" | "connecting"
const qrCode = result.instance?.qrcode          // base64 QR code image
const phone = result.status?.jid?.user           // phone number when connected

// Connecting instance
const result = await uazapi.connectInstance(token, phone?)
// result = { connected, loggedIn, jid, instance: { id, status, qrcode, paircode, ... } }
const qrCode = result.instance?.qrcode
const pairCode = result.instance?.paircode
```

## Complete API Endpoint Reference

### Instance Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/instance/create` | admintoken | Create new WhatsApp instance |
| GET | `/instance/all` | admintoken | List all instances |
| GET | `/instance/status` | token | Get instance connection status + QR |
| POST | `/instance/connect` | token | Start connection (generates QR or paircode) |
| POST | `/instance/disconnect` | token | Disconnect WhatsApp session |
| POST | `/instance/reset` | token | Reset instance (clear session) |
| DELETE | `/instance` | token | Delete instance permanently |
| POST | `/instance/updateDelaySettings` | token | Set message delay (anti-ban) |
| GET | `/instance/wa_messages_limits` | token | Check WhatsApp conversation limits |
| POST | `/instance/updateInstanceName` | admintoken | Rename instance |
| POST | `/instance/updateAdminFields` | admintoken | Update admin metadata fields |
| POST | `/instance/updateFieldsMap` | token | Update custom fields mapping |
| GET/POST | `/instance/proxy` | token | Manage proxy configuration |
| DELETE | `/instance/proxy` | token | Remove proxy |
| GET/POST | `/instance/privacy` | token | Privacy settings |
| POST | `/instance/presence` | token | Set online/offline presence |

### Sending Messages
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/send/text` | token | Send text message |
| POST | `/send/media` | token | Send image/video/audio/document |
| POST | `/send/contact` | token | Send contact card (vCard) |
| POST | `/send/location` | token | Send GPS location |
| POST | `/send/status` | token | Post WhatsApp status/story |
| POST | `/send/menu` | token | Send interactive menu (list/buttons) |
| POST | `/send/carousel` | token | Send carousel message |
| POST | `/send/location-button` | token | Location with button |
| POST | `/send/request-payment` | token | Request payment |

#### Send Text Example
```json
POST /send/text
Header: token: <instance_token>
Body: {
  "number": "5511999999999@s.whatsapp.net",  // or group JID
  "text": "Hello!",
  "async": true,
  "track_source": "grupospy",
  "track_id": "optional-tracking-id",
  "replyid": "optional-message-id-to-reply"
}
```

#### Send Media Example
```json
POST /send/media
Body: {
  "number": "5511999999999@s.whatsapp.net",
  "type": "image",        // image | video | audio | document
  "file": "https://...",  // URL or base64
  "text": "Caption text",
  "async": true
}
```

### Message Operations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/message/find` | token | Search/list messages (with pagination) |
| POST | `/message/history-sync` | token | Request message history sync |
| POST | `/message/download` | token | Download media from message |
| POST | `/message/react` | token | Add emoji reaction |
| POST | `/message/delete` | token | Delete message |
| POST | `/message/edit` | token | Edit sent message |
| POST | `/message/pin` | token | Pin/unpin message |
| POST | `/message/markread` | token | Mark messages as read |
| POST | `/message/presence` | token | Show typing/recording indicator |
| GET/DELETE | `/message/async` | token | Manage async message queue |

### Groups
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/group/list` | token | List groups (paginated: limit, offset, search) |
| POST | `/group/info` | token | Get group details + invite link |
| POST | `/group/create` | token | Create new group |
| POST | `/group/join` | token | Join group via invite code |
| POST | `/group/leave` | token | Leave group |
| POST | `/group/updateName` | token | Rename group |
| POST | `/group/updateDescription` | token | Update group description |
| POST | `/group/updateImage` | token | Update group picture |
| POST | `/group/updateParticipants` | token | Add/remove/promote/demote members |
| POST | `/group/updateAnnounce` | token | Set announcement-only mode |
| POST | `/group/updateLocked` | token | Lock/unlock settings |
| POST | `/group/resetInviteCode` | token | Generate new invite link |
| POST | `/group/inviteInfo` | token | Get info about invite link |

#### List Groups Example
```json
POST /group/list
Body: {
  "force": false,          // force refresh from WhatsApp
  "noParticipants": true,  // skip participant list (faster)
  "limit": 50,
  "offset": 0,
  "search": "optional search term"
}
// Response: array of Group objects with JID, Name, Participants, etc.
```

### Contacts & Chat
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/contacts` | token | List all contacts |
| POST | `/contacts/list` | token | List contacts (paginated) |
| POST | `/contact/add` | token | Add contact |
| POST | `/contact/remove` | token | Remove contact |
| POST | `/chat/check` | token | Check if numbers have WhatsApp |
| POST | `/chat/details` | token | Get detailed chat info |
| POST | `/chat/find` | token | Search chats |
| POST | `/chat/read` | token | Mark chat as read |
| POST | `/chat/delete` | token | Delete chat |
| POST | `/chat/archive` | token | Archive/unarchive chat |
| POST | `/chat/mute` | token | Mute/unmute chat |
| POST | `/chat/pin` | token | Pin/unpin chat |
| POST | `/chat/block` | token | Block/unblock contact |
| GET | `/chat/blocklist` | token | Get blocked contacts |
| POST | `/chat/labels` | token | Assign labels to chat |
| POST | `/chat/editLead` | token | Update lead info (CRM) |
| POST | `/chat/notes` | token | Add notes to chat |

### Bulk Sender (Campaigns)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sender/simple` | token | Simple bulk send |
| POST | `/sender/advanced` | token | Advanced campaign with scheduling |
| POST | `/sender/edit` | token | Control campaign (stop/start/delete) |
| GET | `/sender/listfolders` | token | List campaign folders |
| POST | `/sender/listmessages` | token | List messages in campaign folder |
| POST | `/sender/cleardone` | token | Clear completed campaigns |
| DELETE | `/sender/clearall` | token | Clear all campaigns |

#### Advanced Campaign Example
```json
POST /sender/advanced
Body: {
  "info": "Campaign name",
  "delayMin": 3,
  "delayMax": 8,
  "scheduled_for": 1,   // 1 = send now, or unix timestamp
  "messages": [
    {
      "number": "5511999999999",
      "text": "Hello {{name}}!"
    }
  ]
}
```

### Webhooks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/webhook` | token | Get current webhook config |
| POST | `/webhook` | token | Configure webhook |
| GET | `/webhook/errors` | token | Get webhook error logs |
| GET/POST | `/globalwebhook` | admintoken | Global webhook (all instances) |
| GET | `/sse` | token | Server-Sent Events stream |

#### Webhook Configuration Example
```json
POST /webhook
Body: {
  "url": "https://your-server.com/webhook/uazapi/{instanceId}",
  "enabled": true,
  "addUrlEvents": true,  // appends event type to URL: /webhook/uazapi/{id}/messages
  "events": [
    "connection",       // instance connected/disconnected
    "messages",         // new messages received
    "messages_update",  // message status updates (delivered, read)
    "groups",           // group changes
    "contacts",         // contact updates
    "sender",           // bulk sender status
    "chats",            // chat updates
    "history"           // message history sync
  ],
  "excludeMessages": ["isGroupNo"]  // only group messages
}
```

#### Webhook Event Types
| Event | Trigger |
|-------|---------|
| `connection` | Instance connects/disconnects |
| `messages` | New message received |
| `messages_update` | Message status change (sent/delivered/read) |
| `groups` | Group created/updated/member changes |
| `contacts` | Contact added/updated |
| `presence` | Online/offline/typing status |
| `sender` | Bulk sender status update |
| `chats` | Chat opened/closed/archived |
| `chat_labels` | Label assigned/removed |
| `labels` | Label created/updated |
| `blocks` | Contact blocked/unblocked |
| `history` | Historical messages from sync |
| `call` | Incoming/outgoing call |
| `newsletter_messages` | Newsletter message received |

### Newsletters/Channels
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/newsletter/create` | token | Create newsletter |
| GET | `/newsletter/list` | token | List newsletters |
| POST | `/newsletter/info` | token | Get newsletter info |
| POST | `/newsletter/messages` | token | Send newsletter message |
| POST | `/newsletter/subscribe` | token | Subscribe to newsletter |
| POST | `/newsletter/follow` | token | Follow/unfollow |
| POST | `/newsletter/search` | token | Search newsletters |
| + more admin, settings, and moderation endpoints |

### Business Profile & Catalog
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/business/get/profile` | token | Get business profile |
| POST | `/business/update/profile` | token | Update business profile |
| POST | `/business/catalog/list` | token | List catalog products |
| POST | `/business/catalog/info` | token | Get product info |
| + more catalog management endpoints |

### Labels & Quick Replies
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/labels` | token | List all labels |
| POST | `/label/edit` | token | Create/update label |
| GET | `/quickreply/showall` | token | List quick replies |
| POST | `/quickreply/edit` | token | Create/edit quick reply |

### Calls
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/call/make` | token | Make phone call |
| POST | `/call/reject` | token | Reject incoming call |

### Profile
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/profile/name` | token | Update profile name |
| POST | `/profile/image` | token | Update profile picture |

### Administration
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/restart` | admintoken | Restart API server |

## Core Data Models

### Instance Object
```
id: string (UUID)
token: string
status: "connected" | "disconnected" | "connecting"
name: string
profileName: string
profilePicUrl: string (URL)
phoneNumber: string
isBusiness: boolean
platform: string
qrcode: string (base64)
paircode: string
```

### Group Object
```
JID: string (e.g., "120363123456@g.us")
Name: string
OwnerJID: string
Participants: GroupParticipant[]
IsAnnounce: boolean
IsLocked: boolean
IsEphemeral: boolean
GroupCreated: timestamp
```

### Message Object
```
id: string (message ID)
chatJID: string
senderJID: string
timestamp: number (unix)
type: string (text, image, video, audio, document, etc.)
text: string
file: string (URL for media)
status: "Queued" | "Sent" | "Delivered" | "Read" | "Failed"
isFromMe: boolean
isGroup: boolean
quotedMessage: object (if replying)
```

### Webhook Event Structure
```
event: string (event type)
instance: string (instance ID)
data: object (event-specific data)
```

## Project Integration Patterns

### Backend Service Location
`backend/src/services/uazapi.js` — Central wrapper for all uazapi calls.

Pattern for adding new endpoints:
```javascript
export async function newEndpoint(token, params) {
  return request('/endpoint/path', {
    method: 'POST',
    body: { ...params },
  }, token)
}
```

For admin endpoints:
```javascript
export async function adminEndpoint(params) {
  return request('/admin/endpoint', {
    method: 'POST',
    adminToken: true,
    body: { ...params },
  })
}
```

### Database Schema (wa_numbers table)
```sql
wa_numbers:
  id UUID PRIMARY KEY
  tenant_id UUID (FK tenants)
  label TEXT
  phone_number TEXT
  uazapi_instance_id TEXT
  uazapi_token TEXT
  webhook_id TEXT
  status TEXT (connected/disconnected/connecting/pending)
  qr_code TEXT
  pair_code TEXT
  profile_name TEXT
  profile_pic_url TEXT
  is_business BOOLEAN
  msg_delay_min INT (default 3)
  msg_delay_max INT (default 8)
```

### Webhook Processing
- Webhook receiver: `backend/src/routes/webhookAndBroadcasts.js`
- URL pattern: `POST /webhook/uazapi/:instanceId/:eventType`
- Event processor: `backend/src/services/webhookProcessor.js`

### Testing Endpoints via curl
```bash
# Admin: Create instance
curl -X POST https://free.uazapi.com/instance/create \
  -H "Content-Type: application/json" \
  -H "admintoken: $UAZAPI_ADMIN_TOKEN" \
  -d '{"name": "test-instance", "systemName": "GrupoSpy"}'

# Instance: Get status
curl https://free.uazapi.com/instance/status \
  -H "token: $INSTANCE_TOKEN"

# Instance: Send text
curl -X POST https://free.uazapi.com/send/text \
  -H "Content-Type: application/json" \
  -H "token: $INSTANCE_TOKEN" \
  -d '{"number": "5511999999999", "text": "Hello!", "async": true}'
```

## Important Notes

1. **Rate Limits**: HTTP 429 when max concurrent instances exceeded
2. **Free tier**: Instances auto-delete after 1 hour of inactivity
3. **Phone format**: International format without `+` (e.g., `5511999999999`)
4. **Group JID format**: `120363xxxxx@g.us`
5. **Contact JID format**: `5511999999999@s.whatsapp.net`
6. **QR Code timeout**: 2 minutes; Pair code timeout: 5 minutes
7. **Message delay**: Configure `msg_delay_min`/`msg_delay_max` for anti-ban
8. **History sync**: Messages from last 7 days are stored; older messages purged nightly
9. **Webhook.site**: Avoid for testing — rate limited by uazapi

## When to Consult the Full Spec

For detailed request/response schemas, edge cases, or endpoints not covered here, read the full OpenAPI spec:
```
Read .claude/uazapi-openapi-spec.yaml with offset/limit targeting the specific endpoint
```

Search pattern: `grep "/endpoint/path" .claude/uazapi-openapi-spec.yaml` to find line numbers, then read from that offset.
