from app.schemas.state import AgentState
from app.utils.llm import get_llm
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
import asyncio
import json

def _build_system_prompt(missing_fields: list, document_context: dict = None, validation_feedback: str = None) -> str:
    base = (
        "You are ASAAN AI, a super sweet, friendly, and helpful form assistant! 🌟\n"
        "Your goal is to make form filling 'Asaan' (easy) for everyone with a smile.\n\n"
        "HOW THIS WEBSITE WORKS (Internal Knowledge):\n"
        "1. Users first 'Upload a Form' (empty template) so the AI can learn its structure.\n"
        "2. Then users 'Upload a Document' (personal info like ID/Certificates) and select that form.\n"
        "3. Our AI automatically maps info from the document onto the form using PaddleOCR and UTRNet.\n"
        "4. In this 'Form Workspace', users can review the results, chat with you, and finally download the filled PDF.\n\n"
        "YOUR PERSONALITY:\n"
        "- Use a sweet, encouraging, and kind tone. Use occasional emojis like ✨, 😊, or 📝.\n"
        "- Be concise but always polite.\n\n"
        "RULES:\n"
        "- If a user provides missing info, acknowledge it warmly.\n"
        "- When answering from document context, explain where you found the info.\n\n"
        "CRITICAL INSTRUCTION — FIELD UPDATES:\n"
        "If a user provides personal info (name, CNIC, etc.) or confirms a value,\n"
        "you MUST act as a data entry clerk and emit a coded update.\n\n"
        "1. Direct Confirmation: Say \"I've updated the [field]!\" neatly.\n"
        "2. Coded Marker: On a NEW LINE by itself, output EXACTLY this format:\n"
        "FIELD_UPDATE: {\"field_key\": \"key_from_list\", \"value\": \"the_value\"}\n\n"
        "RULES:\n"
        "- NEVER say you updated something without the FIELD_UPDATE marker.\n"
        "- If you talk about multiple fields, output one marker line per field.\n"
        "- Use the list in MISSING_FIELDS to find the exact 'key' string.\n"
        "- DO NOT invent keys. If not in the list, do not emit a marker.\n"
        "- DO NOT say \"I think I updated it\" — be certain or ask for clarification.\n\n"
        "MISSING FORM FIELDS (Keys to use in FIELD_UPDATE):\n"
    )

    if validation_feedback and "VALID" not in validation_feedback.upper():
        base += (
            f"\n🚨 CRITICAL: THE AI MAPPING FAILED VALIDATION! 🚨\n"
            f"Reason: \"{validation_feedback}\"\n\n"
            f"YOU MUST MENTION THIS TO THE USER IN YOUR FIRST RESPONSE! 😊\n"
            f"Don't just ask for missing fields; specifically tell them which fields you had trouble with and why (based on the reason above).\n"
            f"Example: \"I've filled most of it, but I'm a bit unsure about your Name because the document was a bit blurry there. Could you please double-check it for me? ✨\"\n"
            f"Be sweet, but make sure they know what to verify! 📝\n"
        )
    else:
        base += "No validation issues detected. You can confidently help the user. ✨\n"

    if document_context:
        # Extremely compact JSON for token savings
        ctx_str = json.dumps(document_context, separators=(',', ':'))
        base += f"\nDOC_CONTEXT:{ctx_str}\n"

    if missing_fields:
        # Compact list of missing fields
        field_list = "|".join(
            f"{f.get('field_name', '?')}(key:{f.get('field_key', '?')})"
            for f in missing_fields
        )
        base += f"\nMISSING_FIELDS:{field_list}\n"
        base += "\nPlease gently ask the user for these missing values if they haven't provided them yet. 😊\n"
    
    return base

def _extract_field_updates(answer: str) -> list:
    """Extract all FIELD_UPDATE blocks from LLM response. Returns list of dicts."""
    marker = "FIELD_UPDATE:"
    updates = []
    lines = answer.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith(marker):
            try:
                json_str = line[len(marker):].strip()
                if json_str.startswith("{"):
                    update = json.loads(json_str)
                    if update.get("field_key") and update.get("value") is not None:
                        updates.append(update)
            except Exception:
                pass
    return updates

async def chatbot_agent(state: AgentState) -> AgentState:
    """
    RAG Chatbot agent that handles missing fields loop and user interactions.
    Replaces /ask from the chatbot API.
    """
    user_input = state.get("user_input", "")
    user_id = state.get("user_id")
    history = state.get("history", [])
    missing_fields = state.get("missing_keys", [])
    document_context = state.get("document_context", {})
    validation_feedback = state.get("validation_feedback")
    
    print(f"  💬 Chatbot Agent: Processing input: \"{user_input[:100]}...\"")
    try:
        system_prompt = _build_system_prompt(missing_fields, document_context, validation_feedback)
        
        messages = [SystemMessage(content=system_prompt)]
        for msg in history[-10:]:
            if isinstance(msg, dict):
                role = msg.get("role")
                content = msg.get("content", "")
                if role == "user":
                    messages.append(HumanMessage(content=content))
                else:
                    messages.append(AIMessage(content=content))

        messages.append(HumanMessage(content=user_input))
        
        # Query LLM using ainvoke
        llm = get_llm()
        resp_obj = await llm.ainvoke(messages)
        response = resp_obj.content
        
        print(f"  🤖 LLM Raw Response:\n---\n{response}\n---")
        
        field_updates = _extract_field_updates(response)  # list, may be empty
        if field_updates:
            print(f"  ✅ Extracted {len(field_updates)} field updates: {field_updates}")
        else:
            print(f"  ⚠️ No FIELD_UPDATE markers found in LLM response.")

        # Clean answer — strip all FIELD_UPDATE lines from visible text
        clean_lines = [
            line for line in response.split('\n')
            if not line.strip().startswith("FIELD_UPDATE:")
        ]
        clean_answer = '\n'.join(clean_lines).strip()

        if not clean_answer.strip():
            # If after removal of FIELD_UPDATE nothing is left, provide a default warm response
            if field_updates:
                clean_answer = f"✨ Great! I've updated the info for you. 😊"
            else:
                clean_answer = "I'm sorry, I couldn't quite understand that. How else can I help you today? ✨"

        return {
            "results": {
                "chatbot": {
                    "answer": clean_answer,
                    "sources": [],
                    "field_update": field_updates[0] if field_updates else None,
                    "field_updates": field_updates  # all updates
                }
            },
            "field_update": field_updates[0] if field_updates else None,
            "field_updates": field_updates
        }
    except Exception as e:
        print(f"  ❌ Chatbot loop failed: {e}")
        return {
            "results": {
               "chatbot": {
                   "answer": "Oh no! I ran into a little trouble processing that. 😓 Could you please try again?",
                   "error": str(e)
               }
            },
            "error": f"Chatbot error: {str(e)}"
        }
