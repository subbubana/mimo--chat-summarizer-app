# Store all our LLM prompt definitions
# backend/src/llm_summarizer/prompt_templates.py
from typing import Optional, List, Dict
# The prompt for summarization.
# It takes chat_name, chat_description (optional), and messages as input.
# The messages should be formatted as "Username: Message content"

# The prompt for summarization.
SUMMARIZATION_PROMPT = """
You are an AI assistant tasked with summarizing a chat conversation.
The goal is to provide a concise overview, highlight key discussion points,
mention any decisions made, and list action items if present.

Chat Name: {chat_name}
{chat_description_section}

Here is the conversation transcript:
---
{messages_transcript}
---

Please provide a summary that includes:
- A concise overview of the discussion's progression.
- Highlight key turning points or disagreements (if any).
- The main agenda or purpose of the conversation.

**Final decisions made regarding the topic of discussion:**
**- Present these as a concise, bulleted list.**
**- Example: "Decision: Project deadline moved to Friday."**

**Specific action items and responsibilities assigned to individuals:**
**- Present these as a concise, bulleted list.**
**- Each item should start with the person responsible, followed by the task.**
**- Example: "John: Complete report by EOD."**

Summary:
"""

# Helper function to format chat description for the prompt
def format_chat_description(description: Optional[str]) -> str:
    if description:
        return f"Chat Description: {description}\n"
    return ""

# Helper function to format messages for the prompt
def format_messages_transcript(messages: List[Dict[str, str]]) -> str:
    """
    Formats a list of message dictionaries into a readable transcript.
    Each dictionary should have 'sender_username' and 'content'.
    """
    return "\n".join([f"{msg['sender_username']}: {msg['content']}" for msg in messages])