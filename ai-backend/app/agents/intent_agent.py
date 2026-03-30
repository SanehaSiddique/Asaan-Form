from app.schemas.state import AgentState
from app.utils.llm import get_llm

llm = get_llm()

def intent_agent(state: AgentState) -> AgentState:
    current_intent = state.get("intent")
    user_input = state.get("user_input", "")

    # If intent is already set (e.g. programmatically from an API)
    # and there's no meaningful user input to override it, keep it.
    if current_intent and current_intent != "chat" and not user_input:
        return {"intent": current_intent}

    if not user_input:
        # Fallback for empty input if no intent was pre-set
        return {"intent": current_intent or "chat"}

    prompt = (
        "You are an intent classification agent.\n\n"
        "Classify the user's intent into ONLY one of the following values:\n"
        "- chat\n"
        "- document\n"
        "- form\n\n"
        "User input:\n"
        f"{user_input}\n\n"
        "Return ONLY the intent value."
    )

    try:
        response = llm.invoke(prompt)
        intent = response.content.strip().lower()

        # safety fallback
        if intent not in {"chat", "document", "form", "fill"}:
            intent = current_intent or "chat"

        return {
            "intent": intent,
            "retry_count": 0,
            "error": None
        }
    except Exception as e:
        print(f"  ❌ Intent classification failed: {e}")
        return {"intent": current_intent or "chat", "retry_count": 0, "error": f"Intent error: {str(e)}"}