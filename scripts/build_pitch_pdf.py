# -*- coding: utf-8 -*-
"""Builds the digital products pitch PDF for the business owner."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table,
    TableStyle, PageBreak, KeepTogether, HRFlowable,
)

NAVY = HexColor("#142334")
TAN = HexColor("#C9AD98")
SAND = HexColor("#E4D8CB")
OFFWHITE = HexColor("#FCFBFA")
MUTED = HexColor("#5A6675")

OUT = r"G:\AntiGravity Projects\coach-kagiso\Digital-Products-Pitch.pdf"

PAGE_W, PAGE_H = A4
MARGIN = 20 * mm

styles = {
    "eyebrow": ParagraphStyle(
        "eyebrow", fontName="Helvetica-Bold", fontSize=9, leading=12,
        textColor=TAN, spaceAfter=6, alignment=TA_LEFT,
    ),
    "h1": ParagraphStyle(
        "h1", fontName="Times-Roman", fontSize=30, leading=34,
        textColor=NAVY, spaceAfter=14,
    ),
    "h2": ParagraphStyle(
        "h2", fontName="Times-Roman", fontSize=21, leading=25,
        textColor=NAVY, spaceBefore=8, spaceAfter=10,
    ),
    "h3": ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=12.5, leading=16,
        textColor=NAVY, spaceBefore=4, spaceAfter=4,
    ),
    "body": ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10.5, leading=16,
        textColor=NAVY, spaceAfter=9,
    ),
    "body_muted": ParagraphStyle(
        "body_muted", fontName="Helvetica", fontSize=10.5, leading=16,
        textColor=MUTED, spaceAfter=9,
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=10.5, leading=15.5,
        textColor=NAVY, leftIndent=14, bulletIndent=2, spaceAfter=5,
    ),
    "price": ParagraphStyle(
        "price", fontName="Times-Italic", fontSize=13, leading=16,
        textColor=TAN, spaceAfter=6,
    ),
    "quote": ParagraphStyle(
        "quote", fontName="Times-Italic", fontSize=14, leading=20,
        textColor=NAVY, leftIndent=10, spaceBefore=6, spaceAfter=10,
    ),
    "cover_title": ParagraphStyle(
        "cover_title", fontName="Times-Roman", fontSize=40, leading=46,
        textColor=NAVY, spaceAfter=18,
    ),
    "cover_sub": ParagraphStyle(
        "cover_sub", fontName="Helvetica", fontSize=12.5, leading=19,
        textColor=MUTED, spaceAfter=8,
    ),
    "small": ParagraphStyle(
        "small", fontName="Helvetica", fontSize=8.5, leading=12,
        textColor=MUTED,
    ),
}


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(SAND)
    canvas.setLineWidth(0.8)
    canvas.line(MARGIN, 16 * mm, PAGE_W - MARGIN, 16 * mm)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, 11 * mm, "Coach Kagiso  |  Digital Products Proposal  |  Confidential")
    canvas.drawRightString(PAGE_W - MARGIN, 11 * mm, f"Page {doc.page}")
    canvas.restoreState()


def cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(SAND)
    canvas.rect(0, PAGE_H - 70 * mm, PAGE_W, 70 * mm, stroke=0, fill=1)
    canvas.setFillColor(white)
    canvas.setFont("Times-Roman", 92)
    canvas.setFillColorRGB(1, 1, 1, alpha=0.45)
    canvas.drawCentredString(PAGE_W / 2, PAGE_H - 52 * mm, "PITCH")
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, 14 * mm, stroke=0, fill=1)
    canvas.restoreState()


def callout(text, bg=SAND, text_color=NAVY, pad=12):
    p = Paragraph(text, ParagraphStyle(
        "callout_p", fontName="Helvetica", fontSize=10.5, leading=16,
        textColor=text_color,
    ))
    t = Table([[p]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), pad + 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad + 4),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("LINEBEFORE", (0, 0), (0, -1), 3, TAN),
    ]))
    return t


def dark_callout(text):
    p = Paragraph(text, ParagraphStyle(
        "dark_callout_p", fontName="Times-Italic", fontSize=13, leading=19,
        textColor=white,
    ))
    t = Table([[p]], colWidths=[PAGE_W - 2 * MARGIN])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 18),
        ("RIGHTPADDING", (0, 0), (-1, -1), 18),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    return t


def divider():
    return HRFlowable(width="100%", thickness=0.8, color=SAND, spaceBefore=10, spaceAfter=14)


def product_block(number, title, price, paragraphs, feeds, effort):
    flow = []
    flow.append(Paragraph(f"{number}.  {title}", styles["h3"]))
    flow.append(Paragraph(price, styles["price"]))
    for para in paragraphs:
        flow.append(Paragraph(para, styles["body"]))
    flow.append(Paragraph(f"<b>One-off effort to build:</b> {effort}", styles["body_muted"]))
    flow.append(Paragraph(f"<b>How it protects and feeds the premium work:</b> {feeds}", styles["body_muted"]))
    flow.append(divider())
    return KeepTogether(flow)


story = []

# ---------------- COVER ----------------
story.append(Spacer(1, 78 * mm))
story.append(Paragraph("Proposal  ·  June 2026", styles["eyebrow"]))
story.append(Paragraph("A Digital Shelf for<br/>Coach Kagiso", styles["cover_title"]))
story.append(Paragraph(
    "A plan for products that earn while you coach, sleep, and create — "
    "built once, sold forever, and designed to send <i>more</i> clients into "
    "your premium services, not fewer.",
    styles["cover_sub"],
))
story.append(Spacer(1, 10 * mm))
story.append(Paragraph("Prepared for: The Owner, Coach Kagiso", styles["body_muted"]))
story.append(Paragraph("Prepared by: Your team", styles["body_muted"]))
story.append(PageBreak())

# ---------------- THE WHY ----------------
story.append(Paragraph("Part 01", styles["eyebrow"]))
story.append(Paragraph("Why we are bringing this to you now", styles["h1"]))
story.append(Paragraph(
    "Right now, every rand the business earns requires your hands. A CV revamp takes your evening. "
    "A clarity session takes 75 minutes plus prep plus the follow-up call. The masterclass is capped at "
    "twelve seats because that is what one room with you in it can hold. This model works beautifully "
    "when bookings are full. But when bookings slow down — as they have — income stops completely, "
    "even though your knowledge, your materials, and your website are all still sitting there, ready to help people.",
    styles["body"],
))
story.append(Paragraph(
    "We are proposing a digital shelf: a small line of products that package what you already know into "
    "things people can buy at any hour, without a single minute of your time per sale. Templates, workbooks, "
    "recordings, guides, and one automated tool. Each one is built once and sells indefinitely.",
    styles["body"],
))
story.append(Paragraph(
    "Almost everything needed already exists. The website has a working checkout (Peach Payments), automated "
    "email delivery (Brevo), instant PDF generation, and even an AI CV analyzer already built into the site. "
    "We are not proposing a new build. We are proposing to put price tags on the shelf we already own.",
    styles["body"],
))
story.append(Spacer(1, 4))
story.append(dark_callout(
    "“The services sell your hands. The products sell your knowledge. "
    "One of them runs out of hours. The other one doesn't.”"
))
story.append(PageBreak())

# ---------------- THE CONCERN ----------------
story.append(Paragraph("Part 02", styles["eyebrow"]))
story.append(Paragraph("The concern, answered honestly", styles["h1"]))
story.append(Paragraph(
    "You raised a fair worry, and we want to face it directly rather than talk around it: "
    "<i>“If we sell a R99 template, why would anyone pay me R400 for a revamp — or R1,200 for the VIP?”</i>",
    styles["body"],
))
story.append(Paragraph("1. The product buyer and the premium client are different people", styles["h3"]))
story.append(Paragraph(
    "The person who buys a R99 template was almost never going to pay R400. Right now, that person visits "
    "the site, sees the prices, and leaves with nothing — and we earn nothing. A digital shelf converts that "
    "lost visitor into a paying customer. We are not splitting the existing pie. We are finally charging the "
    "people who currently walk past it.",
    styles["body"],
))
story.append(Paragraph("2. Do-it-yourself does not compete with done-for-you", styles["h3"]))
story.append(Paragraph(
    "Your premium clients are not paying for information. They are paying for <b>you</b> — your eye on their "
    "specific CV, your judgement on their specific career, your accountability over their 30 days. A template "
    "cannot do that, and the people who want that know it. Nobody cancels a personal chef because the "
    "supermarket sells recipe books.",
    styles["body"],
))
story.append(Paragraph("3. Every product is a paid advertisement for the services", styles["h3"]))
story.append(Paragraph(
    "Each product carries a built-in upgrade path: <i>“Want this done for you? Your purchase is credited "
    "toward the full service.”</i> You already use this mechanic — the R150 CV Review credits toward the R400 "
    "Revamp. We are extending a proven part of your own model. A customer who has paid you R99 and got value "
    "trusts you. Upgrading a happy R99 customer is far easier than convincing a cold stranger to spend R1,200.",
    styles["body"],
))
story.append(Paragraph("4. Lower-priced products make the premium look premium", styles["h3"]))
story.append(Paragraph(
    "Pricing psychology is consistent on this: a visible ladder (R49 → R149 → R400 → R1,200) makes the top "
    "of the ladder feel like the serious option, not an expensive one. With only services on offer, R400 is "
    "the cheap-or-nothing decision. With products underneath it, R400 becomes the obvious step up.",
    styles["body"],
))
story.append(Paragraph("5. We protect the premium deliberately", styles["h3"]))
story.append(Paragraph(
    "One simple rule governs the whole shelf: <b>no product ever includes your personal time or your personal "
    "review of someone's situation.</b> That stays exclusive to the services. The moment a product would need "
    "your eyes on an individual client, it is a service — and priced like one.",
    styles["body"],
))
story.append(callout(
    "<b>The honest version of the risk:</b> a small number of people who might have paid R400 will buy the "
    "R149 product instead. But for each of those, many more people who would have paid nothing will now pay "
    "something — and a portion of them climb the ladder into services they would never have bought cold. "
    "Across the career-coaching industry this trade reliably nets out positive, which is why nearly every "
    "established coach runs exactly this model."
))
story.append(PageBreak())

# ---------------- THE PRODUCTS: TIER 1 ----------------
story.append(Paragraph("Part 03", styles["eyebrow"]))
story.append(Paragraph("The product line", styles["h1"]))
story.append(Paragraph(
    "Nine products in three waves. Wave one can be live within two weeks using material you already have. "
    "Every price sits below the R150–R400 service entry points on purpose: the shelf catches the "
    "price-sensitive majority and walks them upward.",
    styles["body"],
))
story.append(Spacer(1, 6))
story.append(Paragraph("Wave 1 — Quick wins (live within two weeks)", styles["h2"]))

story.append(product_block(
    1, "SA CV Template Pack", "R99 – R199",
    [
        "Three to five ATS-friendly CV templates in Word and Google Docs format, drawn directly from the "
        "structures you already use on paid revamps — plus a short fill-in guide and two before-and-after "
        "examples. Positioned as “the exact bones I use when I rebuild a CV for R400.”",
        "CV templates are the single most proven digital product in the career space worldwide. Yours carry "
        "an advantage international sellers cannot match: they are built for the South African job market, "
        "by a coach recruiters here actually respond to.",
    ],
    feeds="The pack closes with: “Want me to do it for you? CV Revamp R400, your template purchase credited.” "
          "It is the R150 Review mechanic, one rung lower.",
    effort="One weekend. The templates substantially exist inside your past revamp work.",
))

story.append(product_block(
    2, "Masterclass Replays", "R150 – R250 per replay",
    [
        "You are already running “From Stuck to Strategic” on 4 July. We press record. The replay — video "
        "plus the take-home pack — goes on sale the following week for people who missed it or could not "
        "make a Saturday.",
        "The live room stays premium and stays capped at twelve: the live price buys interaction, the intake "
        "form, and your attention. The replay buys the teaching only. After four or five sessions we will own "
        "a library we can also bundle (“The Career Reset Library” at around R600).",
    ],
    feeds="Replay viewers watch you coach for two hours. That is the single best advertisement for a Clarity "
          "Session that could possibly exist, and it costs nothing to produce.",
    effort="Zero additional hours. The work is already scheduled; we simply stop letting it evaporate when "
           "the Zoom call ends.",
))

story.append(product_block(
    3, "Interview Story Bank Workbook", "R149",
    [
        "This is already on the website's downloads roadmap marked “on the list” — we are proposing it ships "
        "as a paid workbook rather than a freebie. Contents: STAR story-building templates, the 30 most "
        "common South African interview questions with answer frameworks, and a night-before preparation "
        "checklist.",
        "Interview prep is the highest-urgency purchase in this market. People buy it in a mild panic, three "
        "days before the interview, at 22:00 — exactly when they cannot book a session with you and would "
        "otherwise get nothing.",
    ],
    feeds="The workbook's upgrade page points to the 60-minute interview prep session inside the Glow Up VIP. "
          "Urgent buyers with budget skip straight to it.",
    effort="Two to three evenings of writing. The questions and frameworks are in your head already.",
))

story.append(product_block(
    4, "Instant AI CV Score", "R49 – R79",
    [
        "The website already contains a working AI CV analyzer in the dashboard. We turn it customer-facing: "
        "upload your CV, pay R49, receive an instant scored report with specific fixes. Completely automated "
        "— the only product on this list that involves literally zero human minutes per sale, forever.",
        "It also catches the very bottom of the market: people for whom even R150 is a stretch today. They "
        "are real, they are numerous, and right now they leave empty-handed.",
    ],
    feeds="The report ends with: “This was the robot. Get the human version — 48-Hour CV Review R150, your "
          "R49 credited.” The robot deliberately whets the appetite for your eye.",
    effort="Technical wiring only, handled by us. None of your time — not at launch and not per sale.",
))

# ---------------- TIER 2 ----------------
story.append(Paragraph("Wave 2 — Built over the following month", styles["h2"]))

story.append(product_block(
    5, "“Land the Interview” Mini-Course", "R350 – R500",
    [
        "Your one-on-one system, recorded once: CV positioning, LinkedIn visibility, applying strategically, "
        "and interviewing — short videos plus the workbooks above. Sold as “the Glow Up VIP, do-it-yourself "
        "edition” at roughly a third of the VIP price.",
        "This naming does double duty: it gives the R350 buyer a complete path, and it explicitly frames the "
        "R1,200 VIP as the version where you personally walk beside them. The VIP becomes more desirable, "
        "not less.",
    ],
    feeds="Course students who stall mid-way are the warmest possible Clarity Session leads — they have "
          "already invested, already trust you, and already know exactly what working with you feels like.",
    effort="Two to three weekends of recording. No course platform needed at first: unlisted videos plus a "
           "buyer-only page on the existing site.",
))

story.append(product_block(
    6, "30-Day Job Search Bootcamp (email course)", "R199",
    [
        "One email per day for thirty days, each with a single task. Week one: CV. Week two: LinkedIn. Week "
        "three: applications. Week four: interviews. Delivered automatically through Brevo, which the site "
        "already uses for every lead magnet.",
        "For the buyer it feels like a daily coach in their inbox. For the business it is thirty consecutive "
        "days of contact with a paying customer — thirty natural moments to mention the services.",
    ],
    feeds="Day 9: “If you want your CV professionally rebuilt instead, here's the Revamp.” Day 26: “Interview "
          "coming up? Here's the prep session.” The sequence sells softly for a month per customer.",
    effort="Write thirty short emails once. They then deliver themselves for years.",
))

story.append(product_block(
    7, "SA Salary Negotiation Guide", "R149",
    [
        "Scripts for “What is your current salary?”, counter-offer email templates, local benchmarking "
        "sources, and how to negotiate without souring the offer — written specifically for the South "
        "African market. Almost nobody serves this niche locally; international guides talk in dollars and "
        "American norms.",
        "It also reaches a buyer the current services barely touch: the employed professional who is not job "
        "hunting but has an offer on the table this week.",
    ],
    feeds="Someone weighing a counter-offer is one short step from “I should think about my career properly” "
          "— which is the Clarity Session, by name.",
    effort="Two to three evenings.",
))

# ---------------- TIER 3 ----------------
story.append(Paragraph("Wave 3 — Bigger plays", styles["h2"]))

story.append(product_block(
    8, "Job Seeker Starter Pack (bundle)", "R299 – R399",
    [
        "Templates + Interview Story Bank + an application tracker spreadsheet + the headline guide, bundled "
        "at a saving — the same logic as your existing CV + LinkedIn Bundle, applied to the shelf. Bundles "
        "reliably lift the average order value, and at R299–R399 it still sits below the R400 Revamp.",
    ],
    feeds="A R399 bundle buyer has demonstrated real budget. They are the most likely product customers to "
          "take the credit-toward-Revamp offer.",
    effort="An afternoon — it is assembled from products already built in waves one and two.",
))

story.append(product_block(
    9, "B2B Licensing", "R5,000+ per agreement",
    [
        "Universities, SETAs, and corporate graduate programmes pay meaningful money for employability "
        "content: CV curricula, interview workshops, workbook licences. Once the shelf exists, it doubles as "
        "a portfolio we can pitch to institutions.",
        "This is a slower burn — but a single licensing agreement can exceed a full month of individual "
        "bookings, and it is the most natural long-term direction for the brand.",
    ],
    feeds="It does not touch the consumer ladder at all; it opens an entirely separate revenue lane on top "
          "of it.",
    effort="One outreach email per week once waves one and two exist as proof.",
))
story.append(PageBreak())

# ---------------- THE NUMBERS ----------------
story.append(Paragraph("Part 04", styles["eyebrow"]))
story.append(Paragraph("What the numbers could look like", styles["h1"]))
story.append(Paragraph(
    "A deliberately modest scenario — roughly one to two sales per day across the whole shelf, which is a "
    "low bar for a site that already attracts job seekers and a coach who already posts content:",
    styles["body"],
))

table_data = [
    ["Product", "Price", "Sales / month", "Revenue / month"],
    ["Instant AI CV Score", "R49", "30", "R1,470"],
    ["SA CV Template Pack", "R149", "15", "R2,235"],
    ["Interview Story Bank", "R149", "8", "R1,192"],
    ["Masterclass Replay", "R200", "10", "R2,000"],
    ["30-Day Bootcamp", "R199", "5", "R995"],
    ["Salary Negotiation Guide", "R149", "5", "R745"],
    ["Shelf subtotal", "", "73", "R8,637"],
    ["Upgrades created: 5 buyers take the CV Revamp", "R400", "5", "R2,000"],
    ["Monthly total", "", "", "R10,637"],
]
t = Table(table_data, colWidths=[78 * mm, 24 * mm, 30 * mm, 36 * mm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("TEXTCOLOR", (0, 1), (-1, -1), NAVY),
    ("ROWBACKGROUNDS", (0, 1), (-1, 6), [white, OFFWHITE]),
    ("BACKGROUND", (0, 7), (-1, 7), SAND),
    ("FONTNAME", (0, 7), (-1, 7), "Helvetica-Bold"),
    ("BACKGROUND", (0, 8), (-1, 8), white),
    ("BACKGROUND", (0, 9), (-1, 9), NAVY),
    ("TEXTCOLOR", (0, 9), (-1, 9), white),
    ("FONTNAME", (0, 9), (-1, 9), "Helvetica-Bold"),
    ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
    ("TOPPADDING", (0, 0), (-1, -1), 7),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, SAND),
]))
story.append(t)
story.append(Spacer(1, 12))
story.append(Paragraph(
    "Roughly <b>R10,000 a month — over R120,000 a year — without a single booking required.</b> And notice "
    "the last line before the total: in this scenario the shelf does not cannibalise the services, it "
    "<i>creates</i> R2,000 a month of service revenue from people who started with a R49–R399 purchase.",
    styles["body"],
))
story.append(Paragraph(
    "These are starting numbers. Unlike bookings, shelf revenue compounds: every new product, every new "
    "piece of content, and every replay added to the library raises the monthly floor without raising the "
    "monthly workload.",
    styles["body"],
))
story.append(Spacer(1, 6))

story.append(Paragraph("And what it costs", styles["h2"]))
story.append(Paragraph(
    "No new platforms, no subscriptions, no developers to hire. Checkout, payment processing, email "
    "delivery, and PDF generation are already live on the site — they currently serve the existing services "
    "and free lead magnets. The only investment is the one-off creation time listed under each product, most "
    "of which is evenings and weekends across about six weeks.",
    styles["body"],
))
story.append(PageBreak())

# ---------------- WHAT IT FREES ----------------
story.append(Paragraph("Part 05", styles["eyebrow"]))
story.append(Paragraph("What this buys you", styles["h1"]))
story.append(Paragraph(
    "This is the part we most want you to sit with. The shelf is not just income — it is the thing that "
    "finally separates the business's earnings from your calendar.",
    styles["body"],
))
for item in [
    "<b>A floor under slow months.</b> When bookings dip, the shelf keeps selling. The business stops "
    "swinging between feast and famine with your diary.",
    "<b>Your time back for the work only you can do.</b> Content, audience-building, partnerships, and the "
    "masterclasses — the activities that grow the brand — instead of trading every available hour for "
    "one-off deliverables.",
    "<b>A content engine with a purpose.</b> Every TikTok, LinkedIn post, and insight article currently "
    "points at services that need your hours to fulfil. Once the shelf exists, the same content sells "
    "products in your sleep. Content stops being a cost and becomes a salesforce.",
    "<b>A more premium brand, not a cheaper one.</b> Coaches with books, courses, and toolkits read as "
    "established authorities. The shelf raises the perceived value of sitting in a room with you.",
    "<b>Proof for the bigger game.</b> The product portfolio becomes the pitch deck for B2B licensing — "
    "the deals that could eventually dwarf both the shelf and the bookings.",
]:
    story.append(Paragraph(f"•&nbsp;&nbsp;{item}", styles["bullet"]))
story.append(Spacer(1, 8))
story.append(dark_callout(
    "“Each product is made once. After that, your job is the one you actually want: "
    "coaching the people who book you, and creating the content that fills the room.”"
))
story.append(Spacer(1, 10))

# ---------------- NEXT STEPS ----------------
story.append(Paragraph("Part 06", styles["eyebrow"]))
story.append(Paragraph("The plan, if you say yes", styles["h1"]))

plan_data = [
    ["When", "What ships"],
    ["Weeks 1–2", "CV Template Pack on sale. Record the 4 July masterclass for replay."],
    ["Weeks 3–4", "Interview Story Bank Workbook on sale. Instant AI CV Score live."],
    ["Month 2", "30-Day Bootcamp and Salary Negotiation Guide. Starter Pack bundle assembled."],
    ["Month 3", "Mini-course recorded and launched. First B2B outreach with the shelf as portfolio."],
]
pt = Table(plan_data, colWidths=[32 * mm, 136 * mm])
pt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), NAVY),
    ("TEXTCOLOR", (0, 0), (-1, 0), white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9.5),
    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
    ("TEXTCOLOR", (0, 1), (-1, -1), NAVY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, OFFWHITE]),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 10),
    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ("LINEBELOW", (0, 0), (-1, -2), 0.4, SAND),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
]))
story.append(pt)
story.append(Spacer(1, 14))
story.append(Paragraph(
    "Your involvement: the knowledge. Ours: everything else — the wiring, the checkout, the delivery, the "
    "pages. And nothing here is irreversible. If after three months the shelf genuinely pulls premium "
    "clients away rather than feeding them in, we take it down and we have lost a few weekends. If it works "
    "the way it works for nearly everyone else in this industry, the business gains a second income that "
    "never sleeps, never cancels, and never asks for your Saturday.",
    styles["body"],
))
story.append(Spacer(1, 6))
story.append(callout(
    "<b>The ask:</b> a yes to Wave 1 — the Template Pack and pressing record on 4 July. Two products, two "
    "weeks, almost no risk. Then we look at the sales numbers together and decide on the rest with real "
    "data instead of worry."
))

# ---------------- BUILD ----------------
doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                      topMargin=22 * mm, bottomMargin=24 * mm,
                      title="Digital Products Proposal — Coach Kagiso",
                      author="Coach Kagiso Team")

frame = Frame(MARGIN, 24 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 46 * mm, id="main")
cover_frame = Frame(MARGIN, 24 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 46 * mm, id="cover")

doc.addPageTemplates([
    PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_bg),
    PageTemplate(id="Body", frames=[frame], onPage=footer),
])

from reportlab.platypus import NextPageTemplate
story.insert(0, NextPageTemplate("Body"))

doc.build(story)
print("PDF written to", OUT)
