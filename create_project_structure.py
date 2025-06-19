import os

def create_dirs_and_files(base_path):
    structure = {
        "backend": {
            "src": {
                "app": {
                    "__init__.py": "",
                    "main.py": "# Backend main application and API routes\nfrom fastapi import FastAPI\n\napp = FastAPI()\n\n@app.get(\"/\")\nasync def read_root():\n    return {\"message\": \"Chat Summarizer Backend is running!\"}\n",
                    "auth": {
                        "__init__.py": "",
                        "firebase_auth.py": "# Firebase authentication logic"
                    },
                    "chats": {
                        "__init__.py": "",
                        "chat_routes.py": "# Chat creation, management, participant handling routes"
                    },
                    "messages": {
                        "__init__.py": "",
                        "message_routes.py": "# Message handling, real-time updates routes"
                    },
                    "models": {
                        "__init__.py": "",
                        "chat_models.py": "# Pydantic/SQLAlchemy models for chat data",
                        "user_models.py": "# Pydantic/SQLAlchemy models for user data"
                    }
                },
                "db": {
                    "__init__.py": "",
                    "firestore_client.py": "# Firestore specific operations",
                    "sql_client.py": "# SQL database connection & ORM setup",
                    "migrations": {
                        "__init__.py": "" # Placeholder for future migration scripts
                    }
                },
                "services": {
                    "__init__.py": "",
                    "chat_service.py": "# Logic for chat creation, participant management",
                    "message_service.py": "# Logic for message storage, buffer management",
                    "report_service.py": "# Logic for PDF generation and sending"
                },
                "llm_summarizer": {
                    "__init__.py": "",
                    "summarizer.py": "# Main entry point for summarization requests",
                    "langgraph_agent.py": "# LangGraph agent definition and logic",
                    "prompt_templates.py": "# Store all our LLM prompt definitions",
                    "utils.py": "# Utility functions specific to summarization"
                }
            },
            "config": {
                "settings.py": "# Environment variables, API keys (e.g., Firebase, Gemini)\n\nFIREBASE_CREDENTIALS_PATH = \"path/to/your/firebase-admin-sdk.json\"\nGEMINI_API_KEY = os.getenv(\"GEMINI_API_KEY\")\n"
            },
            ".env.example": "GEMINI_API_KEY=YOUR_GEMINI_API_KEY\n# Add other environment variables here (e.g., database URLs)",
            "requirements.txt": "fastapi\nuvicorn\npydantic\nfirebase-admin\ngoogle-cloud-firestore\nSQLAlchemy\npsycopg2-binary # Example for PostgreSQL\nlangchain\nlangchain-community\nlangchain-google-genai\nlanggraph\npython-dotenv\nreportlab # For PDF generation\n",
            "Dockerfile": "# Basic Dockerfile for backend\nFROM python:3.10-slim\nWORKDIR /app\nCOPY ./requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY ./src /app/src\nCOPY ./config /app/config\nCMD [\"uvicorn\", \"src.app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]"
        },
        "frontend": {
            "public": {
                "index.html": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n    <meta charset=\"UTF-8\">\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n    <title>Chat Summarizer</title>\n</head>\n<body>\n    <div id=\"root\"></div>\n    <script src=\"../src/index.js\"></script>\n</body>\n</html>",
                "favicon.ico": "" # Placeholder
            },
            "src": {
                "App.js": "import React from 'react';\n\nfunction App() {\n  return (\n    <div className=\"App\">\n      <h1>Welcome to Chat Summarizer!</h1>\n    </div>\n  );\n}\n\nexport default App;\n",
                "components": {
                    "ChatMessage.js": "// Chat message component",
                    "ChatWindow.js": "// Main chat display window",
                    "MessageInput.js": "// Input field for sending messages",
                    "AuthForms.js": "// Login/Signup forms"
                },
                "pages": {
                    "LoginPage.js": "// Login page component",
                    "DashboardPage.js": "// User dashboard/previous chats page",
                    "ChatRoomPage.js": "// Specific chat room page"
                },
                "services": {
                    "api.js": "// Frontend API calls to backend",
                    "firebase_client.js": "// Frontend Firebase SDK setup"
                },
                "contexts": {
                    "AuthContext.js": "// React Context for authentication state"
                },
                "hooks": {
                    "useChat.js": "// Custom hook for chat logic"
                },
                "styles": {
                    "index.css": "/* Global styles */",
                    "variables.css": "/* CSS variables */"
                },
                "index.js": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './styles/index.css';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n"
            },
            "package.json": "{\n  \"name\": \"frontend\",\n  \"version\": \"0.1.0\",\n  \"private\": true,\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\",\n    \"react-scripts\": \"5.0.1\",\n    \"axios\": \"^1.6.8\",\n    \"firebase\": \"^10.12.2\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\",\n    \"test\": \"react-scripts test\",\n    \"eject\": \"react-scripts eject\"\n  },\n  \"eslintConfig\": {\n    \"extends\": [\"react-app\", \"react-app/jest\"]\n  },\n  \"browserslist\": {\n    \"production\": [\n      \">0.2%\",\n      \"not dead\",\n      \"not op_mini all\"\n    ],\n    \"development\": [\n      \"last 1 chrome version\",\n      \"last 1 firefox version\",\n      \"last 1 safari version\"\n    ]\n  }\n}\n",
            ".env.example": "REACT_APP_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY\n# Add other frontend env variables here"
        },
        "common": {
            "constants.py": "# Common constants shared between backend and potentially frontend (if using Transpiler)",
            "utils.py": "# Common utility functions",
            "data_models.py": "# Common data models (e.g., Message structure if shared)"
        },
        "config": {
            "firebase_admin_sdk_key.json": "{}" # Placeholder - IMPORTANT: Content will be sensitive, KEEP OUT OF GIT OR MANAGE SECURELY
        },
        ".gitignore": "", # Already exists and managed by user, but included for completeness
        "README.md": "", # Already exists
        "docker-compose.yml": "# Example docker-compose.yml for running both services\nversion: '3.8'\nservices:\n  backend:\n    build: ./backend\n    ports:\n      - \"8000:8000\"\n    env_file:\n      - ./backend/.env\n    volumes:\n      - ./backend/src:/app/src # Mount source for development\n  frontend:\n    build: ./frontend\n    ports:\n      - \"3000:3000\"\n    environment:\n      - CHOKIDAR_USEPOLLING=true # For Hot Reloading in Docker\n    env_file:\n      - ./frontend/.env\n    volumes:\n      - ./frontend/src:/app/src # Mount source for development\n"
    }

    def create_structure(current_path, current_structure):
        for name, content in current_structure.items():
            path = os.path.join(current_path, name)
            if isinstance(content, dict):
                os.makedirs(path, exist_ok=True)
                print(f"Created directory: {path}")
                create_structure(path, content)
            else:
                if not os.path.exists(path):
                    with open(path, 'w') as f:
                        f.write(content)
                    print(f"Created file: {path}")
                else:
                    print(f"File already exists (skipped): {path}")

    create_structure(base_path, structure)
    print("\nProject structure created successfully!")

if __name__ == "__main__":
    # Get the directory where the script is run
    script_dir = os.path.dirname(os.path.abspath(__file__))
    create_dirs_and_files(script_dir)