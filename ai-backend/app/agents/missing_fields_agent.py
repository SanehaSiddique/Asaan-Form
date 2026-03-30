from app.schemas.state import AgentState

def missing_fields_agent(state: AgentState) -> AgentState:
    """
    Iterates through the validated mapping output and extracts keys that are missing (null)
    but might be required for the form, preparing them for the chatbot.
    """
    form_result = state.get("form_result", {})
    mapping_data = form_result.get("mapping", [])
    
    missing_keys = []
    
    try:
        print("  🔍 Identifying missing fields...")
        for field in mapping_data:
            val = field.get("value")
            # Ignore fields that are checkboxes or explicitly have correct formats, 
            # basically any field where value is None or empty
            if val is None or val == "" or str(val).lower() == "null":
                missing_keys.append({
                    "field_key": field.get("field_key") or field.get("field", "Unknown"),
                    "field_name": field.get("field_name", "Unknown Label"),
                    "field_type": field.get("field_type", "text_input")
                })

        print(f"    ✓ Found {len(missing_keys)} missing fields requiring user input.")
        return {
            "missing_keys": missing_keys,
            "error": None
        }
    except Exception as e:
        print(f"  ❌ Missing fields identification failed: {e}")
        return {"error": f"Missing fields identification error: {str(e)}", "missing_keys": []}
