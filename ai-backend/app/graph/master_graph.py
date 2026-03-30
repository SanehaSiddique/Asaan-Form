from langgraph.graph import StateGraph, END
from app.schemas.state import AgentState

from app.agents.intent_agent import intent_agent
from app.agents.english_ocr_agent import english_ocr_agent
from app.agents.urdu_ocr_agent import urdu_ocr_agent
from app.agents.document_extraction_agent import document_extraction_agent
from app.agents.prepare_document_agent import prepare_document_agent
from app.agents.form_agent import form_agent
from app.agents.mapping_agent import mapping_agent
from app.agents.validator_agent import validator_agent
from app.agents.missing_fields_agent import missing_fields_agent
from app.agents.chatbot_agent import chatbot_agent

def route_intent(state: AgentState):
    if state.get("error"):
        return END
        
    intent = state.get("intent")
    if intent == "document":
        return "prepare_document"
    elif intent == "form":
        return "form_agent"
    elif intent == "fill":
        return "mapping_agent"
    elif intent == "chat":
        return "chatbot_agent"
    return END

def route_validation(state: AgentState):
    if state.get("error"):
        return END
        
    feedback = state.get("validation_feedback", "")
    retry_count = state.get("retry_count", 0)
    
    if "VALID" in feedback.upper():
        return "missing_fields_agent"
    
    if retry_count < 3:
        print(f"  🔄 Validation failed (Attempt {retry_count + 1}/4). Retrying mapping...")
        return "mapping_agent"
    
    print(f"  ⚠️ Validation failed after 3 retries. Proceeding to Human-in-the-loop.")
    return "missing_fields_agent"

def build_graph():
    graph = StateGraph(AgentState)

    # Nodes
    graph.add_node("intent_agent", intent_agent)
    
    # Document Flow
    graph.add_node("prepare_document", prepare_document_agent)
    graph.add_node("english_ocr", english_ocr_agent)
    graph.add_node("urdu_ocr", urdu_ocr_agent)
    graph.add_node("document_extraction", document_extraction_agent)
    
    # Form Flow
    graph.add_node("form_agent", form_agent)
    
    # Form Filling Flow
    graph.add_node("mapping_agent", mapping_agent)
    graph.add_node("validator_agent", validator_agent)
    graph.add_node("missing_fields_agent", missing_fields_agent)
    
    # Chat Flow
    graph.add_node("chatbot_agent", chatbot_agent)

    # Entry
    graph.set_entry_point("intent_agent")

    # Routing from Intent
    graph.add_conditional_edges(
        "intent_agent",
        route_intent,
        {
            "prepare_document": "prepare_document",
            "form_agent": "form_agent",
            "mapping_agent": "mapping_agent",
            "chatbot_agent": "chatbot_agent",
            END: END
        }
    )

    # Document Flow Edges (Sequential to avoid resource conflicts between OCR engines)
    graph.add_edge("prepare_document", "english_ocr")
    graph.add_edge("english_ocr", "urdu_ocr")
    graph.add_edge("urdu_ocr", "document_extraction")
    graph.add_edge("document_extraction", END)

    # Form Flow Edges
    graph.add_edge("form_agent", END)

    # Form Filling (Mapping loops through validator)
    graph.add_edge("mapping_agent", "validator_agent")
    graph.add_conditional_edges(
        "validator_agent",
        route_validation,
        {
            "missing_fields_agent": "missing_fields_agent",
            "mapping_agent": "mapping_agent",
            END: END
        }
    )
    # After identifying missing fields, prompt user via chatbot
    graph.add_edge("missing_fields_agent", "chatbot_agent")

    # Chat Flow Edges
    graph.add_edge("chatbot_agent", END)

    return graph.compile()

master_graph = build_graph()
