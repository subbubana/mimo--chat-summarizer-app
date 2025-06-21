# Chat Summarizer Application - Backend

This repository contains the backend API for a chat summarizer application. It handles user authentication, chat management, real-time messaging, and leverages Large Language Models (LLMs) to summarize chat conversations.

---

## 🚀 Features

The backend provides a set of RESTful APIs to manage:

* **User Authentication & Profiles:**
    * User signup and login powered by Firebase Authentication.
    * User profiles stored in a PostgreSQL database (linked via Firebase UID).
* **Chat Management:**
    * Create new chats with unique IDs and names.
    * Chats can be scheduled with optional start times and mandatory end times.
    * Initial chat status (e.g., 'active', 'scheduled') determined at creation.
    * Add and remove participants from a chat (creator-only access).
    * Retrieve chats a user is a participant of.
* **Real-time Messaging:**
    * Send and receive chat messages within specific chat rooms (stored in Google Firestore).
* **LLM Summarization:**
    * Generate concise summaries of chat conversations using Google Gemini (via LangChain/LangGraph).
    * Summarizes the latest N messages from a chat.

---

## 🛠️ Technologies Used

* **Python 3.10+** (or 3.13 as per your environment)
* **FastAPI:** High-performance web framework for building APIs.
* **PostgreSQL:** Relational database for storing structured data (Users, Chats, Participants).
* **SQLAlchemy:** Python SQL Toolkit and Object Relational Mapper (ORM) for database interactions.
* **Firebase Authentication:** For secure user authentication.
* **Google Firestore:** NoSQL document database for real-time chat messages.
* **Google Gemini API:** The Large Language Model used for summarization.
* **LangChain / LangGraph:** Frameworks for building LLM-powered applications and orchestrating the summarization workflow.
* **python-dotenv:** For managing environment variables.

---

## 📦 Getting Started

Follow these steps to get the backend up and running on your local machine.

### Prerequisites

* **Python 3.10+** installed.
* **pip** (Python package installer).
* **Git** installed.
* **PostgreSQL** server installed and running locally.
* Access to a **Firebase Project**:
    * Authentication enabled (Email/Password provider).
    * Firestore Database initialized.
    * **Firebase Admin SDK Service Account Key**: A JSON key file downloaded from Firebase Console (Project settings -> Service accounts -> Generate new private key). Place this file in the project's root `config/` directory (e.g., `chat_summarizer_app/config/firebase-admin-sdk-key.json`). **Keep this file secure and out of version control (`.gitignore` should handle this).**
* Access to **Google Gemini API**:
    * An API key obtained from Google AI Studio.

### Setup Steps

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/your-organization/chat-summarizer-app.git](https://github.com/your-organization/chat-summarizer-app.git)
    cd chat-summarizer-app
    ```
    *(Replace `https://github.com/your-organization/chat-summarizer-app.git` with your actual repository URL)*

2.  **Create and Activate a Python Virtual Environment:**
    ```bash
    cd backend
    python -m venv .venv
    .\.venv\Scripts\activate   # On Windows
    # source .venv/bin/activate # On macOS/Linux
    ```

3.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configure Environment Variables:**
    * Create a file named `.env` in the `backend/` directory (`chat-summarizer-app/backend/.env`).
    * Add your database connection string and Gemini API key:
        ```
        # backend/.env
        SQL_DATABASE_URL="postgresql+psycopg2://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/chat_summarizer_db"
        GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
        ```
        **Replace `YOUR_POSTGRES_PASSWORD` and `YOUR_GEMINI_API_KEY_HERE` with your actual credentials.**

5.  **Set up PostgreSQL Database:**
    * Open your PostgreSQL command-line client (`psql -U postgres`).
    * Create the database for the application:
        ```sql
        CREATE DATABASE chat_summarizer_db;
        \q
        ```
    * **Ensure tables are created:** Navigate to the project root (`chat-summarizer-app/`) and run the SQLAlchemy table creation script.
        ```bash
        cd .. # If you're in backend directory from step 2
        python -m backend.src.db.sql_client
        ```
        You should see "All SQL tables created successfully!"

6.  **Run the Backend Server:**
    * Ensure you are in the project root (`chat-summarizer-app/`).
    * Start the FastAPI development server:
        ```bash
        uvicorn backend.src.app.main:app --reload
        ```
    * The server will run on `http://127.0.0.1:8000`.

### API Documentation (Swagger UI)

Once the server is running, you can access the interactive API documentation (Swagger UI) at:
`http://localhost:8000/docs`

This interface allows you to test all available endpoints directly.

---

## 💡 Key Endpoints

* **Authentication:**
    * `POST /auth/signup`: Register a new user.
    * `POST /auth/login`: (Placeholder, handled by frontend Firebase SDK client).
    * `GET /auth/protected-route`: Test token verification.
* **Chat Management:**
    * `POST /chats/`: Create a new chat.
    * `GET /chats/my`: Get chats the current user is a participant of.
    * `POST /chats/{chat_id}/participants`: Add a participant to a chat (creator only).
    * `DELETE /chats/{chat_id}/participants/{user_uid}`: Remove a participant (creator only).
* **Messaging:**
    * `POST /chats/{chat_id}/messages/`: Send a message to a chat.
    * `GET /chats/{chat_id}/messages/`: Retrieve messages for a chat.
* **Summarization:**
    * `GET /chats/{chat_id}/summary/`: Get a summary of the latest messages in a chat.

---

## ⚠️ Troubleshooting

* **`ModuleNotFoundError: No module named 'backend'` or similar:**
    * Ensure you are running commands like `uvicorn backend.src.app.main:app --reload` and `python -m backend.src.db.sql_client` from the **project root (`chat-summarizer-app/`)**, not inside the `backend/` subdirectory.
* **`NameError: name 'Optional' is not defined` / `firestore.Query` / `WriteResult` errors:**
    * Ensure all necessary imports are at the top of their respective files (`from typing import Optional, List, Dict`, `from firebase_admin import firestore`).
    * For Firestore writes/reads, confirm `await` is removed from synchronous client calls (e.g., `message_doc_ref.set(message_data_dict)` and `for doc in messages_query.stream()`).
* **`ValueError: invalid literal for int() with base 10: 'port'` or database connection issues:**
    * Verify your `SQL_DATABASE_URL` in `backend/.env` is exact (correct password, port, database name).
    * Ensure your PostgreSQL server is running.
    * Ensure the database `chat_summarizer_db` exists.
* **Tables not created in PostgreSQL (`users`, `chats`, `chat_participants` are missing):**
    * Confirm `python -m backend.src.db.sql_client` was run successfully from the project root.
    * Verify `backend/src/db/base.py` exists and `Base` is imported from it correctly in your models and `sql_client.py`.
    * Ensure `import backend.src.app.models.user_models` and `import backend.src.app.models.chat_models` are at the top level of `backend/src/db/sql_client.py` (after `Base` is defined).
* **`403 Forbidden` / `401 Unauthorized` errors:**
    * Make sure you are providing a valid Firebase ID token in the `token` query parameter or `Authorization: Bearer` header.
    * Check Firestore Security Rules if you're blocked from accessing Firestore collections.
    * Ensure you are the chat creator for participant management actions.

---

## 🤝 Contribution

Contributions are welcome! If you find bugs or want to add features, please open an issue or submit a pull request.

---
