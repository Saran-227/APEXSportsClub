"""ApexSportsClub - Professional PDF Invoice Generation Service using ReportLab."""
from datetime import datetime
from decimal import Decimal
import io
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

# Electric Lime and Dark Graphite brand colors
COLOR_ELECTRIC_LIME = colors.HexColor("#C7FF36")
COLOR_DARK_GRAPHITE = colors.HexColor("#111827")
COLOR_GRAPHITE_LIGHT = colors.HexColor("#374151")
COLOR_MUTED_TEXT = colors.HexColor("#6B7280")
COLOR_BORDER = colors.HexColor("#E5E7EB")
COLOR_ROW_ALT = colors.HexColor("#F9FAFB")
COLOR_HEADER_BG = colors.HexColor("#171A1D")


def format_currency(amount: Decimal | float | int, currency: str = "INR") -> str:
    """Format currency amount appropriately."""
    val = Decimal(str(amount))
    symbol = "₹" if currency.upper() == "INR" else "$"
    return f"{symbol}{val:,.2f}"


def generate_invoice_pdf(
    invoice_number: str,
    issued_at: datetime,
    customer_name: str,
    customer_email: str,
    transaction_type: str,
    items: List[Dict[str, Any]],
    subtotal: Decimal,
    discount_amount: Decimal,
    tax_amount: Decimal,
    total_amount: Decimal,
    currency: str = "INR",
    customer_id: Optional[str] = None,
    membership_number: Optional[str] = None,
    reference_id: Optional[str] = None,
    payment_method: str = "ONLINE",
    payment_reference: Optional[str] = None,
    output_path: Optional[str | Path] = None,
) -> bytes:
    """Generate a clean, professional, branded PDF invoice document."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    style_brand = ParagraphStyle(
        "BrandTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_brand_sub = ParagraphStyle(
        "BrandSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=COLOR_MUTED_TEXT,
    )
    style_inv_title = ParagraphStyle(
        "InvTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        alignment=2,  # Right align
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_inv_meta = ParagraphStyle(
        "InvMeta",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        alignment=2,  # Right align
        textColor=COLOR_GRAPHITE_LIGHT,
    )
    style_section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_detail_label = ParagraphStyle(
        "DetailLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=COLOR_MUTED_TEXT,
    )
    style_detail_val = ParagraphStyle(
        "DetailVal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_th = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
    )
    style_th_right = ParagraphStyle(
        "TableHeaderRight",
        parent=style_th,
        alignment=2,
    )
    style_td = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_td_right = ParagraphStyle(
        "TableCellRight",
        parent=style_td,
        alignment=2,
    )
    style_total_label = ParagraphStyle(
        "TotalLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        alignment=2,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_total_val = ParagraphStyle(
        "TotalVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        alignment=2,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_footer = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        alignment=1,  # Center
        textColor=COLOR_MUTED_TEXT,
    )

    story = []

    # 1. Header Section: Brand on Left, Invoice Details on Right
    brand_text = """<b>APEX SPORTS CLUB</b><br/>
<font size="8" color="#4B5563">Olympic Main Arena, Guwahati, Assam</font><br/>
<font size="8" color="#4B5563">Email: support@apexsportsclub.com | Web: apexsportsclub.com</font>"""

    date_str = issued_at.strftime("%d %b %Y, %I:%M %p")
    inv_meta_text = f"""<b>INVOICE / RECEIPT</b><br/>
