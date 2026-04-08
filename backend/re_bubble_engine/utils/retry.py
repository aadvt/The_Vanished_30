import functools
from tenacity import retry, wait_exponential, stop_after_attempt, before_sleep_log
from utils.logger import log

def async_retry(max_attempts: int = 3):
    def decorator(func):
        @retry(
            wait=wait_exponential(multiplier=1, min=1, max=30),
            stop=stop_after_attempt(max_attempts),
            before_sleep=lambda retry_state: log.info(
                "retrying",
                attempt=retry_state.attempt_number,
                error=str(retry_state.outcome.exception())
            ),
            reraise=True
        )
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            return await func(*args, **kwargs)
        return wrapper
    return decorator
