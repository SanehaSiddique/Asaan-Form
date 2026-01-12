import json
from app.schemas.state import AgentState
from app.utils.llm import get_llm

llm = get_llm()

def bilingual_merge_agent(state: AgentState) -> AgentState:
    english = state.get("english_text", "")
    urdu = state.get("urdu_text", "")

    prompt = f"""
You are a bilingual document understanding agent.

You are given OCR outputs from the SAME document.

Rules:
- Keys must be in English
- Merge information from BOTH OCRs
- Translate Urdu values to English
- Prefer clearer values
- Use null if missing

English OCR:
{english}

Urdu OCR:
{urdu}

Return ONLY valid JSON.
"""

    response = llm.invoke(prompt).content

    try:
        merged = json.loads(response)
    except Exception:
        merged = {"error": "Invalid JSON", "raw": response}

    return {
        **state,
        "merged_json": merged
    }
