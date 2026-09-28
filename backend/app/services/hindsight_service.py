from hindsight_client import Hindsight
from ..config import settings

class HindsightService:
    def __init__(self):
        self.client = None
        if settings.hindsight_api_key:
            self.client = Hindsight(
                base_url=settings.hindsight_url,
                api_key=settings.hindsight_api_key,
                timeout=20.0,
            )

    @property
    def available(self):
        return self.client is not None

    def ensure_bank(self):
        if not self.client:
            return
        try:
            self.client.create_bank(
                bank_id=settings.hindsight_bank_id,
                name="ResolveIQ Incident Memory",
            )
        except Exception:
            # Bank may already exist.
            pass

    def retain(self, content: str, document_id: str | None = None):
        if not self.client:
            return False
        self.ensure_bank()
        self.client.retain(
            bank_id=settings.hindsight_bank_id,
            content=content,
            document_id=document_id,
        )
        return True

    def recall(self, query: str):
        if not self.client:
            return []
        self.ensure_bank()
        result = self.client.recall(
            bank_id=settings.hindsight_bank_id,
            query=query,
        )
        return [
            {
                "text": item.text,
                "type": getattr(item, "fact_type", None),
            }
            for item in result.results
        ]

    def stats(self):
        if not self.client:
            return {"available": False, "count": 0}
        self.ensure_bank()
        try:
            memories = self.client.list_memories(bank_id=settings.hindsight_bank_id)
            items = getattr(memories, "items", [])
            return {"available": True, "count": len(items)}
        except Exception:
            return {"available": True, "count": 0}

hindsight = HindsightService()
