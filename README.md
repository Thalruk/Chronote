# Chronote

A full-stack, time-based Kanban note-taking application designed for seamless task management and organization.

🔗 **[Live Demo: thalruk-chronote.vercel.app](https://thalruk-chronote.vercel.app/)**

## Key Features

* **Interactive Kanban Board:** Intuitive drag-and-drop task management built with Angular CDK.
* **Authentication:** Secure JWT-based authentication integrated with Google OAuth2.
* **Guest Mode:** A fully functional, isolated sandbox using `localStorage` for users to test the application without creating an account (bypasses backend requests seamlessly).
* **Internationalization (i18n):** Dynamic language switching (English / Polish) without page reloads.
* **Archive System:** Soft-delete functionality to clear up the main board, with a dedicated grid view for restoring or permanently deleting tasks.
* **UI/UX:** Responsive design with built-in Dark/Light theme toggling.

## Tech Stack

**Frontend:**
* Angular (Standalone Components, Signals, RxJS)
* Tailwind CSS
* Angular CDK (Drag & Drop)
* `@ngx-translate` for i18n
* `@abacritt/angularx-social-login`

**Backend:**
* C# / .NET 8 Web API
* Entity Framework Core
* JWT Authentication

**Database:**
* PostgreSQL (hosted on Supabase)
