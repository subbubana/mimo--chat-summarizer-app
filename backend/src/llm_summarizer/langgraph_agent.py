# LangGraph agent definition and logic
# backend/src/llm_summarizer/langgraph_agent.py
from typing import TypedDict, List, Dict, Optional
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
import os

# Local imports
from backend.src.llm_summarizer.prompt_templates import SUMMARIZATION_PROMPT, format_chat_description, format_messages_transcript

# --- 1. Define Graph State ---
# This state will be passed between nodes in our graph.
class AgentState(TypedDict):
    chat_name: str
    chat_description: Optional[str]
    messages_raw: List[Dict[str, str]] # Raw messages from Firestore (sender_username, content)
    summary: Optional[str] # The generated summary

# --- 2. Initialize LLM ---
# Ensure GEMINI_API_KEY is set in your backend/.env
if os.getenv("GEMINI_API_KEY") is None:
    raise ValueError("GEMINI_API_KEY environment variable not set.")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash", # You can specify gemini-1.5-pro or gemini-pro
    temperature=0.7,
    google_api_key=os.getenv("GEMINI_API_KEY")
)

# --- 3. Define the Summarization Node (Chatbot) ---
def summarize_node(state: AgentState) -> Dict:
    """
    Node responsible for calling the LLM to generate a summary.
    """
    print("DEBUG_LANGGRAPH: Executing summarize_node...")
    chat_name = state["chat_name"]
    chat_description = state["chat_description"]
    messages_raw = state["messages_raw"]

    # Format prompt inputs
    chat_description_section = format_chat_description(chat_description)
    messages_transcript = format_messages_transcript(messages_raw)

    # Create the prompt template for the LLM
    prompt = ChatPromptTemplate.from_messages(
        [
            ("human", SUMMARIZATION_PROMPT),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ]
    )

    # Bind the LLM with the prompt and invoke
    # We need to render the prompt template with our specific values
    formatted_prompt = prompt.invoke({
        "chat_name": chat_name,
        "chat_description_section": chat_description_section,
        "messages_transcript": messages_transcript,
        "agent_scratchpad": [] # No scratchpad for this simple linear flow
    })

    try:
        # Call the LLM with the formatted prompt
        ai_response = llm.invoke(formatted_prompt.to_messages())
        summary_content = ai_response.content
        print(f"DEBUG_LANGGRAPH: Summary generated: {summary_content[:100]}...") # Print first 100 chars
    except Exception as e:
        print(f"ERROR_LANGGRAPH: LLM invocation failed: {e}")
        summary_content = f"Error generating summary: {e}"

    return {"summary": summary_content}


# --- 4. Build the LangGraph Workflow ---
def build_summary_graph():
    workflow = StateGraph(AgentState)

    # Add nodes
    workflow.add_node("summarize_node", summarize_node)

    # Set entry point
    workflow.set_entry_point("summarize_node")

    # Set exit point
    workflow.add_edge("summarize_node", END)

    # Compile the graph
    app = workflow.compile()
    print("DEBUG_LANGGRAPH: LangGraph summarization workflow compiled.")
    return app

# Create a single instance of the graph to be reused
summary_graph_app = build_summary_graph()