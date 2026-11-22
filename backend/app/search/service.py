"""Unified Global Search Service with PostgreSQL B-Tree, GIN, and pg_trgm optimization.

Enforces strict RBAC and business-unit-level data isolation across 7 club domains:
- Members
- Employees
- Bookings
- Inventory
- Shop
- Cafeteria
- Finance
"""

from datetime import datetime, timezone
import logging
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus
import uuid

from sqlalchemy import and_, func, or_, select, text
from sqlalchemy.orm import Session

from backend.app.auth.models import Role, User, UserRole
from backend.app.auth.service import get_user_roles_and_permissions
from backend.app.bookings.models import Court, CourtBooking
from backend.app.cafeteria.models import Cafeteria, FoodOrder, MenuItem
from backend.app.employees.models import Employee
from backend.app.finance.models import Expense, Invoice, Payment
from backend.app.memberships.models import Member
from backend.app.search.schemas import GlobalSearchResponse, SearchResultItem
from backend.app.shop.models import Product, ShopOrder, Vendor

logger = logging.getLogger("scms.search")


def escape_like(s: str) -> str:
    """Escape LIKE/ILIKE special characters % and _ to prevent unintended wildcard expansions."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


class GlobalSearchService:
    """Orchestrates multi-domain search with PostgreSQL trigram and full-text optimization."""

    def __init__(self, db: Session, user: User):
        self.db = db
        self.user = user
        self.roles, self.permissions = get_user_roles_and_permissions(db, user.id)
        self.is_admin = any(r.upper() == "ADMIN" for r in self.roles)
        self.is_vendor = any(r.upper() == "SPORTS_SHOP_VENDOR" for r in self.roles)
        self.is_cafe_owner = any(r.upper() == "CAFETERIA_OWNER" for r in self.roles)
        self.is_customer = any(r.upper() == "CUSTOMER" for r in self.roles)
        self.is_staff = any(r.upper() in ("ADMIN", "STAFF", "MANAGER") for r in self.roles) or "staff:read" in self.permissions

        # Cache vendor_id and cafeteria_id for data isolation
        self.vendor_id = None
        if self.is_vendor or self.is_admin:
            vendor = db.execute(select(Vendor.id).where(Vendor.user_id == user.id)).scalar_one_or_none()
            self.vendor_id = vendor

        self.cafeteria_id = None
        if self.is_cafe_owner or self.is_admin:
            cafe = db.execute(select(Cafeteria.id).where(Cafeteria.user_id == user.id)).scalar_one_or_none()
            self.cafeteria_id = cafe

        self.is_postgres = db.bind.dialect.name == "postgresql"

    def search(
        self,
        query: str,
        category: str = "all",
        limit: int = 20,
        offset: int = 0,
        fuzzy: bool = True,
    ) -> GlobalSearchResponse:
        """Execute unified search across all authorized domains with ranking and metrics."""
        start_time = time.perf_counter()
        clean_q = query.replace("+", " ").strip()[:150]
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

        all_results: List[SearchResultItem] = []
        breakdown: Dict[str, int] = {
            "members": 0,
            "employees": 0,
            "bookings": 0,
            "inventory": 0,
            "shop": 0,
            "cafeteria": 0,
            "finance": 0,
        }

        # 1. Members search
        if category in ("all", "members"):
            try:
                m_items = self._search_members(clean_q, fuzzy)
                breakdown["members"] = len(m_items)
                all_results.extend(m_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching members: %s", exc)

        # 2. Employees search
        if category in ("all", "employees"):
            try:
                e_items = self._search_employees(clean_q, fuzzy)
                breakdown["employees"] = len(e_items)
                all_results.extend(e_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching employees: %s", exc)

        # 3. Bookings & Courts search
        if category in ("all", "bookings"):
            try:
                b_items = self._search_bookings(clean_q, fuzzy)
                breakdown["bookings"] = len(b_items)
                all_results.extend(b_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching bookings: %s", exc)

        # 4. Inventory search
        if category in ("all", "inventory"):
            try:
                i_items = self._search_inventory(clean_q, fuzzy)
                breakdown["inventory"] = len(i_items)
                all_results.extend(i_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching inventory: %s", exc)

        # 5. Shop search
        if category in ("all", "shop"):
            try:
                s_items = self._search_shop(clean_q, fuzzy)
                breakdown["shop"] = len(s_items)
                all_results.extend(s_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching shop: %s", exc)

        # 6. Cafeteria search
        if category in ("all", "cafeteria"):
            try:
                c_items = self._search_cafeteria(clean_q, fuzzy)
                breakdown["cafeteria"] = len(c_items)
                all_results.extend(c_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching cafeteria: %s", exc)

        # 7. Finance & Invoices search
        if category in ("all", "finance"):
            try:
                f_items = self._search_finance(clean_q, fuzzy)
                breakdown["finance"] = len(f_items)
                all_results.extend(f_items)
            except Exception as exc:
                self.db.rollback()
                logger.error("Error searching finance: %s", exc)

        # Deduplicate results by (entity_type, id) retaining highest relevance score
        deduped: Dict[Tuple[str, str], SearchResultItem] = {}
        for item in all_results:
            key = (item.entity_type, item.id)
            if key not in deduped or item.relevance_score > deduped[key].relevance_score:
                deduped[key] = item

        final_items = list(deduped.values())
        final_items.sort(key=lambda item: item.relevance_score, reverse=True)

        total_count = len(final_items)
        paginated_results = final_items[offset : offset + limit] if offset < total_count else []
        has_more = (offset + limit) < total_count
        elapsed_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        return GlobalSearchResponse(
            query=clean_q,
            category=category,
            total=total_count,
            limit=limit,
            offset=offset,
            has_more=has_more,
            execution_time_ms=elapsed_ms,
            categories_breakdown=breakdown,
            results=paginated_results,
        )

    # -------------------------------------------------------------------------
    # Domain 1: Members
    # -------------------------------------------------------------------------
    def _search_members(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search members table enforcing privacy and role isolation."""
        stmt = (
            select(Member, User)
            .join(User, Member.user_id == User.id)
        )

        if not self.is_admin:
            stmt = stmt.where(Member.user_id == self.user.id)

        patt = f"%{escape_like(q)}%"
        conditions = [
            Member.membership_number.ilike(patt),
            User.email.ilike(patt),
            User.first_name.ilike(patt),
            User.last_name.ilike(patt),
        ]

        if self.is_postgres and fuzzy and len(q) >= 4:
            name_expr = User.first_name + " " + User.last_name
            conditions.extend([
                func.similarity(name_expr, q) > 0.35,
                func.word_similarity(q, name_expr) > 0.45,
                func.similarity(User.email, q) > 0.35,
                func.similarity(Member.membership_number, q) > 0.35,
            ])

        is_exact_mem = or_(Member.membership_number.ilike(q), User.email.ilike(q))
        stmt = stmt.where(or_(*conditions)).order_by(is_exact_mem.desc(), Member.created_at.desc(), Member.id.desc()).limit(30)
        rows = self.db.execute(stmt).all()

        results = []
        q_lower = q.lower()
        for member, u in rows:
            full_name = f"{u.first_name} {u.last_name}".strip()
            score = 0.5
            if q_lower == member.membership_number.lower() or q_lower == u.email.lower() or q_lower == full_name.lower():
                score = 1.0
            elif member.membership_number.lower().startswith(q_lower) or full_name.lower().startswith(q_lower):
                score = 0.95
            elif q_lower in full_name.lower() or q_lower in u.email.lower():
                score = 0.85
            else:
                score = 0.45

            results.append(
                SearchResultItem(
                    id=str(member.id),
                    entity_type="members",
                    title=f"{full_name} ({member.membership_number})",
                    subtitle=f"{u.email} • {u.phone_number or 'No phone'} • Status: {member.status}",
                    badge=member.status,
                    badge_type="success" if member.status == "ACTIVE" else "warning",
                    metadata={
                        "user_id": str(u.id),
                        "email": u.email,
                        "membership_number": member.membership_number,
                        "joined_date": str(member.joined_date) if member.joined_date else None,
                    },
                    navigation_url="/members",
                    relevance_score=score,
                )
            )
        return results

    # -------------------------------------------------------------------------
    # Domain 2: Employees
    # -------------------------------------------------------------------------
    def _search_employees(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search club staff enforcing employee/HR authorization."""
        if not (self.is_admin or self.is_staff):
            return []

        stmt = select(Employee, User).join(User, Employee.user_id == User.id)
        patt = f"%{escape_like(q)}%"
        conditions = [
            User.first_name.ilike(patt),
            User.last_name.ilike(patt),
            User.email.ilike(patt),
            Employee.department.ilike(patt),
            Employee.job_title.ilike(patt),
        ]

        if self.is_postgres and fuzzy and len(q) >= 4:
            name_expr = User.first_name + " " + User.last_name
            job_expr = Employee.job_title + " " + Employee.department
            conditions.extend([
                func.similarity(name_expr, q) > 0.35,
                func.word_similarity(q, name_expr) > 0.45,
                func.similarity(job_expr, q) > 0.35,
                func.word_similarity(q, job_expr) > 0.45,
            ])

        is_exact_emp = or_(User.email.ilike(q), Employee.job_title.ilike(q))
        stmt = stmt.where(or_(*conditions)).order_by(is_exact_emp.desc(), Employee.created_at.desc(), Employee.id.desc()).limit(30)
        rows = self.db.execute(stmt).all()

        results = []
        q_lower = q.lower()
        for emp, u in rows:
            full_name = f"{u.first_name} {u.last_name}".strip()
            score = 0.5
            if q_lower == u.email.lower() or q_lower == full_name.lower():
                score = 1.0
            elif full_name.lower().startswith(q_lower):
                score = 0.95
            elif q_lower in u.email.lower() or q_lower in full_name.lower():
                score = 0.85
            elif q_lower in emp.job_title.lower() or q_lower in emp.department.lower():
                score = 0.75
            else:
                score = 0.40

            results.append(
                SearchResultItem(
                    id=str(emp.id),
                    entity_type="employees",
                    title=f"{full_name} — {emp.job_title}",
                    subtitle=f"{emp.department} • {u.email} • Status: {emp.status}",
                    badge=emp.department,
                    badge_type="info",
                    metadata={
                        "department": emp.department,
                        "job_title": emp.job_title,
                        "status": emp.status,
                        "hire_date": str(emp.hire_date) if emp.hire_date else None,
                    },
                    navigation_url="/employees",
                    relevance_score=score,
                )
            )
        return results

    # -------------------------------------------------------------------------
    # Domain 3: Bookings & Courts
    # -------------------------------------------------------------------------
    def _search_bookings(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search courts catalog and court bookings with privacy boundary."""
        results = []
        q_lower = q.lower()
        patt = f"%{escape_like(q)}%"

        # 3a. Search Courts (Publicly accessible active facilities)
        court_conds = [
            Court.name.ilike(patt),
            Court.sport.ilike(patt),
            Court.surface_type.ilike(patt),
        ]
        if self.is_postgres:
            court_fts_text = Court.name + " " + Court.sport + " " + func.coalesce(Court.surface_type, "") + " " + func.coalesce(Court.description, "")
            court_conds.append(func.to_tsvector("english", court_fts_text).op("@@")(func.plainto_tsquery("english", q)))
            # Only apply trigram similarity if query has at least 4 characters to avoid false matches on short tokens
            if fuzzy and len(q) >= 4:
                court_conds.append(func.similarity(Court.name, q) > 0.40)
                court_conds.append(func.word_similarity(q, Court.name + " " + Court.sport) > 0.45)

        c_stmt = select(Court)
        if not self.is_admin:
            c_stmt = c_stmt.where(Court.is_active.is_(True))
        c_stmt = c_stmt.where(or_(*court_conds)).order_by(Court.created_at.desc(), Court.id.desc()).limit(15)
        for court in self.db.execute(c_stmt).scalars().all():
            cname = court.name.lower()
            csport = court.sport.lower()
            if q_lower == cname or q_lower == csport:
                score = 1.0
            elif cname.startswith(q_lower) or csport.startswith(q_lower):
                score = 0.95
            elif f" {q_lower} " in f" {cname} ":
                score = 0.90
            elif q_lower in cname or q_lower in csport:
                score = 0.85
            else:
                score = 0.35

            results.append(
                SearchResultItem(
                    id=str(court.id),
                    entity_type="bookings",
                    title=f"{court.name} ({court.sport.title()})",
                    subtitle=f"{court.surface_type or 'Standard'} • Rate: ₹{court.hourly_rate}/hr • {'Indoor' if court.is_indoor else 'Outdoor'}",
                    badge=court.sport.upper(),
                    badge_type="success",
                    metadata={"sport": court.sport, "hourly_rate": float(court.hourly_rate), "is_indoor": court.is_indoor},
                    navigation_url="/bookings",
                    relevance_score=score,
                )
            )

        # 3b. Search Court Bookings (Enforce user data isolation)
        b_stmt = (
            select(CourtBooking, Court, User)
            .join(Court, CourtBooking.court_id == Court.id)
            .join(User, CourtBooking.user_id == User.id)
        )

        if not self.is_admin:
            b_stmt = b_stmt.where(CourtBooking.user_id == self.user.id)

        booking_conds = [
            Court.name.ilike(patt),
            Court.sport.ilike(patt),
            CourtBooking.status.ilike(patt),
            User.email.ilike(patt),
            User.first_name.ilike(patt),
        ]
        if self.is_postgres and fuzzy and len(q) >= 4:
            booking_conds.append(func.similarity(Court.name, q) > 0.35)
            booking_conds.append(func.word_similarity(q, Court.name) > 0.45)

        b_stmt = b_stmt.where(or_(*booking_conds)).order_by(CourtBooking.created_at.desc(), CourtBooking.id.desc()).limit(20)
        for booking, court, u in self.db.execute(b_stmt).all():
            score = 0.90 if q_lower == str(booking.booking_date) or q_lower == booking.status.lower() else 0.50
            results.append(
                SearchResultItem(
                    id=str(booking.id),
                    entity_type="bookings",
                    title=f"Booking: {court.name} — {booking.booking_date}",
                    subtitle=f"{booking.start_time.strftime('%H:%M')} - {booking.end_time.strftime('%H:%M')} • Total: ₹{booking.total_amount} • Member: {u.first_name} {u.last_name}",
                    badge=booking.status,
                    badge_type="success" if booking.status == "CONFIRMED" else "warning",
                    metadata={
                        "court_id": str(court.id),
                        "booking_date": str(booking.booking_date),
                        "total_amount": float(booking.total_amount),
                        "status": booking.status,
                    },
                    navigation_url="/bookings",
                    relevance_score=score,
                )
            )

        return results

    # -------------------------------------------------------------------------
    # Domain 4: Inventory
    # -------------------------------------------------------------------------
    def _search_inventory(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search products and rental inventory."""
        patt = f"%{escape_like(q)}%"
        q_lower = q.lower()
        stmt = select(Product)

        if self.is_vendor and self.vendor_id:
            stmt = stmt.where(Product.vendor_id == self.vendor_id)
        elif not self.is_admin:
            stmt = stmt.where(Product.is_active.is_(True))

        conditions = [
            Product.name.ilike(patt),
            Product.sku.ilike(patt),
            Product.category.ilike(patt),
        ]

        if self.is_postgres:
            search_text = Product.name + " " + Product.category + " " + func.coalesce(Product.description, "")
            conditions.append(func.to_tsvector("english", search_text).op("@@")(func.plainto_tsquery("english", q)))
            if fuzzy and len(q) >= 4:
                conditions.append(func.similarity(Product.name, q) > 0.35)
                conditions.append(func.word_similarity(q, Product.name + " " + Product.category) > 0.45)

        stmt = stmt.where(or_(*conditions)).order_by(Product.created_at.desc(), Product.id.desc()).limit(25)
        results = []
        for prod in self.db.execute(stmt).scalars().all():
            pname = prod.name.lower()
            if q_lower == prod.sku.lower() or q_lower == pname:
                score = 1.0
            elif prod.sku.lower().startswith(q_lower) or pname.startswith(q_lower):
                score = 0.95
            elif f" {q_lower} " in f" {pname} ":
                score = 0.90
            elif q_lower in pname:
                score = 0.85
            elif q_lower in prod.category.lower():
                score = 0.75
            else:
                score = 0.40

            reorder_val = getattr(prod, 'low_stock_threshold', 5)
            status_val = "IN_STOCK" if prod.stock_quantity > reorder_val else ("OUT_OF_STOCK" if prod.stock_quantity == 0 else "LOW_STOCK")
            results.append(
                SearchResultItem(
                    id=str(prod.id),
                    entity_type="inventory",
                    title=f"Inventory: {prod.name}",
                    subtitle=f"SKU: {prod.sku} • Stock: {prod.stock_quantity} • Min Threshold: {reorder_val}",
                    badge=status_val,
                    badge_type="success" if status_val == "IN_STOCK" else ("danger" if status_val == "OUT_OF_STOCK" else "warning"),
                    metadata={"stock_quantity": prod.stock_quantity, "low_stock_threshold": reorder_val, "sku": prod.sku},
                    navigation_url="/inventory",
                    relevance_score=score,
                )
            )
        return results

    # -------------------------------------------------------------------------
    # Domain 5: Shop
    # -------------------------------------------------------------------------
    def _search_shop(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search sports shop catalog and vendor facilities."""
        results = []
        q_lower = q.lower()
        patt = f"%{escape_like(q)}%"

        # 5a. Search Vendors / Pro Shop facility
        v_stmt = select(Vendor)
        v_conds = [
            Vendor.business_name.ilike(patt),
            Vendor.vendor_type.ilike(patt),
        ]
        if q_lower in ("shop", "pro shop", "store", "vendor", "retail"):
            v_conds.append(Vendor.vendor_type == "SPORTS_SHOP")

        for v in self.db.execute(v_stmt.where(or_(*v_conds))).scalars().all():
            score = 0.98 if "shop" in v.business_name.lower() or q_lower == "shop" else 0.85
            results.append(
                SearchResultItem(
                    id=str(v.id),
                    entity_type="shop",
                    title=f"Shop: {v.business_name}",
                    subtitle=f"Official Pro Shop Facility • {v.vendor_type} • Status: {v.status}",
                    badge="PRO SHOP",
                    badge_type="success",
                    metadata={"vendor_id": str(v.id), "status": v.status},
                    navigation_url="/customer/shop",
                    relevance_score=score,
                )
            )

        # 5b. Products in shop catalog
        prod_stmt = select(Product)
        if self.is_vendor and self.vendor_id:
            prod_stmt = prod_stmt.where(Product.vendor_id == self.vendor_id)
        elif not self.is_admin:
            prod_stmt = prod_stmt.where(Product.is_active.is_(True))

        p_conds = [
            Product.name.ilike(patt),
            Product.category.ilike(patt),
            Product.sku.ilike(patt),
        ]
        if q_lower == "shop":
            p_conds.append(Product.is_active.is_(True))

        if self.is_postgres:
            p_text = Product.name + " " + Product.category + " " + func.coalesce(Product.description, "")
            p_conds.append(func.to_tsvector("english", p_text).op("@@")(func.plainto_tsquery("english", q)))
            if fuzzy and len(q) >= 4:
                p_conds.append(func.similarity(Product.name, q) > 0.35)
                p_conds.append(func.word_similarity(q, Product.name) > 0.45)

        prod_stmt = prod_stmt.where(or_(*p_conds)).order_by(Product.created_at.desc(), Product.id.desc()).limit(20)
        for prod in self.db.execute(prod_stmt).scalars().all():
            pname = prod.name.lower()
            if q_lower == pname or q_lower == prod.sku.lower():
                score = 1.0
            elif pname.startswith(q_lower):
                score = 0.96
            elif f" {q_lower} " in f" {pname} ":
                score = 0.92
            elif q_lower in pname:
                score = 0.88
            elif q_lower == "shop":
                score = 0.90
            elif q_lower in prod.category.lower():
                score = 0.80
            else:
                score = 0.45

            results.append(
                SearchResultItem(
                    id=str(prod.id),
                    entity_type="shop",
                    title=f"Shop: {prod.name}",
                    subtitle=f"Category: {prod.category.title()} • Price: ₹{prod.price} • SKU: {prod.sku}",
                    badge=f"₹{prod.price}",
                    badge_type="info",
                    metadata={"sku": prod.sku, "price": float(prod.price), "category": prod.category},
                    navigation_url=f"/customer/shop?product={prod.id}&search={quote_plus(prod.name)}",
                    relevance_score=score,
                )
            )

        # 5c. Shop Orders
        ord_stmt = select(ShopOrder)
        if self.is_vendor and self.vendor_id:
            ord_stmt = ord_stmt.where(ShopOrder.vendor_id == self.vendor_id)
        elif not self.is_admin:
            ord_stmt = ord_stmt.where(ShopOrder.user_id == self.user.id)

        o_conds = [
            ShopOrder.order_number.ilike(patt),
            ShopOrder.status.ilike(patt),
        ]
        if self.is_postgres and fuzzy and len(q) >= 4:
            o_conds.append(func.similarity(ShopOrder.order_number, q) > 0.35)

        ord_stmt = ord_stmt.where(or_(*o_conds)).order_by(ShopOrder.created_at.desc(), ShopOrder.id.desc()).limit(15)
        for order in self.db.execute(ord_stmt).scalars().all():
            score = 1.0 if q_lower == order.order_number.lower() else 0.55
            results.append(
                SearchResultItem(
                    id=str(order.id),
                    entity_type="shop",
                    title=f"Order #{order.order_number}",
                    subtitle=f"Status: {order.status} • Total: ₹{order.total_amount} • {order.fulfilment_type}",
                    badge=order.status,
                    badge_type="success" if order.status in ("COMPLETED", "DELIVERED") else "warning",
                    metadata={"order_number": order.order_number, "total_amount": float(order.total_amount), "status": order.status},
                    navigation_url="/shop",
                    relevance_score=score,
                )
            )

        return results

    # -------------------------------------------------------------------------
    # Domain 6: Cafeteria
    # -------------------------------------------------------------------------
    def _search_cafeteria(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search cafeteria facility, menu items, and food orders with business-unit isolation."""
        results = []
        q_lower = q.lower()
        patt = f"%{escape_like(q)}%"

        # 6a. Search Cafeteria Facility itself
        c_stmt = select(Cafeteria)
        c_conds = [Cafeteria.name.ilike(patt)]
        if q_lower in ("bar", "cafe", "cafeteria", "lounge", "food", "beverage", "restaurant"):
            c_conds.append(Cafeteria.status == "ACTIVE")

        for cafe in self.db.execute(c_stmt.where(or_(*c_conds))).scalars().all():
            score = 0.98 if any(k in cafe.name.lower() for k in ("bar", "cafe", "cafeteria")) or q_lower in ("bar", "cafe", "cafeteria") else 0.85
            results.append(
                SearchResultItem(
                    id=str(cafe.id),
                    entity_type="cafeteria",
                    title=f"Facility: {cafe.name}",
                    subtitle=f"Pavilion Sports Bar & Dining • Status: {cafe.status}",
                    badge="BAR & CAFE",
                    badge_type="success",
                    metadata={"cafeteria_id": str(cafe.id), "status": cafe.status},
                    navigation_url="/cafeteria",
                    relevance_score=score,
                )
            )

        # 6b. Menu Items
        m_stmt = select(MenuItem, Cafeteria).join(Cafeteria, MenuItem.cafeteria_id == Cafeteria.id)
        if self.is_cafe_owner and self.cafeteria_id:
            m_stmt = m_stmt.where(MenuItem.cafeteria_id == self.cafeteria_id)
        elif not self.is_admin:
            m_stmt = m_stmt.where(MenuItem.is_available.is_(True))

        m_conds = [
            MenuItem.name.ilike(patt),
            MenuItem.category.ilike(patt),
            Cafeteria.name.ilike(patt),
        ]
        if self.is_postgres:
            m_text = MenuItem.name + " " + MenuItem.category + " " + func.coalesce(MenuItem.description, "")
            m_conds.append(func.to_tsvector("english", m_text).op("@@")(func.plainto_tsquery("english", q)))
            if fuzzy and len(q) >= 4:
                m_conds.append(func.similarity(MenuItem.name, q) > 0.30)
                m_conds.append(func.word_similarity(q, MenuItem.name) > 0.40)

        m_stmt = m_stmt.where(or_(*m_conds)).order_by(MenuItem.created_at.desc(), MenuItem.id.desc()).limit(20)
        for item, cafe in self.db.execute(m_stmt).all():
            iname = item.name.lower()
            if q_lower == iname:
                score = 1.0
            elif iname.startswith(q_lower):
                score = 0.96
            elif f" {q_lower} " in f" {iname} ":
                score = 0.93
            elif q_lower in iname:
                score = 0.90
            elif q_lower in item.category.lower():
                score = 0.80
            else:
                score = 0.70

            results.append(
                SearchResultItem(
                    id=str(item.id),
                    entity_type="cafeteria",
                    title=f"{item.name} ({item.category.title()})",
                    subtitle=f"{cafe.name} • Price: ₹{item.price} • {'Available' if item.is_available else 'Out of stock'}",
                    badge=f"₹{item.price}",
                    badge_type="info",
                    metadata={"price": float(item.price), "category": item.category, "is_available": item.is_available},
                    navigation_url="/cafeteria",
                    relevance_score=score,
                )
            )

        # 6c. Food Orders
        fo_stmt = select(FoodOrder, Cafeteria).join(Cafeteria, FoodOrder.cafeteria_id == Cafeteria.id)
        if self.is_cafe_owner and self.cafeteria_id:
            fo_stmt = fo_stmt.where(FoodOrder.cafeteria_id == self.cafeteria_id)
        elif not self.is_admin:
            fo_stmt = fo_stmt.where(FoodOrder.user_id == self.user.id)

        fo_conds = [
            FoodOrder.order_number.ilike(patt),
            FoodOrder.status.ilike(patt),
        ]
        if self.is_postgres and fuzzy and len(q) >= 4:
            fo_conds.append(func.similarity(FoodOrder.order_number, q) > 0.35)

        fo_stmt = fo_stmt.where(or_(*fo_conds)).order_by(FoodOrder.created_at.desc(), FoodOrder.id.desc()).limit(15)
        for order, cafe in self.db.execute(fo_stmt).all():
            score = 1.0 if q_lower == order.order_number.lower() else 0.55
            results.append(
                SearchResultItem(
                    id=str(order.id),
                    entity_type="cafeteria",
                    title=f"Kitchen Order #{order.order_number}",
                    subtitle=f"{cafe.name} • Total: ₹{order.total_amount} • Status: {order.status}",
                    badge=order.status,
                    badge_type="warning" if order.status in ("NEW", "PREPARING") else "success",
                    metadata={"order_number": order.order_number, "total_amount": float(order.total_amount), "status": order.status},
                    navigation_url="/cafeteria",
                    relevance_score=score,
                )
            )

        return results

    # -------------------------------------------------------------------------
    # Domain 7: Finance & Invoices
    # -------------------------------------------------------------------------
    def _search_finance(self, q: str, fuzzy: bool) -> List[SearchResultItem]:
        """Search invoices, payments, and club expenses enforcing financial data isolation."""
        results = []
        q_lower = q.lower()
        patt = f"%{escape_like(q)}%"

        # 7a. Invoices
        inv_stmt = select(Invoice)
        if not self.is_admin:
            inv_stmt = inv_stmt.where(Invoice.user_id == self.user.id)

        inv_conds = [
            Invoice.invoice_number.ilike(patt),
            Invoice.customer_name.ilike(patt),
            Invoice.customer_email.ilike(patt),
        ]
        # Only match transaction_type if query is specific to financial transaction
        if q_lower not in ("shop", "cafeteria", "bar", "booking", "member"):
            inv_conds.append(Invoice.transaction_type.ilike(patt))

        if self.is_postgres and fuzzy and len(q) >= 4:
            inv_conds.append(func.similarity(Invoice.invoice_number, q) > 0.35)

        is_exact_inv = Invoice.invoice_number.ilike(q)
        inv_stmt = inv_stmt.where(or_(*inv_conds)).order_by(is_exact_inv.desc(), Invoice.issued_at.desc(), Invoice.id.desc()).limit(20)
        for inv in self.db.execute(inv_stmt).scalars().all():
            score = 1.0 if q_lower == inv.invoice_number.lower() else 0.65
            results.append(
                SearchResultItem(
                    id=str(inv.id),
                    entity_type="finance",
                    title=f"Invoice {inv.invoice_number} ({inv.transaction_type})",
                    subtitle=f"Amount: ₹{inv.amount} • {inv.customer_name or inv.customer_email} • Email: {inv.email_status}",
                    badge=inv.status,
                    badge_type="success" if inv.status == "PAID" else "danger",
                    metadata={
                        "invoice_number": inv.invoice_number,
                        "transaction_type": inv.transaction_type,
                        "amount": float(inv.amount),
                        "email_status": inv.email_status,
                    },
                    navigation_url="/finance",
                    relevance_score=score,
                )
            )

        # 7b. Payments
        pay_stmt = select(Payment)
        if not self.is_admin:
            pay_stmt = pay_stmt.where(Payment.user_id == self.user.id)

        # For generic searches like "shop", "bar", "cafeteria", do NOT flood with payment transactions
        pay_conds = [
            Payment.transaction_reference.ilike(patt),
            Payment.payment_method.ilike(patt),
        ]
        # Only match reference_type if query is not generic domain keyword
        if q_lower not in ("shop", "bar", "cafe", "cafeteria", "court", "booking"):
            pay_conds.append(Payment.reference_type.ilike(patt))

        pay_stmt = pay_stmt.where(or_(*pay_conds)).order_by(Payment.created_at.desc(), Payment.id.desc()).limit(15)
        for pay in self.db.execute(pay_stmt).scalars().all():
            if pay.transaction_reference and q_lower == pay.transaction_reference.lower():
                score = 1.0
            elif pay.transaction_reference and q_lower in pay.transaction_reference.lower():
                score = 0.85
            else:
                score = 0.40

            results.append(
                SearchResultItem(
                    id=str(pay.id),
                    entity_type="finance",
                    title=f"Payment: ₹{pay.amount} ({pay.payment_method})",
                    subtitle=f"Ref: {pay.transaction_reference or 'N/A'} • {pay.reference_type} • Status: {pay.status}",
                    badge=pay.status,
                    badge_type="success" if pay.status == "COMPLETED" else "warning",
                    metadata={"amount": float(pay.amount), "method": pay.payment_method, "ref": pay.transaction_reference},
                    navigation_url="/finance",
                    relevance_score=score,
                )
            )

        # 7c. Expenses (Strictly Admin only)
        if self.is_admin:
            exp_stmt = select(Expense).where(
                or_(
                    Expense.description.ilike(patt),
                    Expense.category.ilike(patt),
                )
            ).order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(15)
            for exp in self.db.execute(exp_stmt).scalars().all():
                results.append(
                    SearchResultItem(
                        id=str(exp.id),
                        entity_type="finance",
                        title=f"Expense: {exp.description}",
                        subtitle=f"Category: {exp.category} • Amount: ₹{exp.amount} • Date: {exp.expense_date}",
                        badge=f"₹{exp.amount}",
                        badge_type="danger",
                        metadata={"category": exp.category, "amount": float(exp.amount), "date": str(exp.expense_date)},
                        navigation_url="/dashboard/finance",
                        relevance_score=0.60,
                    )
                )

        return results
