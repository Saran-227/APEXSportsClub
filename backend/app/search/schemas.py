"""Pydantic schemas for Unified Global Search system."""
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

SearchCategory = Literal[
    "all",
    "members",
    "employees",
    "bookings",
    "inventory",
    "shop",
    "cafeteria",
    "finance",
]


class SearchResultItem(BaseModel):
    """Individual entity search result payload."""

    id: str = Field(..., description="Unique entity identifier (UUID or serial)")
    entity_type: str = Field(..., description="Target business entity domain")
    title: str = Field(..., description="Primary headline display text")
    subtitle: str = Field(..., description="Secondary contextual descriptor text")
    badge: Optional[str] = Field(None, description="Status or category pill badge label")
    badge_type: Optional[str] = Field("neutral", description="Badge visual style variant")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Structured contextual attributes")
    navigation_url: str = Field(..., description="Frontend routing link")
    relevance_score: float = Field(..., description="Computed relevance rank between 0.0 and 1.0")

    model_config = ConfigDict(from_attributes=True)


class GlobalSearchResponse(BaseModel):
    """Unified search response covering all accessible business domains."""

    query: str = Field(..., description="Sanitized query string submitted")
    category: str = Field(..., description="Category filter applied ('all' or specific domain)")
    total: int = Field(..., description="Total accessible matches count")
    limit: int = Field(..., description="Pagination limit")
    offset: int = Field(..., description="Pagination offset")
    has_more: bool = Field(..., description="Whether additional pages exist")
    execution_time_ms: float = Field(..., description="Database query & ranking latency in milliseconds")
    categories_breakdown: Dict[str, int] = Field(
        default_factory=dict,
        description="Match count per searchable category",
    )
    results: List[SearchResultItem] = Field(
        default_factory=list,
        description="Relevance-ranked search results",
    )

    model_config = ConfigDict(from_attributes=True)
