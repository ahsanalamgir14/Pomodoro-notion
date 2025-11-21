Goal: Set up three Notion databases manually so the app can read/write: Quests, Time Tracking, Adventure, with correct property types and relations.

Parent Page
- Create a new Notion page named "Pomodoro Demo Workspace".
- Add all databases inside this page.

Quests Database
- Add an inline database named "Quests" in the parent page.
- Properties:
  - Name: title
  - Status: select (Not started, In progress, Completed)
  - Start Date: date
  - Due Date: date

Time Tracking Database
- Add another inline database named "Time Tracking".
- Properties:
  - Name: title
  - Status: status (or select with In Progress, Paused, Completed)
  - Start Time: date
  - End Time: date
  - Duration: number (minutes)
  - Notes: rich_text
  - Tags: multi_select (options can be empty)
  - Quests: relation → link to the "Quests" database

Adventure Database
- Add a third inline database named "Adventure".
- Properties:
  - Name: title
  - Status: select (Not started, In progress, Completed)
  - Tags: multi_select
  - Quests: relation → link to the "Quests" database

Share With Integration
- For each database (Quests, Time Tracking, Adventure), open the database → Share → Invite your integration → Allow access.

Verify in App
- On Home, click "Refresh databases" to load the latest list.
- On /embed, select Task Database and Session Database.
- Run a session; entries should be created in Time Tracking with links to quests.

Troubleshooting
- If databases do not appear, re-check Share permissions for the integration.
- If writes fail, confirm property types match the names above and that Time Tracking → Quests relation points to the Quests database.

Notes
- Matching property names avoids edge cases; the app uses heuristics for status/select and date fields if names differ.