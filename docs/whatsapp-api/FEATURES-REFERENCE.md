# WhatsApp API - Complete Features Reference

> **Quick Reference Guide** for all implemented features  
> **Last Updated**: December 28, 2025

---

## 📬 Messages Module

### MediaHandler

#### Image Messages
```typescript
sendImage(jid: string, image: Buffer | string, caption?: string)
sendImageFromUrl(jid: string, url: string, caption?: string)
```

#### Video Messages
```typescript
sendVideo(jid: string, video: Buffer | string, caption?: string)
sendVideoFromUrl(jid: string, url: string, caption?: string)
```

#### Audio Messages
```typescript
sendAudio(jid: string, audio: Buffer | string, ptt?: boolean)
sendPTT(jid: string, audio: Buffer | string)
sendAudioFromUrl(jid: string, url: string)
```

#### Document Messages
```typescript
sendDocument(jid: string, document: Buffer | string, mimetype: string, filename: string, caption?: string)
sendPdf(jid: string, pdf: Buffer | string, filename: string, caption?: string)
sendDocumentFromUrl(jid: string, url: string, mimetype: string, filename: string, caption?: string)
```

#### Sticker Messages
```typescript
sendSticker(jid: string, sticker: Buffer | string)
sendStickerFromUrl(jid: string, url: string)
createSticker(image: Buffer, options?)
```

---

### ReactionHandler

```typescript
addReaction(jid: string, messageId: string, emoji: string)
removeReaction(jid: string, messageId: string)
getReactionHistory(jid: string, messageId: string)
```

---

### QuoteHandler

```typescript
quoteMessage(jid: string, text: string, quotedMessage: WAMessage)
quoteWithMentions(jid: string, text: string, quotedMessage: WAMessage, mentions: string[])
getQuotedMessage(message: WAMessage)
```

---

### PollHandler

```typescript
createPoll(jid: string, name: string, values: string[], selectableCount?: number)
createSingleChoicePoll(jid: string, question: string, options: string[])
createMultipleChoicePoll(jid: string, question: string, options: string[], maxSelections: number)
votePoll(jid: string, pollMessageId: string, optionNames: string[])
getPollVotes(pollMessage: WAMessage)
getPollResults(pollMessage: WAMessage)
```

---

### MessageModifierHandler

```typescript
editMessage(jid: string, messageId: string, newText: string)
deleteMessage(jid: string, messageKey: WAMessageKey)
deleteForEveryone(jid: string, messageKey: WAMessageKey)
forwardMessage(fromJid: string, messageId: string, toJid: string)
forwardMessageToMultiple(fromJid: string, messageId: string, toJids: string[], delayMs?: number)
reactToMessage(jid: string, messageId: string, emoji: string)
removeReaction(jid: string, messageId: string)
```

---

## 👥 Groups Module

### GroupManager

#### Group Creation & Info
```typescript
createGroup(subject: string, participants: string[])
getMetadata(groupJid: string)
fetchAllGroups()
getGroupInfoByInviteCode(inviteCode: string)
```

#### Group Modification
```typescript
updateSubject(groupJid: string, subject: string)
updateDescription(groupJid: string, description?: string)
leaveGroup(groupJid: string)
```

#### Group Queries
```typescript
isAdmin(groupJid: string, userJid?: string)
isParticipant(groupJid: string, userJid?: string)
getParticipantCount(groupJid: string)
getAdmins(groupJid: string)
getOwner(groupJid: string)
```

---

### ParticipantManager

#### Add/Remove Participants
```typescript
addParticipants(groupJid: string, participants: string[])
addParticipant(groupJid: string, participant: string)
removeParticipants(groupJid: string, participants: string[])
removeParticipant(groupJid: string, participant: string)
batchAddParticipants(groupJid: string, participants: string[], batchSize?: number, delayMs?: number)
```

#### Admin Management
```typescript
promoteToAdmin(groupJid: string, participants: string[])
promoteParticipant(groupJid: string, participant: string)
demoteFromAdmin(groupJid: string, participants: string[])
demoteParticipant(groupJid: string, participant: string)
```

#### Result Helpers
```typescript
isSuccessful(result: ParticipantUpdateResult)
getFailedOperations(results: ParticipantUpdateResult[])
getSuccessCount(results: ParticipantUpdateResult[])
```

---

### SettingsManager

#### Announcement Mode
```typescript
toggleAnnouncement(groupJid: string, announce: boolean)
enableAnnouncement(groupJid: string)
disableAnnouncement(groupJid: string)
isAnnouncementMode(groupJid: string)
```

#### Locked Settings
```typescript
toggleLocked(groupJid: string, locked: boolean)
lockSettings(groupJid: string)
unlockSettings(groupJid: string)
isLocked(groupJid: string)
```

#### Ephemeral Messages
```typescript
toggleEphemeral(groupJid: string, ephemeralExpiration: number)
enableEphemeral24h(groupJid: string)
enableEphemeral7d(groupJid: string)
enableEphemeral90d(groupJid: string)
disableEphemeral(groupJid: string)
isEphemeralEnabled(groupJid: string)
getEphemeralExpiration(groupJid: string)
```

#### Settings Management
```typescript
getGroupSettings(groupJid: string)
applySettings(groupJid: string, settings: GroupSettings)
resetSettings(groupJid: string)
```

---

### InviteManager

#### Invite Generation
```typescript
getInviteCode(groupJid: string)
getInviteLink(groupJid: string)
revokeInviteCode(groupJid: string)
revokeInviteLink(groupJid: string)
generateInviteMessage(groupJid: string, customMessage?: string)
```

#### Invite Actions
```typescript
acceptInvite(inviteCode: string)
batchAcceptInvites(inviteCodes: string[], delayMs?: number)
```

