import json
import structlog
import google.generativeai as genai
from google.generativeai.types import generation_types
from llm.base import LLMRateLimitError
from config import settings

log = structlog.get_logger()

class GeminiClient:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    async def complete(self, system_prompt: str, user_prompt: str, response_as_json: bool = False) -> str:
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        if response_as_json:
            full_prompt += "\n\nRespond in JSON only."
        
        try:
            response = await self.model.generate_content_async(full_prompt)
            log.info("gemini_generation_success", tokens=response.usage_metadata.total_token_count if response.usage_metadata else None)
            return response.text
        except Exception as e:
            # Handle Google API Resource Exhausted / 429
            if "429" in str(e) or "ResourceExhausted" in str(e):
                log.warning("gemini_rate_limit", error=str(e))
                raise LLMRateLimitError(str(e))
            log.error("gemini_error", error=str(e))
            raise