<font color="#111827"><b>Invoice No:</b> {invoice_number}</font><br/>
<font color="#4B5563"><b>Date:</b> {date_str}</font><br/>
<font color="#4B5563"><b>Status:</b> PAID</font>"""

    header_table = Table(
        [
            [
                Paragraph(brand_text, style_brand),
                Paragraph(inv_meta_text, style_inv_meta),
            ]
        ],
        colWidths=[310, 230],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(header_table)

    # Accent divider (Electric Lime Bar)
    story.append(
        HRFlowable(
            width="100%",
            thickness=3,
            color=COLOR_ELECTRIC_LIME,
            spaceAfter=14,
            spaceBefore=4,
        )
    )

    # 2. Customer and Transaction Meta Information Box
    cust_info = [
        Paragraph("<b>BILLED TO</b>", style_section_heading),
        Spacer(1, 4),
        Paragraph(f"<b>Name:</b> {customer_name}", style_detail_val),
        Paragraph(f"<b>Email:</b> {customer_email}", style_detail_val),
    ]
    if customer_id:
        cust_info.append(Paragraph(f"<b>Customer ID:</b> {str(customer_id)[:8]}", style_detail_val))
    if membership_number:
        cust_info.append(Paragraph(f"<b>Membership ID:</b> {membership_number}", style_detail_val))

    tx_info = [
        Paragraph("<b>TRANSACTION DETAILS</b>", style_section_heading),
        Spacer(1, 4),
        Paragraph(f"<b>Type:</b> {transaction_type.replace('_', ' ').upper()}", style_detail_val),
        Paragraph(f"<b>Payment Method:</b> {payment_method}", style_detail_val),
    ]
    if reference_id:
        tx_info.append(Paragraph(f"<b>Reference:</b> {reference_id}", style_detail_val))
    if payment_reference:
        tx_info.append(Paragraph(f"<b>Txn ID:</b> {payment_reference}", style_detail_val))

    meta_table = Table(
        [[cust_info, tx_info]],
        colWidths=[270, 270],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_ROW_ALT),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 16))

    # 3. Itemized Table Breakdown
    # Columns: Description (210), Qty (40), Unit Price (70), Discount (70), Tax (70), Total (80) = 540 total width
    table_data = [
        [
            Paragraph("Description", style_th),
            Paragraph("Qty", style_th_right),
            Paragraph("Unit Price", style_th_right),
            Paragraph("Discount", style_th_right),
            Paragraph("Tax", style_th_right),
            Paragraph("Total", style_th_right),
        ]
    ]

    for item in items:
        desc = item.get("description", "Item")
        qty = item.get("quantity", 1)
        unit_p = Decimal(str(item.get("unit_price", 0)))
        disc = Decimal(str(item.get("discount", 0)))
        tax = Decimal(str(item.get("tax", 0)))
        line_tot = Decimal(str(item.get("total", (unit_p * Decimal(qty)) - disc + tax)))

        table_data.append(
            [
                Paragraph(desc, style_td),
                Paragraph(str(qty), style_td_right),
                Paragraph(format_currency(unit_p, currency), style_td_right),
                Paragraph(format_currency(disc, currency) if disc > 0 else "-", style_td_right),
                Paragraph(format_currency(tax, currency) if tax > 0 else "-", style_td_right),
                Paragraph(format_currency(line_tot, currency), style_td_right),
            ]
        )

    items_table = Table(
        table_data,
        colWidths=[200, 40, 75, 75, 70, 80],
    )

    t_styles = [
        ("BACKGROUND", (0, 0), (-1, 0), COLOR_HEADER_BG),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
    ]

    # Alternating row colors
    for r_idx in range(1, len(table_data)):
        if r_idx % 2 == 0:
            t_styles.append(("BACKGROUND", (0, r_idx), (-1, r_idx), COLOR_ROW_ALT))

    items_table.setStyle(TableStyle(t_styles))
    story.append(items_table)
    story.append(Spacer(1, 12))

    # 4. Summary Financials Block
    summary_data = [
        [Paragraph("Subtotal:", style_total_label), Paragraph(format_currency(subtotal, currency), style_total_val)],
    ]
    if discount_amount > 0:
        summary_data.append(
            [Paragraph("Discount Applied:", style_total_label), Paragraph(f"-{format_currency(discount_amount, currency)}", style_total_val)]
        )
    if tax_amount > 0:
        summary_data.append(
            [Paragraph("Applicable Tax:", style_total_label), Paragraph(format_currency(tax_amount, currency), style_total_val)]
        )

    # Highlight Total Row with Electric Lime Accent
    style_grand_label = ParagraphStyle(
        "GrandLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        alignment=2,
        textColor=COLOR_DARK_GRAPHITE,
    )
    style_grand_val = ParagraphStyle(
        "GrandVal",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        alignment=2,
        textColor=COLOR_DARK_GRAPHITE,
    )
    summary_data.append(
        [Paragraph("<b>TOTAL AMOUNT PAID:</b>", style_grand_label), Paragraph(f"<b>{format_currency(total_amount, currency)}</b>", style_grand_val)]
    )

    summary_table = Table(
        summary_data,
        colWidths=[410, 130],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("BACKGROUND", (0, -1), (-1, -1), COLOR_ELECTRIC_LIME),
            ]
        )
    )
    story.append(summary_table)

    story.append(Spacer(1, 30))

    # 5. Footer Authenticity and Support
    story.append(
        HRFlowable(
            width="100%",
            thickness=0.5,
            color=COLOR_BORDER,
            spaceAfter=10,
            spaceBefore=0,
        )
    )
    footer_text = """<b>Thank you for choosing Apex Sports Club!</b><br/>
This is a computer-generated tax invoice and requires no physical signature.<br/>
Registered Facility: Olympic Main Arena, Guwahati, Assam 781001.<br/>
For billing enquiries or booking assistance, please contact <b>support@apexsportsclub.com</b>."""
    story.append(Paragraph(footer_text, style_footer))

    # Build PDF
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    # Save to disk if output_path is provided
    if output_path:
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "wb") as f:
            f.write(pdf_bytes)

    return pdf_bytes
