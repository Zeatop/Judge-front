<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Judge AI — a React + Vite frontend application that lets users ask rules questions to an AI judge for board games (MTG, Catan, Monopoly, and more).

**SDK used:** `posthog-js` (browser client SDK — the project is a client-side React/Vite app, not a server-side Node.js app)

**Files created/modified:**

- `src/lib/posthog.ts` — PostHog singleton; reads keys from env and initializes the client
- `src/main.tsx` — calls `initPostHog()` at app startup before React renders
- `src/App.tsx` — question_asked, guest_limit_reached, game_changed, model_changed, new_chat_started, chat_loaded_from_history, and error tracking
- `src/auth/Authcontext.tsx` — `posthog.identify()` after login, guest_chats_migrated event
- `src/auth/Loginpage.tsx` — login_initiated event (with provider property)
- `src/components/Usermenu.tsx` — user_logged_out event + `posthog.reset()` on logout
- `src/components/Sidebar.tsx` — chat_deleted and chat_renamed events

**Environment variables added to `.env`:**

| Variable | Purpose |
|---|---|
| `VITE_POSTHOG_KEY` | PostHog project public token |
| `VITE_POSTHOG_HOST` | PostHog ingest host |

## Events instrumented

| Event | Description | File |
|---|---|---|
| `question_asked` | User or guest submits a rules question to the AI judge | `src/App.tsx` |
| `guest_limit_reached` | Guest user hits the free question limit and is shown the login modal | `src/App.tsx` |
| `game_changed` | User changes the active game (e.g. MTG → Catan) | `src/App.tsx` |
| `model_changed` | User changes the AI model used for answering questions | `src/App.tsx` |
| `new_chat_started` | User explicitly starts a fresh conversation | `src/App.tsx` |
| `chat_loaded_from_history` | User opens a past conversation from the sidebar | `src/App.tsx` |
| `login_initiated` | User clicks a login provider button (OAuth redirect starts) | `src/auth/Loginpage.tsx` |
| `user_logged_out` | Authenticated user clicks the logout button | `src/components/Usermenu.tsx` |
| `chat_deleted` | User deletes a conversation from the sidebar | `src/components/Sidebar.tsx` |
| `chat_renamed` | User renames a conversation in the sidebar | `src/components/Sidebar.tsx` |
| `guest_chats_migrated` | Guest conversations are migrated to the user's account after login | `src/auth/Authcontext.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics:** https://us.posthog.com/project/400858/dashboard/1518885
- **Questions asked over time:** https://us.posthog.com/project/400858/insights/xevCtZ4Q
- **Guest-to-login conversion funnel:** https://us.posthog.com/project/400858/insights/xjfeKWaa
- **Questions by game:** https://us.posthog.com/project/400858/insights/C3AKqY1U
- **Login provider breakdown:** https://us.posthog.com/project/400858/insights/9Yvc3Fii
- **Daily active users (questions):** https://us.posthog.com/project/400858/insights/aAB2HSVH

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-javascript_node/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
