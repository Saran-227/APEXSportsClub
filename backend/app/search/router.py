"""Global Unified Search API Router."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.auth.dependencies import require_authenticated_user
from backend.app.auth.models import User
from backend.app.core.database import get_db
from backend.app.search.schemas import GlobalSearchResponse, SearchCategory
from backend.app.search.service import GlobalSearchService

router = APIRouter(prefix="/search", tags=["Unified Global Search"])


@router.get(
    "",
    response_model=GlobalSearchResponse,
    summary="Unified Global Search",
    description=(
        "Optimized cross-entity search spanning Members, Employees, Bookings, "
        "Inventory, Shop, Cafeteria, and Finance. Powered by PostgreSQL B-Tree, "
        "GIN full-text search, and pg_trgm fuzzy matching with strict RBAC enforcement."
    ),
)
def global_search(
    q: str = Query(..., min_length=1, max_length=100, description="Search query string"),
    category: SearchCategory = Query("all", description="Business domain filter"),
    limit: int = Query(20, ge=1, le=100, description="Maximum results per page"),
    offset: int = Query(0, ge=0, description="Results offset for pagination"),
    fuzzy: bool = Query(True, description="Enable pg_trgm typo tolerance and fuzzy matching"),
    current_user: User = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> GlobalSearchResponse:
    """Execute unified search across all authorized domains."""
    clean_q = q.strip()
    if not clean_q:
        return GlobalSearchResponse(
            query="",
            category=category,
            total=0,
            limit=limit,
            offset=offset,
            has_more=False,
            execution_time_ms=0.0,
            categories_breakdown={},
            results=[],
        )

    service = GlobalSearchService(db=db, user=current_user)
    return service.search(
        query=clean_q,
        category=category,
        limit=limit,
        offset=offset,
        fuzzy=fuzzy,
    )
