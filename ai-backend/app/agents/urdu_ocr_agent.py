import httpx
from app.schemas.state import AgentState

async def urdu_ocr_agent(state: AgentState) -> AgentState:
    files = state.get("files", [])
    if not files:
        # Return an empty dict if no changes are made
        return {} 

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                "http://localhost:8001/ocr/urdu",
                json={"file_path": str(files[0])}
            )
            r.raise_for_status()
            data = r.json()
            return {
                "urdu_text": data.get("text", ""),
                "error": None
            }
    except Exception as e:
        print(f"  ❌ Urdu OCR failed: {e}")
        return {
            "error": f"Urdu OCR error: {str(e)}",
            "urdu_text": ""
        }