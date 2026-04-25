"""
FMCG Insight 360 — Streamlit Admin & Ops UI
Run: streamlit run streamlit_app.py
"""

import time
import io
import requests
import streamlit as st
from PIL import Image
from io import BytesIO
from datetime import datetime, timedelta
import pandas as pd

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    REPORTLAB_OK = True
except Exception:
    REPORTLAB_OK = False

try:
    from streamlit_option_menu import option_menu
except Exception:
    option_menu = None

# ──────────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────────

API_BASE = "http://127.0.0.1:8000/api/v1"

st.set_page_config(
    page_title="FMCG Insight 360",
    page_icon="📦",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap');

    * {
        font-family: 'Manrope', sans-serif;
    }

    html, body {
        background: #e8f4f8 !important;
    }

    [data-testid="stAppViewContainer"] {
        background: #e8f4f8 !important;
    }

    [data-testid="stMain"] {
        background: #e8f4f8 !important;
    }

    [data-testid="stElementContainer"] {
        background: transparent;
    }

    .main {
        background: #e8f4f8 !important;
    }

    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #d4e8f0 0%, #c8e0eb 100%);
        border-right: 1px solid rgba(0, 119, 182, 0.12);
    }

    [data-testid="stSidebar"] h2,
    [data-testid="stSidebar"] p,
    [data-testid="stSidebar"] label,
    [data-testid="stSidebar"] span,
    [data-testid="stSidebar"] div {
        color: #1a3a50;
    }

    .block-container {
        padding-top: 1.5rem;
    }

    div[data-testid="stMetric"] {
        background: rgba(255, 255, 255, 0.85);
        border: 2px solid #00a8d8;
        border-radius: 12px;
        padding: 14px 16px;
    }

    div[data-testid="stMetric"] > div:first-child {
        color: #0077bb;
        font-weight: 600;
        font-size: 12px;
    }

    div[data-testid="stMetric"] > div:nth-child(2) {
        color: #1a3a50;
        font-weight: 700;
        font-size: 28px;
    }

    div[data-testid="stDataFrame"] {
        border-radius: 12px;
        overflow: hidden;
        border: 2px solid #00a8d8;
        background: rgba(255, 255, 255, 0.9);
    }

    button[kind="primary"] {
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #0099cc 0%, #00a8d8 100%);
    }

    button[kind="primary"]:hover {
        filter: brightness(1.06);
    }

    button[kind="secondary"] {
        border-radius: 10px;
    }

    .stTabs [role="tablist"] {
        gap: 6px;
    }

    .stTabs [role="tab"] {
        border-radius: 10px;
        padding: 8px 12px;
        background: rgba(0, 119, 182, 0.08);
        border: 1px solid rgba(0, 119, 182, 0.2);
        color: #1a3a50;
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #0099cc 0%, #00a8d8 100%);
        border-color: #0077bb;
        color: #ffffff;
    }

    /* Compact admin mode */
    .dataframe {
        font-size: 13px;
        line-height: 1.2;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    table th {
        padding: 6px 8px;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        color: #0077bb;
        border-bottom: 2px solid #00a8d8;
    }

    table td {
        padding: 6px 8px;
        border-bottom: 1px solid rgba(0, 119, 182, 0.1);
        font-size: 13px;
        color: #2c3e50;
    }

    input, textarea, select {
        border-radius: 8px;
        border: 1px solid rgba(0, 119, 182, 0.3);
        background: rgba(255, 255, 255, 0.95);
        color: #2c3e50;
        padding: 8px 10px;
        font-size: 13px;
    }

    input::placeholder, textarea::placeholder {
        color: rgba(44, 62, 80, 0.4);
    }

    input:focus, textarea:focus, select:focus {
        border-color: #0099cc;
        background: rgba(0, 153, 204, 0.05);
        outline: none;
        box-shadow: 0 0 0 3px rgba(0, 153, 204, 0.1);
    }

    .stForm {
        gap: 6px;
    }

    .stFormSubmitButton {
        margin-top: 8px;
    }

    h1, h2, h3, h4, h5, h6 {
        color: #1a3a50;
        font-weight: 700;
        letter-spacing: 0.1px;
    }

    p, span, label, div, caption {
        color: #2c3e50;
    }

    .stDivider {
        border-top: 1px solid rgba(0, 119, 182, 0.15);
    }

    .stSelectbox, .stTextInput, .stNumberInput, .stSlider {
        margin-bottom: 4px;
    }

    [data-testid="stSelectbox"] label,
    [data-testid="stTextInput"] label,
    [data-testid="stNumberInput"] label,
    [data-testid="stSlider"] label {
        font-weight: 600;
        font-size: 13px;
        color: #0077bb;
        margin-bottom: 2px;
    }

    .stExpander {
        border: 1px solid rgba(0, 119, 182, 0.2);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.8);
    }

    [data-testid="stExpanderDetails"] {
        padding: 8px 12px;
    }

    /* Professional page layout */
    [data-testid="stHeader"] {
        background: transparent !important;
        height: 0 !important;
        padding: 0 !important;
    }

    [data-testid="stToolbar"] {
        display: none !important;
    }

    .stTabs {
        margin-top: 24px;
    }

    .stTabs [role="tablist"] {
        gap: 12px;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid rgba(0, 119, 182, 0.2);
    }

    .stTabs [role="tab"] {
        border-radius: 10px;
        padding: 12px 22px;
        background: rgba(0, 119, 182, 0.08);
        border: 2px solid rgba(0, 119, 182, 0.2);
        color: #1a3a50;
        font-weight: 600;
        font-size: 14px;
        transition: all 0.3s ease;
    }

    .stTabs [role="tab"]:hover {
        border-color: #0099cc;
        background: rgba(0, 153, 204, 0.15);
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #0099cc 0%, #00a8d8 100%);
        border-color: #0077bb;
        color: #ffffff;
        box-shadow: 0 4px 14px rgba(0, 153, 204, 0.3);
    }

    /* Page title spacing */
    h1 {
        margin-top: 0 !important;
        margin-bottom: 8px !important;
        padding-top: 0 !important;
    }

    .stMarkdown p {
        margin-bottom: 20px;
    }

    /* Button styling */
    button[kind="primary"] {
        border-radius: 8px;
        padding: 12px 24px !important;
        font-weight: 600 !important;
    }

    button[kind="primary"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 153, 204, 0.3);
    }

    button[kind="secondary"] {
        border-radius: 8px;
        padding: 10px 20px;
        border: 2px solid #0099cc !important;
        background: transparent;
        color: #0077bb;
        font-weight: 600 !important;
    }

    button[kind="secondary"]:hover {
        background: rgba(0, 153, 204, 0.1);
    }

    /* Form padding */
    .stForm {
        gap: 14px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 12px;
        border: 1px solid rgba(0, 119, 182, 0.15);
    }

    .stFormSubmitButton {
        margin-top: 18px;
    }

    /* Tab content padding */
    [role="tabpanel"] {
        padding-top: 16px;
    }

    /* ─────────────────────────── Professional Card Styling ─────────────────────────── */
    .stContainer, [data-testid="stVerticalBlock"] > div {
        margin: 12px 0;
    }

    /* Card containers */
    .stContainer > div[data-testid="stVerticalBlock"] {
        background: rgba(255, 255, 255, 0.8);
        padding: 20px;
        border-radius: 12px;
        border: 1px solid rgba(0, 119, 182, 0.15);
        box-shadow: 0 2px 8px rgba(0, 119, 182, 0.08);
    }

    /* ─────────────────────────── Typography Hierarchy ─────────────────────────── */
    h1 {
        font-size: 32px;
        font-weight: 800;
        color: #1a3a50;
        margin: 0 0 8px 0 !important;
        letter-spacing: -0.5px;
    }

    h2 {
        font-size: 24px;
        font-weight: 700;
        color: #1a3a50;
        margin: 18px 0 8px 0 !important;
        letter-spacing: -0.3px;
    }

    h3 {
        font-size: 18px;
        font-weight: 700;
        color: #2c3e50;
        margin: 14px 0 6px 0 !important;
        letter-spacing: -0.2px;
    }

    [data-testid="stMarkdownContainer"] + [data-testid="stMarkdownContainer"] h1,
    [data-testid="stMarkdownContainer"] + [data-testid="stMarkdownContainer"] h2,
    [data-testid="stMarkdownContainer"] + [data-testid="stMarkdownContainer"] h3 {
        margin-top: 20px !important;
    }

    caption, .stCaption {
        font-size: 13px;
        color: #5a7a8a;
        font-weight: 500;
        margin-top: 6px;
    }

    /* ─────────────────────────── Subheader Styling ─────────────────────────── */
    [data-testid="stMarkdownContainer"] p {
        margin-bottom: 14px;
        line-height: 1.6;
        color: #2c3e50;
    }

    /* ─────────────────────────── Search & Input Enhancement ─────────────────────────── */
    [data-testid="stTextInput"],
    [data-testid="stNumberInput"],
    [data-testid="stSelectbox"],
    [data-testid="stSlider"] {
        margin-bottom: 12px;
    }

    [data-testid="stTextInput"] input,
    [data-testid="stNumberInput"] input,
    [data-testid="stSelectbox"] select {
        border: 1px solid rgba(0, 119, 182, 0.3) !important;
        border-radius: 8px !important;
        padding: 10px 12px !important;
        background: rgba(255, 255, 255, 0.95) !important;
        color: #2c3e50 !important;
        font-size: 13px;
        transition: all 0.3s ease;
    }

    [data-testid="stTextInput"] input:focus,
    [data-testid="stNumberInput"] input:focus,
    [data-testid="stSelectbox"] select:focus {
        border-color: #0099cc !important;
        box-shadow: 0 0 0 3px rgba(0, 153, 204, 0.12) !important;
        background: rgba(0, 153, 204, 0.02) !important;
    }

    /* ─────────────────────────── Alert & Message Styling ─────────────────────────── */
    [data-testid="stAlert"] {
        border-radius: 10px;
        border-left: 4px solid;
        padding: 14px 16px;
        margin: 12px 0;
        font-size: 13px;
    }

    [data-testid="stAlert"][data-alert-type="success"] {
        background: rgba(16, 185, 129, 0.08);
        border-color: #10b981;
        color: #065f46;
    }

    [data-testid="stAlert"][data-alert-type="error"] {
        background: rgba(239, 68, 68, 0.08);
        border-color: #ef4444;
        color: #7f1d1d;
    }

    [data-testid="stAlert"][data-alert-type="warning"] {
        background: rgba(245, 158, 11, 0.08);
        border-color: #f59e0b;
        color: #78350f;
    }

    [data-testid="stAlert"][data-alert-type="info"] {
        background: rgba(59, 130, 246, 0.08);
        border-color: #3b82f6;
        color: #1e3a8a;
    }

    /* ─────────────────────────── Table Enhancements ─────────────────────────── */
    table thead {
        background: linear-gradient(to right, rgba(0, 119, 182, 0.1), rgba(0, 153, 204, 0.08));
    }

    table tbody tr {
        border-bottom: 1px solid rgba(0, 119, 182, 0.1);
        transition: background 0.2s ease;
    }

    table tbody tr:hover {
        background: rgba(0, 153, 204, 0.05);
    }

    table tbody tr:last-child {
        border-bottom: 2px solid rgba(0, 119, 182, 0.15);
    }

    /* ─────────────────────────── Column Layouts ─────────────────────────── */
    [data-testid="stColumnBlock"] > div {
        padding: 0 8px;
    }

    [data-testid="stColumnBlock"] > div:first-child {
        padding-left: 0;
    }

    [data-testid="stColumnBlock"] > div:last-child {
        padding-right: 0;
    }

    /* ─────────────────────────── Divider Styling ─────────────────────────── */
    .stDivider {
        margin: 20px 0;
        border-top: 1px solid rgba(0, 119, 182, 0.15) !important;
    }

    /* ─────────────────────────── Expander Styling ─────────────────────────── */
    .stExpander {
        border: 1px solid rgba(0, 119, 182, 0.2);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.8);
        transition: all 0.3s ease;
    }

    .stExpander:hover {
        border-color: rgba(0, 153, 204, 0.3);
        box-shadow: 0 2px 8px rgba(0, 119, 182, 0.08);
    }

    [data-testid="stExpanderDetails"] {
        padding: 12px 16px;
    }

    /* ─────────────────────────── Metric Cards Enhancement ─────────────────────────── */
    div[data-testid="stMetric"] {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(232, 244, 248, 0.6) 100%);
        border: 2px solid #00a8d8;
        border-radius: 12px;
        padding: 16px 18px;
        box-shadow: 0 2px 10px rgba(0, 119, 182, 0.1);
        transition: all 0.3s ease;
    }

    div[data-testid="stMetric"]:hover {
        border-color: #0099cc;
        box-shadow: 0 4px 16px rgba(0, 119, 182, 0.15);
        transform: translateY(-2px);
    }

    div[data-testid="stMetric"] > div:first-child {
        color: #0077bb;
        font-weight: 700;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    div[data-testid="stMetric"] > div:nth-child(2) {
        color: #1a3a50;
        font-weight: 800;
        font-size: 32px;
        margin: 4px 0;
    }

    div[data-testid="stMetric"] > div:last-child {
        font-size: 12px;
        color: #5a7a8a;
    }

    /* ─────────────────────────── Spinner and Loading ─────────────────────────── */
    .stSpinner {
        color: #0099cc;
    }

    /* ─────────────────────────── Scrollbar Styling ─────────────────────────── */
    ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    ::-webkit-scrollbar-track {
        background: rgba(0, 119, 182, 0.05);
    }

    ::-webkit-scrollbar-thumb {
        background: rgba(0, 119, 182, 0.3);
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 119, 182, 0.5);
    }

    /* ─────────────────────────── Content Spacing ─────────────────────────── */
    .stVerticalBlock {
        gap: 12px;
    }

    .stHorizontalBlock {
        gap: 12px;
    }

    /* ─────────────────────────── Image Styling ─────────────────────────── */
    [data-testid="stImage"] {
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid rgba(0, 119, 182, 0.15);
        box-shadow: 0 4px 12px rgba(0, 119, 182, 0.1);
    }

    /* ─────────────────────────── JSON Display ─────────────────────────── */
    [data-testid="stJson"] {
        background: rgba(255, 255, 255, 0.8);
        border-radius: 8px;
        border: 1px solid rgba(0, 119, 182, 0.15);
        padding: 12px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def api(method: str, path: str, **kwargs):
    """Call the FastAPI backend. Returns (data, error_str)."""
    try:
        response = requests.request(method, f"{API_BASE}{path}", timeout=30, **kwargs)
        if response.ok:
            try:
                return response.json(), None
            except Exception:
                return {}, None
        else:
            try:
                detail = response.json().get("detail", response.text)
            except Exception:
                detail = response.text
            return None, f"HTTP {response.status_code}: {detail}"
    except requests.exceptions.ConnectionError:
        return None, "⚠️ Cannot reach API at http://127.0.0.1:8000 — make sure the backend is running."
    except Exception as exc:
        return None, str(exc)


def success(msg): st.success(msg)
def error(msg):   st.error(msg)
def info(msg):    st.info(msg)


def stat_row(items: list[tuple]):
    cols = st.columns(len(items))
    for col, (label, value, delta) in zip(cols, items):
        col.metric(label, value, delta)


def trend_delta(state_key: str, current_value: int) -> str:
    prev = st.session_state.get(state_key)
    st.session_state[state_key] = current_value
    if prev is None:
        return ""
    diff = current_value - prev
    if diff > 0:
        return f"↑ {diff}"
    if diff < 0:
        return f"↓ {abs(diff)}"
    return "→ 0"


def export_csv_button(df: pd.DataFrame, filename: str, label: str = "Export as CSV"):
    csv_data = df.to_csv(index=False).encode("utf-8")
    st.download_button(
        label=label,
        data=csv_data,
        file_name=filename,
        mime="text/csv",
        use_container_width=False,
    )


def generate_audit_pdf(audit_id: int, detail: dict) -> bytes | None:
    if not REPORTLAB_OK:
        return None
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 40

    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, f"FMCG Audit Report - ID {audit_id}")
    y -= 24

    c.setFont("Helvetica", 10)
    c.drawString(40, y, f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    y -= 18

    status = detail.get("status", "unknown")
    c.drawString(40, y, f"Status: {status}")
    y -= 18

    rj = detail.get("result_json") or {}
    summary_lines = [
        f"Total Products: {rj.get('total_product_count', '—')}",
        f"Self Count: {rj.get('total_self_count', '—')}",
        f"Competition Count: {rj.get('total_competition_count', '—')}",
        f"Reason: {rj.get('detection_reason', '—')}",
    ]

    for line in summary_lines:
        c.drawString(40, y, line)
        y -= 16

    brand_counts = rj.get("brand_counts") or []
    if brand_counts:
        y -= 6
        c.setFont("Helvetica-Bold", 11)
        c.drawString(40, y, "Brand Counts")
        y -= 16
        c.setFont("Helvetica", 10)
        for brand in brand_counts[:25]:
            c.drawString(48, y, str(brand))
            y -= 14
            if y < 40:
                c.showPage()
                y = height - 40
                c.setFont("Helvetica", 10)

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()


def pending_audit_count(audits_data) -> int:
    if not isinstance(audits_data, list):
        return 0
    return sum(1 for a in audits_data if a.get("status") in {"pending", "processing"})


# ──────────────────────────────────────────────────────────────────────────────
# Sidebar navigation
# ──────────────────────────────────────────────────────────────────────────────

PAGES = [
    "Overview",
    "Product Codes",
    "Products",
    "Models",
    "Run Audit",
    "Audit History",
]

st.session_state.setdefault("scheduled_reports", [])
st.session_state.setdefault("open_pc_create", False)
st.session_state.setdefault("open_prod_create", False)
st.session_state.setdefault("open_model_create", False)

with st.sidebar:
    st.markdown("## 📦 FMCG Insight 360")
    st.caption("Operations & Admin Console")
    st.divider()
    if option_menu:
        page = option_menu(
            menu_title="Analytics",
            options=PAGES,
            icons=["house", "upc-scan", "box-seam", "cpu", "search", "clock-history"],
            menu_icon="graph-up-arrow",
            default_index=0,
            styles={
                "container": {
                    "padding": "12px",
                    "border-radius": "14px",
                    "background": "linear-gradient(180deg, #d4e8f0 0%, #c8e0eb 100%)",
                    "box-shadow": "0 8px 20px rgba(0, 119, 182, 0.12)",
                },
                "menu-title": {
                    "font-size": "18px",
                    "font-weight": "700",
                    "color": "#1a3a50",
                    "padding-bottom": "6px",
                    "letter-spacing": "0.2px",
                },
                "menu-icon": {
                    "color": "#0099cc",
                    "font-size": "20px",
                },
                "icon": {
                    "color": "#0099cc",
                    "font-size": "18px",
                },
                "nav-link": {
                    "font-size": "15px",
                    "font-weight": "600",
                    "text-align": "left",
                    "margin": "6px 0",
                    "padding": "10px 12px",
                    "border-radius": "10px",
                    "color": "#2c3e50",
                    "--hover-color": "#bbd8e3",
                },
                "nav-link-selected": {
                    "background": "linear-gradient(135deg, #0099cc 0%, #00a8d8 100%)",
                    "color": "#ffffff",
                    "font-weight": "700",
                },
            },
        )
    else:
        page = st.radio("Navigate", PAGES, label_visibility="collapsed")
        st.caption("Install streamlit-option-menu for styled sidebar menu.")
    st.divider()
    st.caption("Backend: `http://127.0.0.1:8000`")
    if st.button("🔄 Test Connection", use_container_width=True):
        data, err = api("GET", "/product-codes/?limit=1")
        if err:
            st.error(err)
        else:
            st.success("Backend reachable ✓")

    st.markdown("### Quick Actions")
    qa1, qa2 = st.columns(2)
    if qa1.button("+ Code", use_container_width=True):
        st.session_state["open_pc_create"] = True
        st.session_state["force_page"] = PAGES[1]
        st.rerun()
    if qa2.button("+ Product", use_container_width=True):
        st.session_state["open_prod_create"] = True
        st.session_state["force_page"] = PAGES[2]
        st.rerun()

    qa3, qa4 = st.columns(2)
    if qa3.button("+ Model", use_container_width=True):
        st.session_state["open_model_create"] = True
        st.session_state["force_page"] = PAGES[3]
        st.rerun()
    if qa4.button("Run Audit", use_container_width=True):
        st.session_state["force_page"] = PAGES[4]
        st.rerun()

if "force_page" in st.session_state:
    page = st.session_state.pop("force_page")


def load_product_code_map() -> dict[str, int]:
    data, _ = api("GET", "/product-codes/?limit=500")
    if isinstance(data, list):
        return {f"{d['product_code']} (ID {d['id']})": d["id"] for d in data}
    return {}


@st.dialog("Create Product Code")
def create_product_code_dialog():
    with st.form("dlg_create_pc"):
        pc = st.text_input("Product Code *", placeholder="SKU_1001")
        desc = st.text_area("Description")
        submitted = st.form_submit_button("Create", type="primary")
    if submitted:
        if not pc.strip():
            st.error("Product Code is required.")
            return
        d, err = api("POST", "/product-codes/", json={"product_code": pc.strip(), "description": desc.strip() or None})
        if err:
            st.error(err)
            return
        st.toast(f"Created {d['product_code']}")
        st.rerun()


@st.dialog("Create Product")
def create_product_dialog():
    code_map = load_product_code_map()
    if not code_map:
        st.warning("Create a product code first.")
        return
    with st.form("dlg_create_product"):
        code_sel = st.selectbox("Product Code *", list(code_map.keys()))
        pname = st.text_input("Product Name *")
        brand = st.text_input("Brand")
        category = st.text_input("Category")
        ai_code = st.text_input("AI Code")
        ptype = st.selectbox("Type", ["", "own", "competitor"])
        submitted = st.form_submit_button("Create", type="primary")
    if submitted:
        if not pname.strip():
            st.error("Product Name is required.")
            return
        payload = {
            "product_code_id": code_map[code_sel],
            "product_name": pname.strip(),
            "brand": brand.strip() or None,
            "category": category.strip() or None,
            "ai_code": ai_code.strip() or None,
            "type": ptype or None,
        }
        d, err = api("POST", "/products/", json=payload)
        if err:
            st.error(err)
            return
        st.toast(f"Created {d['product_name']}")
        st.rerun()


@st.dialog("Register Model")
def create_model_dialog():
    code_map = load_product_code_map()
    if not code_map:
        st.warning("Create a product code first.")
        return
    with st.form("dlg_create_model"):
        code_sel = st.selectbox("Product Code *", list(code_map.keys()))
        mname = st.text_input("Model Name *")
        mpath = st.text_input("Model Path *")
        c1, c2, c3 = st.columns(3)
        img_size = c1.number_input("Image Size", value=1280, min_value=320, max_value=2048, step=32)
        conf_thr = c2.slider("Conf Threshold", 0.0, 1.0, 0.25, 0.01)
        iou_thr = c3.slider("IOU Threshold", 0.0, 1.0, 0.45, 0.01)
        submitted = st.form_submit_button("Register", type="primary")
    if submitted:
        if not mname.strip() or not mpath.strip():
            st.error("Model Name and Path are required.")
            return
        payload = {
            "product_code_id": code_map[code_sel],
            "model_name": mname.strip(),
            "model_path": mpath.strip(),
            "image_size": int(img_size),
            "conf_threshold": conf_thr,
            "iou_threshold": iou_thr,
        }
        d, err = api("POST", "/models/", json=payload)
        if err:
            st.error(err)
            return
        st.toast(f"Registered {d['model_name']}")
        st.rerun()


@st.dialog("Confirm Delete")
def confirm_delete_dialog(entity_label: str, api_path: str):
    st.warning(f"This will permanently delete {entity_label}.")
    a, b = st.columns(2)
    if a.button("Yes, Delete", type="primary", use_container_width=True):
        _, err = api("DELETE", api_path)
        if err:
            st.error(err)
            return
        st.toast(f"Deleted {entity_label}")
        st.rerun()
    if b.button("Cancel", use_container_width=True):
        st.rerun()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Overview
# ──────────────────────────────────────────────────────────────────────────────

if page == PAGES[0]:
    st.title("FMCG Insight 360")
    st.caption("Product detection & audit platform — admin console")

    codes_data,  _ = api("GET", "/product-codes/?limit=200")
    prods_data,  _ = api("GET", "/products/?limit=200")
    models_data, _ = api("GET", "/models/?limit=200")
    audits_data, _ = api("GET", "/audit/?limit=50")

    n_codes = len(codes_data) if isinstance(codes_data, list) else 0
    n_prods = len(prods_data) if isinstance(prods_data, list) else 0
    n_models = len(models_data) if isinstance(models_data, list) else 0
    n_pending = pending_audit_count(audits_data)

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Total Codes", n_codes, trend_delta("trend_codes", n_codes))
    col2.metric("Total Products", n_prods, trend_delta("trend_products", n_prods))
    col3.metric("Total Models", n_models, trend_delta("trend_models", n_models))
    col4.metric("Pending Audits", n_pending, trend_delta("trend_pending", n_pending))

    st.divider()

    lcol, rcol = st.columns(2)

    with lcol:
        st.subheader("Recent Product Codes")
        if isinstance(codes_data, list) and codes_data:
            df = pd.DataFrame(codes_data)[["id", "product_code", "description", "created_at"]]
            df["created_at"] = pd.to_datetime(df["created_at"]).dt.strftime("%Y-%m-%d")
            st.dataframe(df.head(10), use_container_width=True, hide_index=True)
            export_csv_button(df, "recent_product_codes.csv")
        else:
            info("No product codes yet.")

    with rcol:
        st.subheader("Recent Models")
        if isinstance(models_data, list) and models_data:
            df = pd.DataFrame(models_data)[["id", "model_name", "product_code_id", "conf_threshold"]]
            st.dataframe(df.head(10), use_container_width=True, hide_index=True)
            export_csv_button(df, "recent_models.csv")
        else:
            info("No models yet.")


# ──────────────────────────────────────────────────────────────────────────────
# Page: Product Codes
# ──────────────────────────────────────────────────────────────────────────────

elif page == PAGES[1]:
    st.title("🏷️ Product Codes")
    st.caption("Create, edit, and delete product codes used during audit submission.")

    st.info("Use the top action bar to create or edit, and manage records from the table section below.")

    with st.container(border=True):
        c1, c2, c3 = st.columns([1.2, 1.8, 1.0])
        if c1.button("➕ New Product Code", use_container_width=True):
            create_product_code_dialog()
        edit_target = c2.text_input("Code to Edit", placeholder="SKU_1001")
        edit_click = c3.button("✏️ Edit", use_container_width=True)

        if edit_click:
            if edit_target.strip():
                existing, err = api("GET", f"/product-codes/by-code/{edit_target.strip()}")
                if err:
                    st.error(err)
                else:
                    @st.dialog("Edit Product Code")
                    def edit_product_code_dialog(code_name: str, existing_row: dict):
                        with st.form("dlg_edit_pc"):
                            new_code = st.text_input("New Code", value=existing_row["product_code"])
                            new_desc = st.text_area("Description", value=existing_row.get("description") or "")
                            submitted = st.form_submit_button("Save", type="primary")
                        if submitted:
                            payload = {"product_code": new_code.strip(), "description": new_desc.strip() or None}
                            _, err2 = api("PUT", f"/product-codes/by-code/{code_name}", json=payload)
                            if err2:
                                st.error(err2)
                                return
                            st.toast("Product code updated")
                            st.rerun()

                    edit_product_code_dialog(edit_target.strip(), existing)
            else:
                st.warning("Enter a code name to edit.")

    with st.container(border=True):
        search_q = st.text_input("Search", placeholder="Type to filter codes…")
        data, err = api("GET", f"/product-codes/?limit=200")
        if err:
            error(err)
        elif isinstance(data, list):
            df = pd.DataFrame(data) if data else pd.DataFrame(columns=["id", "product_code", "description", "created_at"])
            if search_q:
                mask = df["product_code"].str.contains(search_q, case=False, na=False) | \
                       df["description"].fillna("").str.contains(search_q, case=False, na=False)
                df = df[mask]
            if not df.empty:
                df["created_at"] = pd.to_datetime(df["created_at"]).dt.strftime("%Y-%m-%d %H:%M")
            st.dataframe(df, use_container_width=True, hide_index=True)
            b1, b2 = st.columns([1, 1])
            with b1:
                export_csv_button(df, "product_codes.csv")
            with b2:
                del_code = st.selectbox("Delete Code", options=[""] + df["product_code"].tolist()) if not df.empty else ""
                if del_code and st.button("🗑️ Delete Selected", type="primary", use_container_width=True):
                    confirm_delete_dialog(del_code, f"/product-codes/by-code/{del_code}")
            st.caption(f"{len(df)} code(s) shown")

    if st.session_state.pop("open_pc_create", False):
        create_product_code_dialog()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Products
# ──────────────────────────────────────────────────────────────────────────────

elif page == PAGES[2]:
    st.title("📦 Products")
    st.caption("Individual SKU-level product catalog linked to product codes.")

    st.info("Keep products clean by creating/updating from the action bar and using search filters before delete.")

    with st.container(border=True):
        a1, a2, a3 = st.columns([1.2, 1.8, 1.0])
        if a1.button("➕ New Product", use_container_width=True):
            create_product_dialog()
        edit_name = a2.text_input("Product to Edit", placeholder="Product name")
        edit_click = a3.button("✏️ Edit", use_container_width=True)

    if edit_click:
        if edit_name.strip():
            existing, err = api("GET", f"/products/by-name/{edit_name.strip()}")
            if err:
                st.error(err)
            else:
                code_map = load_product_code_map()

                @st.dialog("Edit Product")
                def edit_product_dialog(existing_row: dict):
                    reverse_code = {v: k for k, v in code_map.items()}
                    default_key = reverse_code.get(existing_row.get("product_code_id"), list(code_map.keys())[0] if code_map else "")
                    with st.form("dlg_edit_product"):
                        code_sel = st.selectbox("Product Code", list(code_map.keys()), index=list(code_map.keys()).index(default_key) if default_key in code_map else 0)
                        pname = st.text_input("Product Name", value=existing_row.get("product_name", ""))
                        brand = st.text_input("Brand", value=existing_row.get("brand") or "")
                        category = st.text_input("Category", value=existing_row.get("category") or "")
                        ai_code = st.text_input("AI Code", value=existing_row.get("ai_code") or "")
                        ptype = st.selectbox("Type", ["", "own", "competitor"], index=["", "own", "competitor"].index(existing_row.get("type") or ""))
                        submitted = st.form_submit_button("Save", type="primary")
                    if submitted:
                        payload = {
                            "product_code_id": code_map[code_sel],
                            "product_name": pname.strip(),
                            "brand": brand.strip() or None,
                            "category": category.strip() or None,
                            "ai_code": ai_code.strip() or None,
                            "type": ptype or None,
                        }
                        _, err2 = api("PUT", f"/products/by-name/{edit_name.strip()}", json=payload)
                        if err2:
                            st.error(err2)
                            return
                        st.toast("Product updated")
                        st.rerun()

                edit_product_dialog(existing)
        else:
            st.warning("Enter a product name to edit.")

    with st.container(border=True):
        st.subheader("Search Products")
        c1, c2, c3, c4, c5 = st.columns([1.2, 1.2, 1.2, 1.0, 0.8])
        fname = c1.text_input("Name")
        fbrand = c2.text_input("Brand")
        fcat = c3.text_input("Category")
        ftype = c4.selectbox("Type", ["", "own", "competitor"], key="prod_type_filter")
        do_search = c5.button("Search", type="primary", use_container_width=True)

        params = {}
        if fname:
            params["name"] = fname
        if fbrand:
            params["brand"] = fbrand
        if fcat:
            params["category"] = fcat
        if ftype:
            params["type"] = ftype

    with st.container(border=True):
        st.subheader("Product List")
        data, err = api("GET", "/products/?limit=200")
        if err:
            error(err)
        elif isinstance(data, list):
            df = pd.DataFrame(data) if data else pd.DataFrame(columns=["id", "product_name", "brand", "category", "type", "ai_code", "product_code_id", "created_at"])
            if do_search:
                s_data, s_err = api("GET", "/products/search/", params=params)
                if s_err:
                    st.error(s_err)
                elif isinstance(s_data, list):
                    df = pd.DataFrame(s_data) if s_data else pd.DataFrame(columns=df.columns)
            if not df.empty and "created_at" in df.columns:
                df["created_at"] = pd.to_datetime(df["created_at"]).dt.strftime("%Y-%m-%d")
            st.dataframe(df, use_container_width=True, hide_index=True)
            a_col, d_col = st.columns([1, 1])
            with a_col:
                export_csv_button(df, "products.csv")
            with d_col:
                del_name = st.selectbox("Delete Product", options=[""] + df["product_name"].tolist()) if not df.empty else ""
                if del_name and st.button("🗑️ Delete Product", type="primary", use_container_width=True):
                    confirm_delete_dialog(del_name, f"/products/by-name/{del_name}")
            st.caption(f"{len(df)} product(s)")

    if st.session_state.pop("open_prod_create", False):
        create_product_dialog()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Models
# ──────────────────────────────────────────────────────────────────────────────

elif page == PAGES[3]:
    st.title("🤖 ML Models")
    st.caption("Register and manage YOLO model configurations per product code.")

    st.info("Model operations are grouped by action bar, table view, and safe delete controls.")

    with st.container(border=True):
        a1, a2, a3 = st.columns([1.2, 1.8, 1.0])
        if a1.button("➕ Register Model", use_container_width=True):
            create_model_dialog()
        edit_model_name = a2.text_input("Model to Edit", placeholder="model_name")
        edit_click = a3.button("✏️ Edit", use_container_width=True)

    if edit_click:
        if edit_model_name.strip():
            existing, err = api("GET", f"/models/by-name/{edit_model_name.strip()}")
            if err:
                st.error(err)
            else:
                @st.dialog("Edit Model")
                def edit_model_dialog(existing_row: dict):
                    with st.form("dlg_edit_model"):
                        new_mname = st.text_input("Model Name", value=existing_row["model_name"])
                        new_mpath = st.text_input("Model Path", value=existing_row["model_path"])
                        c1, c2, c3 = st.columns(3)
                        new_img = c1.number_input("Image Size", value=int(existing_row["image_size"]), min_value=320, max_value=2048, step=32)
                        new_conf = c2.slider("Conf Threshold", 0.0, 1.0, float(existing_row["conf_threshold"]), 0.01)
                        new_iou = c3.slider("IOU Threshold", 0.0, 1.0, float(existing_row["iou_threshold"]), 0.01)
                        submitted = st.form_submit_button("Save", type="primary")
                    if submitted:
                        payload = {
                            "model_name": new_mname.strip(),
                            "model_path": new_mpath.strip(),
                            "image_size": int(new_img),
                            "conf_threshold": new_conf,
                            "iou_threshold": new_iou,
                        }
                        _, err2 = api("PUT", f"/models/by-name/{edit_model_name.strip()}", json=payload)
                        if err2:
                            st.error(err2)
                            return
                        st.toast("Model updated")
                        st.rerun()

                edit_model_dialog(existing)
        else:
            st.warning("Enter a model name to edit.")

    with st.container(border=True):
        data, err = api("GET", "/models/?limit=200")
        if err:
            error(err)
        elif isinstance(data, list):
            df = pd.DataFrame(data) if data else pd.DataFrame(
                columns=["id", "model_name", "product_code_id", "model_path", "image_size", "conf_threshold", "iou_threshold", "created_at"]
            )
            if not df.empty and "created_at" in df.columns:
                df["created_at"] = pd.to_datetime(df["created_at"]).dt.strftime("%Y-%m-%d")
            st.dataframe(df, use_container_width=True, hide_index=True)
            a_col, d_col = st.columns([1, 1])
            with a_col:
                export_csv_button(df, "models.csv")
            with d_col:
                del_model = st.selectbox("Delete Model", options=[""] + df["model_name"].tolist()) if not df.empty else ""
                if del_model and st.button("🗑️ Delete Model", type="primary", use_container_width=True):
                    confirm_delete_dialog(del_model, f"/models/by-name/{del_model}")
            st.caption(f"{len(df)} model(s)")

    if st.session_state.pop("open_model_create", False):
        create_model_dialog()


# ──────────────────────────────────────────────────────────────────────────────
# Page: Run Audit
# ──────────────────────────────────────────────────────────────────────────────

elif page == PAGES[4]:
    st.title("🔍 Run Audit")
    st.caption("Submit an image for product detection against a registered product code.")

    with st.container(border=True):
        k1, k2, k3 = st.columns(3)
        k1.metric("Realtime Engine", "Active")
        k2.metric("Queue", "Connected")
        k3.metric("Mode", "URL / Upload")

    codes_data, _ = api("GET", "/product-codes/?limit=200")
    if not isinstance(codes_data, list) or not codes_data:
        st.warning("No product codes available. Create at least one product code first.")
        st.stop()

    code_options = {f"{d['product_code']}": d["product_code"] for d in codes_data}

    col_left, col_right = st.columns([1, 1])

    with col_left:
        with st.container(border=True):
            st.subheader("Submit Request")
            mode = st.radio("Image source", ["URL", "Upload"], horizontal=True)
            product_code = st.selectbox("Product Code", list(code_options.keys()))

            audit_id = None
            if mode == "URL":
                image_url = st.text_input("Image URL", placeholder="https://example.com/shelf.jpg")
                if st.button("Run Audit", type="primary", use_container_width=True):
                    if not image_url.strip():
                        error("Image URL is required.")
                    else:
                        with st.spinner("Submitting…"):
                            params = {"product_code": product_code, "image_url": image_url.strip()}
                            d, err = api("GET", "/audit/by-code", params=params)
                        if err:
                            error(err)
                        else:
                            audit_id = d.get("audit_id")
                            st.session_state["last_audit_id"] = audit_id
                            success(f"Submitted — Audit ID **{audit_id}**")
                            st.toast("Audit request submitted")
            else:
                uploaded = st.file_uploader("Upload image", type=["jpg", "jpeg", "png", "webp"])
                if st.button("Run Audit", type="primary", use_container_width=True):
                    if not uploaded:
                        error("Please upload an image.")
                    else:
                        with st.spinner("Uploading & submitting…"):
                            files = {"file": (uploaded.name, uploaded.getvalue(), uploaded.type)}
                            data_form = {"product_code": product_code}
                            d, err = api("POST", "/audit/by-code/upload", data=data_form, files=files)
                        if err:
                            error(err)
                        else:
                            audit_id = d.get("audit_id")
                            st.session_state["last_audit_id"] = audit_id
                            success(f"Submitted — Audit ID **{audit_id}**")
                            st.toast("Audit upload submitted")

    with col_right:
        with st.container(border=True):
            st.subheader("Live Result")
            poll_id = st.session_state.get("last_audit_id")

        if poll_id:
            st.caption(f"Audit ID: `{poll_id}`")
            poll_placeholder = st.empty()
            result_placeholder = st.empty()
            progress = st.progress(0)

            max_polls = 60
            for i in range(max_polls):
                status_data, err = api("GET", f"/audit/{poll_id}")
                if err:
                    poll_placeholder.error(err)
                    break

                status = status_data.get("status", "unknown")
                poll_placeholder.info(f"Status: **{status}** (poll {i+1}/{max_polls})")
                progress.progress(min((i + 1) / max_polls, 1.0))

                if status in ("completed", "failed"):
                    progress.progress(1.0)
                    if status == "completed":
                        rj = status_data.get("result_json") or {}
                        with result_placeholder.container():
                            c1, c2, c3 = st.columns(3)
                            c1.metric("Total Detected", rj.get("total_product_count", "—"))
                            c2.metric("Self", rj.get("total_self_count", "—"))
                            c3.metric("Competition", rj.get("total_competition_count", "—"))

                            img_url = rj.get("product_image_url")
                            if img_url:
                                full_url = f"http://127.0.0.1:8000{img_url}" if img_url.startswith("/") else img_url
                                try:
                                    resp = requests.get(full_url, timeout=10)
                                    img = Image.open(BytesIO(resp.content))
                                    st.image(img, caption="Annotated output", use_container_width=True)
                                except Exception:
                                    st.caption(f"Image: {full_url}")

                            brands = rj.get("brand_counts", [])
                            if brands:
                                st.write("**Brand Counts**")
                                brand_df = pd.DataFrame(brands)
                                st.dataframe(brand_df, use_container_width=True, hide_index=True)
                                export_csv_button(brand_df, f"audit_{poll_id}_brand_counts.csv")

                            reason = rj.get("detection_reason", "")
                            if reason:
                                st.caption(f"Note: {reason}")

                            pdf_bytes = generate_audit_pdf(int(poll_id), status_data)
                            if pdf_bytes:
                                st.download_button(
                                    "Export Audit PDF",
                                    data=pdf_bytes,
                                    file_name=f"audit_report_{poll_id}.pdf",
                                    mime="application/pdf",
                                    use_container_width=True,
                                )
                            else:
                                st.info("Install reportlab to enable PDF export.")

                            with st.expander("Raw JSON"):
                                st.json(status_data)
                    else:
                        result_placeholder.error(f"Audit failed: {status_data.get('error_message','Unknown error')}")
                    break

                time.sleep(2)
            else:
                poll_placeholder.warning("Timed out waiting for result. Check Audit History.")
        else:
            st.caption("Submit an audit on the left to see the live result here.")


# ──────────────────────────────────────────────────────────────────────────────
# Page: Audit History
# ──────────────────────────────────────────────────────────────────────────────

elif page == PAGES[5]:
    st.title("📋 Audit History")
    st.caption("Browse all audit records stored in the backend database.")

    with st.container(border=True):
        c1, c2, c3 = st.columns([2, 1, 1])
        filter_code = c1.text_input("Filter by product code", placeholder="SKU_1001")
        filter_status = c2.selectbox("Status", ["all", "pending", "processing", "completed", "failed"])
        limit_val = c3.number_input("Max rows", value=100, min_value=10, max_value=500, step=10)

    # Direct DB query via product-code search then per-audit fetch is too slow;
    # instead use the general audit list endpoint with available filters.
    params = {"limit": int(limit_val)}
    if filter_code:  params["product_code"] = filter_code
    if filter_status != "all": params["status"] = filter_status

    data, err = api("GET", "/audit/", params=params)

    if err:
        st.error(err)
    elif isinstance(data, list):
        if not data:
            st.info("No audit records found.")
        else:
            import pandas as pd
            rows = []
            for a in data:
                rows.append({
                    "ID":           a.get("id") or a.get("audit_id"),
                    "Product Code": a.get("product_code") or "—",
                    "Status":       a.get("status"),
                    "Created":      a.get("created_at", ""),
                    "Error":        a.get("error_message") or "",
                })
            df = pd.DataFrame(rows)
            if "Created" in df.columns and df["Created"].any():
                df["Created"] = pd.to_datetime(df["Created"], errors="coerce").dt.strftime("%Y-%m-%d %H:%M")

            with st.container(border=True):
                st.dataframe(df, use_container_width=True, hide_index=True)
                export_csv_button(df, "audit_history.csv")
                st.caption(f"{len(df)} audit(s) loaded")

            st.divider()
            st.subheader("Scheduled Report Generation")
            s1, s2, s3 = st.columns(3)
            schedule_name = s1.text_input("Report Name", value="daily_audit_report")
            cadence = s2.selectbox("Cadence", ["Every 15 min", "Hourly", "Daily"])
            export_type = s3.selectbox("Format", ["CSV", "PDF"])

            if st.button("Add Schedule", use_container_width=True):
                delta_map = {
                    "Every 15 min": timedelta(minutes=15),
                    "Hourly": timedelta(hours=1),
                    "Daily": timedelta(days=1),
                }
                st.session_state["scheduled_reports"].append(
                    {
                        "name": schedule_name.strip() or "scheduled_report",
                        "cadence": cadence,
                        "format": export_type,
                        "next_run": datetime.now() + delta_map[cadence],
                    }
                )
                st.toast("Schedule added")

            schedules = st.session_state.get("scheduled_reports", [])
            if schedules:
                sched_rows = [
                    {
                        "Name": s["name"],
                        "Cadence": s["cadence"],
                        "Format": s["format"],
                        "Next Run": s["next_run"].strftime("%Y-%m-%d %H:%M"),
                    }
                    for s in schedules
                ]
                sched_df = pd.DataFrame(sched_rows)
                st.dataframe(sched_df, use_container_width=True, hide_index=True)
                export_csv_button(sched_df, "scheduled_reports.csv", label="Export Schedules CSV")

            st.divider()
            st.subheader("Inspect Audit")
            inspect_id = st.number_input("Audit ID to inspect", min_value=1, step=1)
            if st.button("Load Audit Detail", type="primary"):
                detail, err2 = api("GET", f"/audit/{int(inspect_id)}")
                if err2:
                    st.error(err2)
                else:
                    st.json(detail)
                    pdf_bytes = generate_audit_pdf(int(inspect_id), detail)
                    if pdf_bytes:
                        st.download_button(
                            "Export as PDF",
                            data=pdf_bytes,
                            file_name=f"audit_report_{int(inspect_id)}.pdf",
                            mime="application/pdf",
                        )
                    rj = detail.get("result_json") or {}
                    img_url = rj.get("product_image_url")
                    if img_url:
                        full_url = f"http://127.0.0.1:8000{img_url}" if img_url.startswith("/") else img_url
                        try:
                            resp = requests.get(full_url, timeout=10)
                            img = Image.open(BytesIO(resp.content))
                            st.image(img, caption=f"Output for Audit {inspect_id}", use_container_width=True)
                        except Exception:
                            st.caption(f"Image URL: {full_url}")
    else:
        st.warning("Unexpected response from /audit/ — endpoint may not support list queries.")
        st.caption("You can still inspect individual audits using the Inspect tool below.")
        st.divider()
        st.subheader("Inspect by ID")
        inspect_id = st.number_input("Audit ID", min_value=1, step=1)
        if st.button("Load", type="primary"):
            detail, err2 = api("GET", f"/audit/{int(inspect_id)}")
            if err2:
                st.error(err2)
            else:
                rj = detail.get("result_json") or {}
                c1, c2, c3 = st.columns(3)
                c1.metric("Total", rj.get("total_product_count", "—"))
                c2.metric("Self",  rj.get("total_self_count", "—"))
                c3.metric("Competition", rj.get("total_competition_count", "—"))
                img_url = rj.get("product_image_url")
                if img_url:
                    full_url = f"http://127.0.0.1:8000{img_url}" if img_url.startswith("/") else img_url
                    try:
                        resp = requests.get(full_url, timeout=10)
                        img = Image.open(BytesIO(resp.content))
                        st.image(img, caption=f"Audit {inspect_id}", use_container_width=True)
                    except Exception:
                        pass
                pdf_bytes = generate_audit_pdf(int(inspect_id), detail)
                if pdf_bytes:
                    st.download_button(
                        "Export as PDF",
                        data=pdf_bytes,
                        file_name=f"audit_report_{int(inspect_id)}.pdf",
                        mime="application/pdf",
                    )
                with st.expander("Full JSON"):
                    st.json(detail)
