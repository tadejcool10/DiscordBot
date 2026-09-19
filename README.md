# GoodMC Staff Quota Bot

Discord bot for managing a staff list and tracking staff message quotas.

## Commands

### Staff management

- `/staff add user:@User` — add someone to staff
- `/staff remove user:@User` — remove someone from staff
- `/staff list` — show staff and their progress

### Quotas

- `/quota` — show every staff member's progress
- `/quota user:@User` — check one staff member
- `/quota set messages:100` — set the required message count
- `/quota-reset user:@User` — reset a staff member's count

Staff members' messages are automatically counted whenever they send a message in the server. Bot messages are ignored.

## Setup

1. Install Node.js 18.17+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in `TOKEN`, `CLIENT_ID`, and `GUILD_ID`.
5. Start with `npm start`.

The bot needs the **Message Content Intent** enabled in the Discord Developer Portal so it can count message events.

Data is stored locally in `staff-data.json`, which is intentionally ignored by Git.
