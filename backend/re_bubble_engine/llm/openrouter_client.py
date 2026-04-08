from openai import AsyncOpenAI
import structlog
from llm.base import LLMRateLimitError
from config import settings

log = structlog.get_logger()

class OpenRouterClient:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.OPENROUTER_API_KEY,
        )
        self.model = "meta-llama/llama-3.3-70b-instruct:free"

    async def complete(self, system_prompt: str, user_prompt: str, response_as_json: bool = False) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # openrouter free models rarely support explicit response_format JSON mode natively,
        # but we can append an instruction if response_as_json
        if response_as_json:
            messages[0]["content"] += "\n\nRespond in JSON only."

        try:
            chat_completion = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            if "429" in str(e) or "RateLimitError" in str(e.__class__.__name__):
                log.warning("openrouter_rate_limit", error=str(e))
                raise LLMRateLimitError(str(e))
            log.error("openrouter_error", error=str(e))
            raise
