import structlog
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer
from config import settings

log = structlog.get_logger()

COLLECTION_NAME = "re_market_docs"
VECTOR_SIZE = 384  # all-MiniLM-L6-v2 size

class QdrantManager:
    def __init__(self):
        self.client = AsyncQdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY
        )
        self.encoder = SentenceTransformer("all-MiniLM-L6-v2")
        
    async def ensure_collection(self):
        try:
            collections = await self.client.get_collections()
            if not any(c.name == COLLECTION_NAME for c in collections.collections):
                await self.client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
                )
                log.info("qdrant_collection_created", collection=COLLECTION_NAME)
        except Exception as e:
            log.error("qdrant_init_failed", error=str(e))
            
    async def upsert_documents(self, docs: list[dict]):
        # docs format: [{'id': '123', 'text': 'content', 'metadata': {}}]
        if not docs:
            return
            
        texts = [d["text"] for d in docs]
        vectors = self.encoder.encode(texts)
        
        points = [
            PointStruct(
                id=d["id"],
                vector=vectors[i].tolist(),
                payload={"text": d["text"], **d.get("metadata", {})}
            )
            for i, d in enumerate(docs)
        ]
        
        try:
            await self.client.upsert(
                collection_name=COLLECTION_NAME,
                points=points
            )
            log.info("qdrant_upsert_success", count=len(points))
        except Exception as e:
            log.error("qdrant_upsert_failed", error=str(e))
            
    async def search_documents(self, query: str, limit: int = 5):
        vector = self.encoder.encode([query])[0].tolist()
        try:
            results = await self.client.search(
                collection_name=COLLECTION_NAME,
                query_vector=vector,
                limit=limit
            )
            return results
        except Exception as e:
            log.error("qdrant_search_failed", error=str(e))
            return []
            
    async def refresh_rag_index(self):
        # Placeholder for background job to sync new reports/pdfs into Qdrant
        pass
