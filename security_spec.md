# Security Specification & Threat Model (iRunBets + iOS Shared Database)

## 1. Data Invariants
- **Authentication**: All writes (except landing subscribers signup) require authenticated sessions with verified emails.
- **Isolamento de Utilizador**: Any user can READ/WRITE only their own `apostas` and `bankrolls` documents. They are forbidden from querying or modifying other users' data.
- **Profile Integrity**: A user can only initialize and modify their own `/utilizadores/{userId}` profile document.
- **System Integrity (News & Permissions)**: Only admins can write news articles or change role parameters. Default users are prevented from escalating privileges.
- **Immutable Fields**: Fields such as `createdAt` and `userId` are strictly immutable after creation.
- **Value Limits**: Cotações (odds) must be greater than 1.0. Stake must be greater than 0.

---

## 2. The "Dirty Dozen" Payloads (Threat Vectors)

1. **Spoofed Bet Creator**: Authenticated user `A` tries to insert a betting document with `userId: "B"`.
   - *Result*: `PERMISSION_DENIED`
2. **Negative Stake Exploitation**: An attacker tries to write a bet with `stake: -500.0`.
   - *Result*: `PERMISSION_DENIED`
3. **Invalid Odd Poisoning**: An attacker tries to write an odd of `0.5`, which is mathematically impossible for bets.
   - *Result*: `PERMISSION_DENIED`
4. **Altering Past Registration Dates**: A user tries to backdate a bet by modifying the `date` field.
   - *Result*: `PERMISSION_DENIED`
5. **Private Profile Scraping**: User `A` attempts to read user `B`'s profile from `/utilizadores/B`.
   - *Result*: `PERMISSION_DENIED`
6. **Impersonator Token Injection**: User fields like `email` loaded from auth must match the user profile document properties exactly. Attempting to register another user's email is blocked.
   - *Result*: `PERMISSION_DENIED`
7. **Ad-Hoc Subscriber Promotion**: A subscriber attempts to update their tier from `Gratuito` to `Premium` themselves without admin intervention or checkout proof.
   - *Result*: `PERMISSION_DENIED`
8. **Inter-User Bankroll Poisoning**: User `A` tries to read or overwrite User `B`'s bankroll under `/bankrolls/{bankrollId}`.
   - *Result*: `PERMISSION_DENIED`
9. **Rogue Admin Claims**: An unauthenticated user tries to register an article into `/news/{newsId}`.
   - *Result*: `PERMISSION_DENIED`
10. **Shadow Updates**: Attempting to write arbitrary fields that do not fit the schema definitions in `firebase-blueprint.json` (e.g., injecting `isHackState: true`).
    - *Result*: `PERMISSION_DENIED`
11. **Client-Side Admin Hijacking**: User `A` attempts to modify their email to `morgado.aam@gmail.com` to trigger client-side admin routing.
    - *Result*: `PERMISSION_DENIED`
12. **Denial of Wallet Collection Scan**: Performing an insecure list query on `/bets` or `/apostas` without matching a specific `userId == request.auth.uid` clause.
    - *Result*: `PERMISSION_DENIED`

---

## 3. Test Coverage Strategy
These payloads will be programmatically validated during integration using Firestore emulator or client-side isolation checks. The compiled security rules (`firestore.rules`) will handle these zero-trust validations natively on Google’s servers.
