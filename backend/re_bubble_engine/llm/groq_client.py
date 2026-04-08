import asyncio
from concurrent.futures import ThreadPoolExecutor
import structlog
from groq import Groq
from llm.base import LLMRateLimitError
from config import settings

log = structlog.get_logger()
executor = ThreadPoolExecutor(max_workers=4)

class GroqClient:
    def __init__(self):
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.model = "llama-3.3-70b-versatile"

    def _sync_complete(self, system_prompt: str, user_prompt: str, response_as_json: bool) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        response_format = {"type": "json_object"} if response_as_json else None

        try:
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                response_format=response_format
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            if "RateLimitError" in str(e.__class__.__name__) or "429" in str(e):
                log.warning("groq_rate_limit", error=str(e))
                raise LLMRateLimitError(str(e))
            log.error("groq_error", error=str(e))
            raise

    async def complete(self, system_prompt: str, user_prompt: str, response_as_json: bool = False) -> str:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(executor, self._sync_complete, system_prompt, user_prompt, response_as_json)