#### Invite Info
```typescript
getGroupInfoFromInvite(inviteCode: string)
isInviteCodeValid(inviteCode: string)
getGroupSizeFromInvite(inviteCode: string)
getGroupNameFromInvite(inviteCode: string)
```

#### Utilities
```typescript
extractInviteCode(inviteCodeOrUrl: string)
```

---

### PictureManager (Groups)

#### Get Pictures
```typescript
getProfilePictureUrl(groupJid: string, highRes?: boolean)
getHighResProfilePictureUrl(groupJid: string)
getPreviewProfilePictureUrl(groupJid: string)
hasProfilePicture(groupJid: string)
getProfilePictureInfo(groupJid: string)
```

#### Set/Remove Pictures
```typescript
setProfilePicture(groupJid: string, image: Buffer | string)
setProfilePictureFromUrl(groupJid: string, imageUrl: string)
removeProfilePicture(groupJid: string)
```

#### Download Pictures
```typescript
downloadProfilePicture(groupJid: string, highRes?: boolean)
downloadAndSaveProfilePicture(groupJid: string, savePath: string, highRes?: boolean)
```

#### Utilities
```typescript
areProfilePicturesSame(groupJid1: string, groupJid2: string)
```

---

## 👤 Users Module

### ProfileManager

#### Status Operations
```typescript
getStatus(jid: string)
```

#### WhatsApp Registration
```typescript
checkWhatsAppNumbers(phoneNumbers: string | string[])
isOnWhatsApp(phoneNumber: string)
```

#### Business Profile
```typescript
getBusinessProfile(jid: string)
isBusinessAccount(jid: string)
```

#### Block Management
```typescript
blockUser(jid: string)
unblockUser(jid: string)
getBlockedUsers()
isUserBlocked(jid: string)
batchBlockUsers(jids: string[], delayMs?: number)
batchUnblockUsers(jids: string[], delayMs?: number)
```

#### User Info
```typescript
getUserInfo(jid: string)
normalizeJid(phoneNumber: string)
```

---

### UserPictureManager

#### Get Pictures
```typescript
getProfilePictureUrl(jid: string, highRes?: boolean)
getHighResProfilePictureUrl(jid: string)
getPreviewProfilePictureUrl(jid: string)
hasProfilePicture(jid: string)
getProfilePictureInfo(jid: string)
```

#### Set Own Picture
```typescript
setOwnProfilePicture(image: Buffer | string)
setOwnProfilePictureFromUrl(imageUrl: string)
removeOwnProfilePicture()
```

#### Download Pictures
```typescript
downloadProfilePicture(jid: string, highRes?: boolean)
downloadAndSaveProfilePicture(jid: string, savePath: string, highRes?: boolean)
batchDownloadProfilePictures(jids: string[], highRes?: boolean, delayMs?: number)
```

#### Utilities
```typescript
areProfilePicturesSame(jid1: string, jid2: string)
```

---

### PresenceManager

#### Presence Subscription
```typescript
subscribeToPresence(jid: string)
unsubscribeFromPresence(jid: string)
batchSubscribe(jids: string[], delayMs?: number)
batchUnsubscribe(jids: string[])
```

#### Presence Status
```typescript
getPresenceData(jid: string)
isUserOnline(jid: string)
isUserUnavailable(jid: string)
getPresenceStatus(jid: string)
```

#### Activity Indicators
```typescript
isUserTyping(jid: string)
isUserRecording(jid: string)
isUserPaused(jid: string)
```

#### Last Seen
```typescript
getLastSeen(jid: string)
getLastSeenFormatted(jid: string)
```

#### Cache Management
```typescript
clearPresenceCache()
getAllPresenceData()
getCachedPresenceCount()
```

---

## 📊 Method Count by Module

| Module | Handlers | Methods | Lines of Code |
|--------|----------|---------|---------------|
| **Messages** | 5 | 30+ | 1,572 |
| **Groups** | 5 | 66+ | 1,608 |
| **Users** | 3 | 41+ | 866 |
| **Total** | **13** | **137+** | **4,046** |

---

## 🔑 Common Parameters

### JID Formats
```typescript
// User JID
'1234567890@s.whatsapp.net'

// Group JID
'1234567890-1234567890@g.us'

// Phone number (auto-normalized)
'+1234567890'
'1234567890'
```

### Media Input Types
```typescript
Buffer           // Direct buffer
string           // File path
URL              // Remote URL (with *FromUrl methods)
```

### Common Options
```typescript
delayMs?: number        // Delay in batch operations (default: 500-2000ms)
highRes?: boolean       // High resolution images (default: false)
caption?: string        // Media captions
mimetype?: string       // MIME type for documents
```

---

## ⚠️ Important Notes

### Rate Limiting
All batch operations include configurable rate limiting:
- **Participants**: Max 50 per batch
- **Messages**: 500-2000ms delay recommended
- **Presence**: 300ms delay recommended
- **Downloads**: 500ms delay recommended

### Error Handling
All methods include:
- ✅ Input validation
- ✅ JID normalization
- ✅ Try-catch blocks
- ✅ Detailed logging
- ✅ Graceful error returns

### Best Practices
1. **Always normalize JIDs** before storage
2. **Use batch operations** for multiple items
3. **Respect rate limits** to avoid bans
4. **Subscribe to presence** before checking online status
5. **Cache group metadata** to reduce queries
6. **Handle null returns** gracefully

---

## 📚 Additional Resources

- **Full Documentation**: See `IMPLEMENTATION-COMPLETE.md`
- **Code Examples**: See `README.md`
- **Type Definitions**: Check TypeScript interfaces in code
- **Baileys Docs**: https://github.com/WhiskeySockets/Baileys

---

**Complete Feature Set** ✅  
**Production Ready** 🚀
