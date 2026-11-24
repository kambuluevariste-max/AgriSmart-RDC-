# AgriSmart-RDC Security Specification

## 1. Data Invariants
- User PII (`email`, `phone`) is strictly isolated in `/users/{userId}/private/{docId}` and readable/writable only by the owner or verified admin.
- Every resource mutation enforces `isSignedIn()`, `isVerified()`, `isValidId()`, strict field allowlists (`hasAll`/`hasOnly` on create, `affectedKeys().hasOnly()` on update), and server timestamps (`request.time`).
- `ownerId` / `buyerId` / `authorId` / `applicantId` / `userId` must match `request.auth.uid` on creation and are immutable on update.
- Admin privileges are verified only via `request.auth.token.email == 'kambuluevariste@gmail.com' && request.auth.token.email_verified == true` or `/admins/{uid}` existence check (never client claims).
- Orders and bookings enforce terminal state locking (`livree`, `annulee`, `completed`, `cancelled` cannot be modified by non-admins).
- Conversation messages enforce the Master Gate (`get()` on parent `/conversations/{conversationId}`) verifying the sender is `participantA` or `participantB`.

## 2. Dirty Dozen Payloads (Adversarial Checks)
1. Shadow field injection on `/products/{id}` (`{ ..., isFeatured: true }`) -> Rejected by `hasOnly`.
2. Identity spoofing on `/products/{id}` (`ownerId: "victim_uid"`) -> Rejected by `ownerId == request.auth.uid`.
3. Unverified email spoof on `/users/{id}` -> Rejected by `request.auth.token.email_verified == true`.
4. Reading another user's `/users/{otherId}/private/info` -> Rejected by `isOwner(userId) || isAdmin()`.
5. Non-member reading `/conversations/{id}/messages/{msgId}` -> Rejected by Master Gate `get()`.
6. Updating an order after `status: 'livree'` -> Rejected by terminal state lock.
7. Oversized document ID (`1500 chars`) -> Rejected by `isValidId()`.
8. Client-spoofed `createdAt` timestamp -> Rejected by `createdAt == request.time`.
9. Blanket list query on `/orders` without buyer/seller/transporter filter -> Rejected by `allow list` evaluating `resource.data`.
10. Modifying `ownerId` during `product` update -> Rejected by `affectedKeys().hasOnly(...)` and `incoming().ownerId == existing().ownerId`.
11. Self-approving a `fundingApplication` (`status: 'approved'`) as applicant -> Rejected by `status == 'submitted'` on create and admin-only status transition.
12. Negative price or quantity in `/products` or `/orders` -> Rejected by numeric bounds (`price >= 0`, `quantity > 0`).
