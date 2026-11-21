"""Comprehensive Seed Script for ApexSportsClub Multi-Role Platform."""
import os
import sys
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
import uuid

# Ensure backend can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
project_root = os.path.abspath(os.path.join(backend_dir, ".."))
for p in (project_root, backend_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy.orm import Session
from backend.app.core.database import Base, SessionLocal, engine
from backend.app.auth.models import Permission, Role, RolePermission, User, UserRole
from backend.app.auth.security import hash_password
from backend.app.memberships.models import Member, MembershipPlan, MemberSubscription
from backend.app.bookings.models import Court, CourtBooking
from backend.app.shop.models import EquipmentRental, Product, ShopOrder, ShopOrderItem, Vendor
from backend.app.cafeteria.models import Cafeteria, FoodOrder, FoodOrderItem, MenuItem
from backend.app.finance.models import Expense, Invoice, Payment
from backend.app.employees.models import Employee, StaffShift
from backend.app.crm.models import CustomerEnquiry, Notification


def seed_database():
    """Populate database with clean, production-like seed records for all 4 roles."""
    print("Creating all tables if they do not exist...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        # 1. Seed Roles
        role_names = ["ADMIN", "CUSTOMER", "SPORTS_SHOP_VENDOR", "CAFETERIA_OWNER"]
        roles = {}
        for r_name in role_names:
            role = db.query(Role).filter(Role.name == r_name).first()
            if not role:
                role = Role(name=r_name, description=f"ApexSportsClub {r_name} role", is_system_role=True)
                db.add(role)
                db.flush()
            roles[r_name] = role

        # 2. Seed Permissions
        perm_codes = [
            ("members:read", "View member records", "members"),
            ("members:write", "Create/edit members", "members"),
            ("courts:read", "View courts and availability", "courts"),
            ("courts:write", "Manage courts and schedules", "courts"),
            ("bookings:read", "View bookings", "bookings"),
            ("bookings:write", "Create/cancel bookings", "bookings"),
            ("shop:read", "View products and inventory", "shop"),
            ("shop:write", "Manage products and fulfill orders", "shop"),
            ("cafeteria:read", "View cafeteria menu and orders", "cafeteria"),
            ("cafeteria:write", "Manage menu items and kitchen orders", "cafeteria"),
            ("finance:read", "View revenue and financial reports", "finance"),
            ("finance:write", "Record payments and expenses", "finance"),
            ("staff:read", "View employees and shifts", "employees"),
            ("staff:write", "Manage staff and schedules", "employees"),
        ]
        for code, desc, mod in perm_codes:
            perm = db.query(Permission).filter(Permission.code == code).first()
            if not perm:
                perm = Permission(code=code, description=desc, module=mod)
                db.add(perm)

        db.flush()

        # 3. Seed Users for each of the 4 roles
        def create_user_if_missing(email, pwd, fname, lname, phone, role_name):
            usr = db.query(User).filter(User.email == email).first()
            if not usr:
                usr = User(
                    email=email,
                    hashed_password=hash_password(pwd),
                    first_name=fname,
                    last_name=lname,
                    phone_number=phone,
                    is_active=True,
                    is_verified=True,
                )
                db.add(usr)
                db.flush()
                # Assign role
                user_role = UserRole(user_id=usr.id, role_id=roles[role_name].id)
                db.add(user_role)
                db.flush()
            return usr

        admin_user = create_user_if_missing(
            "admin@apexsports.com", "Admin@123456", "Vikram", "Malhotra", "+91 98765 43210", "ADMIN"
        )
        customer_user = create_user_if_missing(
            "customer@apexsports.com", "Customer@123456", "Rohan", "Kapoor", "+91 98111 22334", "CUSTOMER"
        )
        vendor_user = create_user_if_missing(
            "vendor@apexsports.com", "Vendor@123456", "Aarav", "Mehta", "+91 97222 33445", "SPORTS_SHOP_VENDOR"
        )
        cafe_user = create_user_if_missing(
            "cafe@apexsports.com", "Cafe@123456", "Chef Priya", "Sharma", "+91 96333 44556", "CAFETERIA_OWNER"
        )

        # 4. Seed Membership Plans
        plans_data = [
            ("Gold Tier", "Unlimited court priority booking, 20% off all courts, 15% pro shop discount, 10% cafe discount", Decimal("24999.00"), 12, 20.0, 15.0, 10.0),
            ("Silver Tier", "Peak hours booking access, 10% off courts, 10% pro shop discount, 5% cafe discount", Decimal("14999.00"), 12, 10.0, 10.0, 5.0),
            ("Junior Academy", "Dedicated coaching and weekend court access, 15% off junior courts, 10% off shop gear", Decimal("9999.00"), 12, 15.0, 10.0, 10.0),
        ]
        plans = {}
        for name, desc, price, dur, c_disc, s_disc, cafe_disc in plans_data:
            plan = db.query(MembershipPlan).filter(MembershipPlan.name == name).first()
            if not plan:
                plan = MembershipPlan(
                    name=name,
                    description=desc,
                    price=price,
                    duration_months=dur,
                    court_discount_percent=c_disc,
                    shop_discount_percent=s_disc,
                    cafe_discount_percent=cafe_disc,
                    is_active=True,
                )
                db.add(plan)
                db.flush()
            plans[name] = plan

        # 5. Seed Customer Member Profile
        customer_member = db.query(Member).filter(Member.user_id == customer_user.id).first()
        if not customer_member:
            gold_plan = plans["Gold Tier"]
            customer_member = Member(
                user_id=customer_user.id,
                membership_number="APX-GOLD-1001",
                status="ACTIVE",
                date_of_birth=date(1992, 5, 14),
                emergency_contact_name="Ananya Kapoor",
                emergency_contact_phone="+91 98111 99887",
                joined_date=date.today() - timedelta(days=60),
                expiry_date=date.today() + timedelta(days=305),
                current_plan_id=gold_plan.id,
            )
            db.add(customer_member)
            db.flush()

            sub = MemberSubscription(
                member_id=customer_member.id,
                plan_id=gold_plan.id,
                start_date=date.today() - timedelta(days=60),
                end_date=date.today() + timedelta(days=305),
                amount_paid=gold_plan.price,
                payment_status="PAID",
            )
            db.add(sub)
            db.flush()

        # 6. Seed Courts for all supported sports
        courts_data = [
            ("Padel Panoramic Court 1", "padel", "Mondo Super-Court Turf", Decimal("1800.00"), True, "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80"),
            ("Padel Court 2 (Outdoor Open)", "padel", "Textured Blue Turf", Decimal("1500.00"), False, "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80"),
            ("Championship Centre Court", "tennis", "US Open Hardcourt Acrylic", Decimal("1600.00"), False, "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80"),
            ("Tennis Court 2 (Clay Court)", "tennis", "Red Clay", Decimal("1400.00"), False, "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80"),
            ("Badminton Arena Court A", "badminton", "BWF Approved Synthetic Mat", Decimal("900.00"), True, "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80"),
            ("Badminton Arena Court B", "badminton", "Teak Wood Suspension Floor", Decimal("800.00"), True, "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80"),
            ("Cricket Turf Net 1 (Auto-Feeder)", "cricket", "AstroTurf Pitch with Nets", Decimal("1200.00"), True, "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80"),
            ("FIFA 5-a-Side Football Arena", "football", "Monofilament Artificial Turf", Decimal("2200.00"), False, "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80"),
            ("Olympic Table Tennis Table 1", "table_tennis", "ITTF 25mm Top", Decimal("500.00"), True, "https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1200&q=80"),
            ("TrackMan Golf Simulator 1", "golf", "High-Definition 4K Screen", Decimal("2500.00"), True, "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80"),
            ("Heated Olympic Pool (Lane 1)", "swimming", "Ozone Purified Olympic Pool", Decimal("700.00"), True, "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=1200&q=80"),
        ]
        seeded_courts = []
        for name, sport, surface, rate, indoor, img in courts_data:
            court = db.query(Court).filter(Court.name == name).first()
            if not court:
                court = Court(
                    name=name,
                    sport=sport,
                    surface_type=surface,
                    hourly_rate=rate,
                    is_indoor=indoor,
                    is_active=True,
                    image_url=img,
                    opening_time=time(6, 0),
                    closing_time=time(23, 0),
                    description=f"Premier {sport.title()} facility at ApexSportsClub.",
                )
                db.add(court)
                db.flush()
            seeded_courts.append(court)

        # 7. Seed Sample Bookings for today and tomorrow
        today = date.today()
        first_court = seeded_courts[0]
        sample_booking = db.query(CourtBooking).filter(
            CourtBooking.court_id == first_court.id,
            CourtBooking.booking_date == today
        ).first()
        if not sample_booking:
            start_dt = datetime.combine(today, time(18, 0), tzinfo=timezone.utc)
            end_dt = datetime.combine(today, time(19, 0), tzinfo=timezone.utc)
            discount = first_court.hourly_rate * Decimal("0.20")  # 20% Gold discount
            bk = CourtBooking(
                court_id=first_court.id,
                user_id=customer_user.id,
                member_id=customer_member.id,
                booking_date=today,
                start_time=start_dt,
                end_time=end_dt,
                duration_minutes=60,
                hourly_rate=first_court.hourly_rate,
                discount_amount=discount,
                total_amount=first_court.hourly_rate - discount,
                status="CONFIRMED",
                participant_count=4,
                notes="Evening doubles match with coach",
            )
            db.add(bk)
            db.flush()

        # 8. Seed Sports Shop Vendor & Products
        vendor = db.query(Vendor).filter(Vendor.user_id == vendor_user.id).first()
        if not vendor:
            vendor = Vendor(
                user_id=vendor_user.id,
                business_name="Apex Pro Sports Shop",
                vendor_type="SPORTS_SHOP",
                status="APPROVED",
                contact_phone="+91 97222 33445",
                contact_email="shop@apexsports.com",
                tax_id="GSTIN07AABCS1429B1Z1",
                description="Official equipment, gear, apparel and racket stringing partner of ApexSportsClub.",
            )
            db.add(vendor)
            db.flush()

        products_data = [
            ("Head Extreme Pro Padel Racket", "APX-RKT-001", "Rackets", Decimal("14999.00"), Decimal("9500.00"), 12, False, None, "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=800&q=80", "High balance teardrop padel racket for explosive spin and power."),
            ("Wilson Tour Padel Balls (Can of 3)", "APX-BAL-002", "Balls", Decimal("799.00"), Decimal("450.00"), 45, False, None, "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80", "Long-lasting pressurized core engineered for fast glass rebound."),
            ("Babolat Pure Drive Tennis Racket", "APX-RKT-003", "Rackets", Decimal("18500.00"), Decimal("12000.00"), 8, False, None, "https://images.unsplash.com/photo-1617083934555-ac7d4fedc6b4?auto=format&fit=crop&w=800&q=80", "The benchmark of power and all-court versatility."),
            ("Yonex Astrox 88D Pro Badminton Racket", "APX-RKT-004", "Rackets", Decimal("12999.00"), Decimal("8500.00"), 15, False, None, "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80", "Steep attack racket with Rotational Generator System."),
            ("Asics Gel-Resolution 9 Clay/Turf Shoes", "APX-SHO-005", "Shoes", Decimal("11999.00"), Decimal("7500.00"), 10, False, None, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80", "Maximum lateral stability and Dynawall cushioning."),
            ("Apex Performance Dri-FIT Club Jersey", "APX-APP-006", "Apparel", Decimal("2499.00"), Decimal("900.00"), 30, False, None, "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80", "Breathable antimicrobial technical jersey with Apex neon branding."),
            ("Pro Padel Rental Racket", "APX-RNT-007", "Equipment", Decimal("3500.00"), Decimal("2000.00"), 10, True, Decimal("350.00"), "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=800&q=80", "High quality demo racket available for 1-day court rentals."),
            ("Spinshot Automatic Ball Machine", "APX-RNT-008", "Equipment", Decimal("65000.00"), Decimal("45000.00"), 2, True, Decimal("800.00"), "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80", "Programmable speed and oscillation tennis/padel training machine."),
        ]
        seeded_products = []
        for name, sku, cat, price, cost, qty, is_rnt, r_rate, img, desc in products_data:
            p = db.query(Product).filter(Product.sku == sku).first()
            if not p:
                p = Product(
                    vendor_id=vendor.id,
                    name=name,
                    sku=sku,
                    category=cat,
                    price=price,
                    cost_price=cost,
                    stock_quantity=qty,
                    low_stock_threshold=5,
                    is_active=True,
                    is_rental=is_rnt,
                    rental_price_per_day=r_rate,
                    image_url=img,
                    description=desc,
                )
                db.add(p)
                db.flush()
            seeded_products.append(p)

        # 9. Seed Cafeteria & Menu
        cafeteria = db.query(Cafeteria).filter(Cafeteria.user_id == cafe_user.id).first()
        if not cafeteria:
            cafeteria = Cafeteria(
                user_id=cafe_user.id,
                name="Apex Fuel & Lounge",
                description="Organic nutrition, post-match protein shakes, wholesome grain bowls, and specialty espresso.",
                status="ACTIVE",
                opening_hours="07:00 AM - 10:30 PM",
            )
            db.add(cafeteria)
            db.flush()

        menu_data = [
            ("Whey Protein Shake (Triple Cocoa)", "Post-Workout", Decimal("280.00"), 10, 320, "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80", "30g Isolate Whey, organic almond milk, peanut butter, chia seeds."),
            ("Cold Pressed Green Detox Juice", "Beverages", Decimal("220.00"), 5, 110, "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=800&q=80", "Celery, cucumber, green apple, spinach, ginger, lemon."),
            ("Grilled Herb Chicken Quinoa Bowl", "Healthy Bowls", Decimal("380.00"), 15, 520, "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80", "Sous-vide chicken breast, tricolor quinoa, roasted sweet potatoes, avocado, tahini dressing."),
            ("Avocado & Poached Egg Sourdough", "Snacks", Decimal("320.00"), 12, 410, "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80", "Hass avocado, 2 free-range poached eggs, chili flakes, Danish feta on artisanal sourdough."),
            ("Specialty Double Flat White", "Beverages", Decimal("190.00"), 5, 90, "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80", "Medium roast single-origin Ethiopian beans with velvety textured milk."),
            ("Paneer Tikka Protein Wrap", "Mains", Decimal("290.00"), 15, 460, "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80", "Spiced cottage cheese, mint Greek yogurt spread, bell peppers in a whole-wheat wrap."),
        ]
        seeded_menu = []
        for name, cat, price, prep, cals, img, desc in menu_data:
            item = db.query(MenuItem).filter(MenuItem.cafeteria_id == cafeteria.id, MenuItem.name == name).first()
            if not item:
                item = MenuItem(
                    cafeteria_id=cafeteria.id,
                    name=name,
                    category=cat,
                    price=price,
                    preparation_time_minutes=prep,
                    calories=cals,
                    image_url=img,
                    description=desc,
                    is_available=True,
                )
                db.add(item)
                db.flush()
            seeded_menu.append(item)

        # 10. Seed Demo Orders for Cafeteria (Kitchen Board Demo)
        active_order = db.query(FoodOrder).filter(FoodOrder.cafeteria_id == cafeteria.id).first()
        if not active_order:
            order1 = FoodOrder(
                cafeteria_id=cafeteria.id,
                user_id=customer_user.id,
                order_number="ORD-CAF-8801",
                total_amount=Decimal("600.00"),
                status="PREPARING",
                order_type="DINE_IN",
                customer_notes="Extra protein powder in shake please",
                payment_status="PAID",
            )
            db.add(order1)
            db.flush()

            item1 = FoodOrderItem(
                order_id=order1.id,
                menu_item_id=seeded_menu[0].id,
                item_name=seeded_menu[0].name,
                quantity=1,
                unit_price=seeded_menu[0].price,
                total_price=seeded_menu[0].price,
                special_instructions="Extra cold",
            )
            item2 = FoodOrderItem(
                order_id=order1.id,
                menu_item_id=seeded_menu[3].id,
                item_name=seeded_menu[3].name,
                quantity=1,
                unit_price=seeded_menu[3].price,
                total_price=seeded_menu[3].price,
            )
            db.add_all([item1, item2])
            db.flush()

        # 11. Seed Employees & Staff
        staff_emp = db.query(Employee).filter(Employee.user_id == admin_user.id).first()
        if not staff_emp:
            emp = Employee(
                user_id=admin_user.id,
                department="Operations",
                job_title="General Manager & Head of Sports",
                hourly_rate=Decimal("1200.00"),
                hire_date=date(2024, 1, 15),
                status="ACTIVE",
            )
            db.add(emp)
            db.flush()

        db.commit()
        print("SEED SUCCESS! ApexSportsClub database successfully seeded with all 4 roles and operational records.")
    except Exception as e:
        db.rollback()
        print(f"SEED ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
