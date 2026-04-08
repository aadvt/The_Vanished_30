import asyncio
import time

class AsyncTokenBucket:
    def __init__(self, max_calls: int, period_seconds: int):
        self.max_calls = float(max_calls)
        self.period_seconds = float(period_seconds)
        self.tokens = self.max_calls
        self.last_refill = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            while self.tokens < 1.0:
                self._refill()
                if self.tokens < 1.0:
                    wait_time = (1.0 - self.tokens) * (self.period_seconds / self.max_calls)
                    await asyncio.sleep(wait_time)
            self.tokens -= 1.0

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        refill_amount = elapsed * (self.max_calls / self.period_seconds)
        self.tokens = min(self.max_calls, self.tokens + refill_amount)
        self.last_refill = now
