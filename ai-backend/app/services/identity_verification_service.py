import asyncio
import json
from typing import List, Dict
from app.utils.llm import get_llm
from app.config import settings
from pathlib import Path

class IdentityVerificationService:
    def __init__(self):
        self.llm = get_llm()

    async def verify_identities(self, user_id: str, document_filenames: List[str]) -> Dict:
        """
        Analyze multiple documents to see if they belong to different people.
        Returns a report with 'has_clash' and the detected identity profiles.
        """
        docs_dir = settings.get_user_documents_dir(user_id)
        
        # Load all documents' data
        tasks = []
        for filename in document_filenames:
            file_path = docs_dir / filename
            extracted_path = docs_dir / f"{file_path.stem}_extracted.json"
            
            if not extracted_path.exists():
                continue
                
            tasks.append(self._process_single_document(extracted_path, filename))

        if not tasks:
            return {"has_clash": False, "profiles": []}

        # Run extraction in parallel
        identity_profiles = await asyncio.gather(*tasks)
        # Filter out None results
        identity_profiles = [p for p in identity_profiles if p]

        if len(identity_profiles) <= 1:
            return {"has_clash": False, "profiles": identity_profiles}

        # Check for clashes
        clash_report = self._check_for_clashes(identity_profiles)
        return clash_report

    async def _process_single_document(self, extracted_path: Path, filename: str) -> Dict:
        try:
            with open(extracted_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            ocr = data.get("ocr", {})
            text_content = (ocr.get("english_text", "") + "\n" + ocr.get("urdu_text", "")).strip()
            
            if not text_content:
                return None

            return await self._extract_identity_profile(text_content, filename)
        except Exception as e:
            print(f"Error processing identity for {filename}: {e}")
            return None

    async def _extract_identity_profile(self, text: str, filename: str) -> Dict:
        prompt = f"""
        Extract the identity profile from the following document text.
        Document: {filename}
        
        TEXT:
        {text[:4000]}
        
        Extract the following fields in JSON format:
        - person_name: Full name of the person this document belongs to (the owner/subject). 
          For certificates, this is the student name. 
          For CNICs, this is the card holder name.
          Be careful not to pick the father's name or a witness name.
        - id_number: CNIC, Passport number, or any unique identifier if present.
        - dob: Date of birth if present.
        - document_type: What kind of document is this (e.g., CNIC, Domicile, Degree).
        
        Rules:
        - If a field is not found, use null.
        - Normalize names to Title Case.
        - Output ONLY the JSON.
        """
        
        try:
            resp = await self.llm.ainvoke(prompt)
            # Clean response for potential markdown
            content = resp.content.strip()
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            profile = json.loads(content)
            profile["filename"] = filename
            return profile
        except Exception as e:
            print(f"LLM Error extracting identity for {filename}: {e}")
            return None

    def _check_for_clashes(self, profiles: List[Dict]) -> Dict:
        """
        Compare names and IDs across profiles.
        """
        if not profiles:
            return {"has_clash": False, "profiles": []}

        # Normalize names for comparison (remove extra spaces, case insensitive)
        def normalize_name(name):
            if not name: return ""
            return "".join(name.lower().split())

        primary_identity = None
        clashes = []
        
        # We consider a clash if there are at least two different names detected
        # that aren't just minor variations.
        identities = {} # normalized_name -> list of profiles
        
        for p in profiles:
            name = p.get("person_name")
            if not name: continue
            
            norm = normalize_name(name)
            if norm not in identities:
                identities[norm] = []
            identities[norm].append(p)

        if len(identities) > 1:
            # Possible clash detected
            return {
                "has_clash": True,
                "identities": [
                    {"name": list(group)[0]["person_name"], "documents": group}
                    for group in identities.values()
                ],
                "message": "Multiple identities detected across uploaded documents."
            }

        return {"has_clash": False, "profiles": profiles}

identity_verification_service = IdentityVerificationService()
