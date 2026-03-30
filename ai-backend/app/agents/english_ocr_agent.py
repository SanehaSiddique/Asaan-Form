import httpx
from app.schemas.state import AgentState

async def english_ocr_agent(state: AgentState) -> AgentState:
    files = state.get("files", [])
    if not files:
        return state

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                "http://localhost:8001/ocr/english",
                json={"file_path": str(files[0])}
            )
            r.raise_for_status()
            data = r.json()
            # The prompt requested state["english_ocr_result"] but original code assigned text to "english_text".
            # I will preserve the original assignment pattern for compatibility but add the new ones too.
            text = data.get("text", "")
            return {
                "english_text": text,
                "english_ocr_result": data.get("result", []),
                "english_ocr_text": text,
                "error": None
            }
    except Exception as e:
        print(f"  ❌ English OCR failed: {e}")
        return {
            "error": f"English OCR error: {str(e)}",
            "english_ocr_result": [],
            "english_ocr_text": "",
            "english_text": ""
        }