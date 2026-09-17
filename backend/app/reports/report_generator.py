"""Module 19 — Report generation. Produces a PDF matching the spec's report layout."""
import datetime
import io

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


def build_report_pdf(project_name: str, run) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.7 * inch, bottomMargin=0.7 * inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontSize=18)
    heading_style = ParagraphStyle("HeadingX", parent=styles["Heading2"], spaceBefore=14, spaceAfter=6)
    normal = styles["Normal"]

    story = []
    story.append(Paragraph("SOFTWARE RISK ASSESSMENT REPORT", title_style))
    story.append(Spacer(1, 6))
    story.append(Paragraph(f"<b>Project:</b> {project_name}", normal))
    story.append(Paragraph(f"<b>Date:</b> {datetime.date.today().strftime('%d %B %Y')}", normal))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey, spaceBefore=10, spaceAfter=10))

    story.append(Paragraph("Overall Assessment", heading_style))
    story.append(Paragraph(f"Risk Score: <b>{run.risk_score}/100</b>", normal))
    story.append(Paragraph(f"Category: <b>{run.risk_category}</b> (ML confidence: {run.ml_confidence})", normal))
    story.append(Paragraph(run.explanation, normal))

    story.append(Paragraph("Security Findings", heading_style))
    sec_table = Table(
        [["Critical", "High", "Medium", "Low", "Hardcoded Secrets"],
         [run.critical_findings, run.high_findings, run.medium_findings, run.low_findings, run.hardcoded_secrets]],
        hAlign="LEFT",
    )
    sec_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    story.append(sec_table)

    story.append(Paragraph("Code Metrics", heading_style))
    story.append(Paragraph(
        f"Files: {run.files_count} &nbsp;&nbsp; LOC: {run.loc} &nbsp;&nbsp; "
        f"Functions: {run.functions_count} &nbsp;&nbsp; Classes: {run.classes_count} &nbsp;&nbsp; "
        f"Avg. Complexity: {run.complexity}",
        normal,
    ))

    story.append(Paragraph("Dependency Analysis", heading_style))
    story.append(Paragraph(
        f"Dependencies: {run.dependencies_count} &nbsp;&nbsp; Potentially outdated/unpinned: {run.outdated_dependencies}",
        normal,
    ))

    story.append(Paragraph("Recommendations", heading_style))
    recs = []
    if run.critical_findings or run.hardcoded_secrets:
        recs.append("Remove hardcoded credentials/secrets and rotate any exposed keys immediately.")
    if run.high_findings:
        recs.append("Review and remediate high-severity findings (injection, unsafe deserialization, dangerous execution).")
    if run.outdated_dependencies:
        recs.append("Update or pin outdated/unpinned dependencies; re-scan after updating.")
    if run.complexity and run.complexity > 15:
        recs.append("Refactor high-complexity functions to improve maintainability and testability.")
    if not recs:
        recs.append("No urgent action items identified; continue routine monitoring and dependency updates.")

    for i, rec in enumerate(recs, start=1):
        story.append(Paragraph(f"{i}. {rec}", normal))

    story.append(Spacer(1, 16))
    story.append(Paragraph(
        "<i>This is an automated first-level assessment intended to help prioritize investigation. "
        "It does not replace professional security testing (e.g. manual review, penetration testing).</i>",
        normal,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()
