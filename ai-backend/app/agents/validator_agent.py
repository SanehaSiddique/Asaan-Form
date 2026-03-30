from app.schemas.state import AgentState
from app.utils.llm import get_llm
import json

async def validator_agent(state: AgentState) -> AgentState:
    """
    Validates the generated mapping. Checks for obvious hallucinations or mismatched types.
    Sets validation_feedback to 'VALID' or specifically what's wrong so mapping_agent can retry.
    """
    mapping_data = state.get("form_result", {}).get("mapping", [])
    
    if not mapping_data:
        # If there's already a fatal error from mapping_agent, don't just say "No mapping"
        fatal_error = state.get("error")
        if fatal_error:
            return {"validation_feedback": f"FATAL: {fatal_error}", "error": fatal_error}
        return {"validation_feedback": "INVALID: No mapping generated.", "error": "No mapping generated"}
        
    print(f"  🔎 Validator checking map output...")
    
    try:
        # Increment retry count for the next possible iteration
        current_retry = state.get("retry_count", 0)
        
        # Simple prompt to standard LLM to review the mapping
        llm = get_llm()
        prompt = f"""
        You are an AI data validation agent. 
        Review this form mapping where "value" has been extracted for the "field".
        
        CRITERIA:
        1. Names: Should be human names, not emails, dates, or numbers.
        2. Dates: Should look like dates or be null.
        3. Genders: Should be "Male", "Female", or null.
        
        Mapping Data:
        {json.dumps([{ 'field': m.get('field_name', m.get('field_key', 'Unknown')), 'value': m.get('value'), 'type': m.get('field_type') } for m in mapping_data], indent=2)}
        
        RESPONSE FORMAT:
        - If the mapping is correct: Output exactly "VALID"
        - If there are errors: Output exactly "ERROR: [brief reason]"
        
        Do not provide any other text. Just "VALID" or "ERROR: [reason]".
        """
        
        # Use ainvoke
        resp_obj = await llm.ainvoke(prompt)
        response = resp_obj.content.strip()
        
        # Parse the response: if "ERROR" is anywhere, it's an error. 
        # Otherwise, if "VALID" is present, it's valid.
        upper_resp = response.upper()
        if "ERROR" in upper_resp:
            print(f"    ⚠️ Mapping failed validation: {response}")
            return {
                "validation_feedback": response, 
                "retry_count": current_retry + 1,
                "error": None
            }
        
        if "VALID" in upper_resp:
            print("    ✓ Mapping validated successfully.")
            return {
                "validation_feedback": "VALID", 
                "retry_count": current_retry, # Keep it the same if successful
                "error": None
            }
            
        print(f"    ⚠️ Validator gave inconclusive output: {response}")
        return {
            "validation_feedback": f"ERROR: Unclear validation result: {response}", 
            "retry_count": current_retry + 1,
            "error": None
        }
    except Exception as e:
        print(f"  ❌ Validation node error: {e}")
        return {
            "validation_feedback": f"VALIDATION_ERROR: {str(e)}", 
            "retry_count": state.get("retry_count", 0),
            "error": f"Validation error: {str(e)}"
        }
