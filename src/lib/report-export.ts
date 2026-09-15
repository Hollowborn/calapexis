import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import type { Visitor } from "$lib/types";

export interface DocxColumnsConfig {
  fullName?: boolean;
  officeName?: boolean;
  purpose?: boolean;
  checkInTime?: boolean;
  checkOutTime?: boolean;
}

export interface DocxExportOptions {
  reportTitle?: string;
  scopeLabel?: string;
  dateRange?: string;
  generatedBy?: string;
  templateUrl?: string;
  filename?: string;
  columns?: DocxColumnsConfig;
}

export interface PrintableVisitorRecord {
  index: number;
  fullName: string;
  officeName: string;
  purpose: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  date: string;
  rawCheckInTime?: string;
}

interface VisitorDateGroup {
  dateStr: string;
  dateLabel: string;
  visitors: PrintableVisitorRecord[];
}

function groupVisitorsForDocx(
  visitors: PrintableVisitorRecord[],
): VisitorDateGroup[] {
  const map = new Map<
    string,
    { label: string; list: PrintableVisitorRecord[] }
  >();

  for (const v of visitors) {
    let dateStr = "Unscheduled";
    let dateLabel = "Unscheduled Logs";

    if (v.rawCheckInTime) {
      try {
        const d = new Date(v.rawCheckInTime);
        dateStr = d.toISOString().split("T")[0];
        dateLabel = d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        dateStr = "Unscheduled";
      }
    }

    if (!map.has(dateStr)) {
      map.set(dateStr, { label: dateLabel, list: [] });
    }
    map.get(dateStr)!.list.push(v);
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
  return sortedKeys.map((k) => ({
    dateStr: k,
    dateLabel: map.get(k)!.label,
    visitors: map.get(k)!.list,
  }));
}

function escapeXml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "-";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatCheckOut(
  checkInTime?: string | null,
  checkOutTime?: string | null,
  status?: string | null,
): string {
  if (status === "checked_in") return "Active / Checked In";
  if (checkOutTime) return formatTime(checkOutTime);
  if (checkInTime) {
    const autoOut = new Date(
      new Date(checkInTime).getTime() + 1800000,
    ).toISOString();
    return formatTime(autoOut);
  }
  return "-";
}

/**
 * Builds standard OOXML elements for the document body when the template body has no placeholder tags.
 * Dynamically includes only active columns as configured in options.columns and stretches 100% full width.
 */
function buildDocxBodyXml(
  visitors: PrintableVisitorRecord[],
  options: DocxExportOptions,
  nowFormatted: string,
): string {
  const scope = escapeXml(options.scopeLabel || "ALL RECORDS");
  const total = visitors.length;

  const columnDefs = [
    {
      key: "fullName",
      label: "Visitor Name",
      align: "left",
      isBold: true,
      font: "Arial",
      weight: 30,
      padLeft: "120",
      padRight: "120",
      getVal: (v: PrintableVisitorRecord) => v.fullName,
    },
    {
      key: "officeName",
      label: "Office / Desk",
      align: "left",
      isBold: false,
      font: "Arial",
      weight: 25,
      padLeft: "120",
      padRight: "120",
      getVal: (v: PrintableVisitorRecord) => v.officeName,
    },
    {
      key: "purpose",
      label: "Purpose of Visit",
      align: "left",
      isBold: false,
      font: "Arial",
      weight: 25,
      padLeft: "120",
      padRight: "120",
      getVal: (v: PrintableVisitorRecord) => v.purpose,
    },
    {
      key: "checkInTime",
      label: "Time In",
      align: "center",
      isBold: false,
      font: "Consolas",
      weight: 10,
      padLeft: "100",
      padRight: "100",
      getVal: (v: PrintableVisitorRecord) => v.checkInTime,
    },
    {
      key: "checkOutTime",
      label: "Time Out",
      align: "center",
      isBold: false,
      font: "Consolas",
      weight: 10,
      padLeft: "100",
      padRight: "100",
      getVal: (v: PrintableVisitorRecord) => v.checkOutTime,
    },
  ];

  const activeCols = columnDefs.filter((col) =>
    options.columns
      ? options.columns[col.key as keyof DocxColumnsConfig] !== false
      : true,
  );
  const colCount = Math.max(1, activeCols.length);

  const totalWeight = activeCols.reduce((sum, c) => sum + c.weight, 0) || 1;
  // Word OOXML percentage units: 5000 = 100%
  const activeColsWithPct = activeCols.map((col) => {
    const pct = Math.round((col.weight / totalWeight) * 5000);
    return { ...col, pctWidth: pct };
  });

  let rowsXml = "";
  // Header row
  rowsXml += `<w:tr>
		<w:trPr>
			<w:tblHeader/>
			<w:cantSplit/>
		</w:trPr>
		${activeColsWithPct
      .map(
        (col) => `
			<w:tc>
				<w:tcPr>
					<w:tcW w:w="${col.pctWidth}" w:type="pct"/>
					<w:shd w:fill="F4F4F5"/>
					<w:tcMar>
						<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
						<w:left w:w="${col.padLeft}" w:type="dxa"/><w:right w:w="${col.padRight}" w:type="dxa"/>
					</w:tcMar>
				</w:tcPr>
				<w:p>
					<w:pPr><w:jc w:val="${col.align}"/></w:pPr>
					<w:r>
						<w:rPr><w:b/><w:sz w:val="18"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>
						<w:t>${escapeXml(col.label)}</w:t>
					</w:r>
				</w:p>
			</w:tc>
		`,
      )
      .join("")}
	</w:tr>`;

  const groups = groupVisitorsForDocx(visitors);

  if (visitors.length === 0) {
    rowsXml += `<w:tr>
			<w:trPr><w:cantSplit/></w:trPr>
			<w:tc>
				<w:tcPr>
					<w:gridSpan w:val="${colCount}"/>
					<w:tcW w:w="5000" w:type="pct"/>
					<w:tcMar><w:top w:w="200" w:type="dxa"/><w:bottom w:w="200" w:type="dxa"/></w:tcMar>
				</w:tcPr>
				<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="71717A"/><w:sz w:val="18"/></w:rPr><w:t>No visitor log records found for the selected date scope.</w:t></w:r></w:p>
			</w:tc>
		</w:tr>`;
  } else {
    for (const group of groups) {
      // Date Group Banner Row
      rowsXml += `<w:tr>
				<w:trPr><w:cantSplit/></w:trPr>
				<w:tc>
					<w:tcPr>
						<w:gridSpan w:val="${colCount}"/>
						<w:tcW w:w="5000" w:type="pct"/>
						<w:shd w:fill="E4E4E7"/>
						<w:tcMar>
							<w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/>
							<w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/>
						</w:tcMar>
					</w:tcPr>
					<w:p>
						<w:pPr>
							<w:jc w:val="left"/>
							<w:spacing w:before="60" w:after="60"/>
						</w:pPr>
						<w:r>
							<w:rPr>
								<w:b/>
								<w:sz w:val="19"/>
								<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
								<w:color w:val="09090B"/>
							</w:rPr>
							<w:t> ${escapeXml(group.dateLabel)}   •   ${group.visitors.length} ${group.visitors.length === 1 ? "Record" : "Records"}</w:t>
						</w:r>
					</w:p>
				</w:tc>
			</w:tr>`;

      for (let i = 0; i < group.visitors.length; i++) {
        const v = group.visitors[i];
        const bg = i % 2 === 1 ? "F9FAFB" : "FFFFFF";
        const cells = activeColsWithPct
          .map(
            (col) => `
					<w:tc>
						<w:tcPr>
							<w:tcW w:w="${col.pctWidth}" w:type="pct"/>
							<w:shd w:fill="${bg}"/>
							<w:tcMar>
								<w:top w:w="90" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/>
								<w:left w:w="${col.padLeft}" w:type="dxa"/><w:right w:w="${col.padRight}" w:type="dxa"/>
							</w:tcMar>
						</w:tcPr>
						<w:p>
							<w:pPr><w:jc w:val="${col.align}"/></w:pPr>
							<w:r>
								<w:rPr>
									${col.isBold ? "<w:b/>" : ""}
									<w:sz w:val="18"/>
									<w:rFonts w:ascii="${col.font}" w:hAnsi="${col.font}"/>
								</w:rPr>
								<w:t>${escapeXml(col.getVal(v))}</w:t>
							</w:r>
						</w:p>
					</w:tc>
				`,
          )
          .join("");
        rowsXml += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr>`;
      }
    }
  }

  return `
		<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="40"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="26"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>OFFICIAL VISITOR COMPLIANCE AUDIT REPORT</w:t></w:r></w:p>
		<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="160"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:color w:val="52525B"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>Report Scope: ${scope}   •   Total Entries: ${total}   •   Generated: ${escapeXml(nowFormatted)}</w:t></w:r></w:p>
		<w:tbl>
			<w:tblPr>
				<w:tblW w:w="5000" w:type="pct"/>
				<w:jc w:val="center"/>
				<w:tblLayout w:type="autofit"/>
				<w:tblBorders>
					<w:top w:val="single" w:sz="6" w:space="0" w:color="A1A1AA"/>
					<w:left w:val="single" w:sz="6" w:space="0" w:color="A1A1AA"/>
					<w:bottom w:val="single" w:sz="6" w:space="0" w:color="A1A1AA"/>
					<w:right w:val="single" w:sz="6" w:space="0" w:color="A1A1AA"/>
					<w:insideH w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/>
					<w:insideV w:val="single" w:sz="4" w:space="0" w:color="D4D4D8"/>
				</w:tblBorders>
			</w:tblPr>
			${rowsXml}
		</w:tbl>
		<w:p><w:pPr><w:spacing w:before="180"/></w:pPr><w:r><w:rPr><w:i/><w:sz w:val="16"/><w:color w:val="71717A"/></w:rPr><w:t>Certified Official Audit Record • Generated from Calapexis Secure Logbook Master</w:t></w:r></w:p>
	`;
}

/**
 * Populates an existing .docx template file located in static folder with audit log data.
 */
export async function exportAuditLogsToDocx(
  visitors: Visitor[] | any[],
  options: DocxExportOptions = {},
): Promise<{ success: boolean; filename: string; error?: string }> {
  const templateCandidates = [
    options.templateUrl || "/audit_template.docx",
    "/templates/audit_template.docx",
    "/templates/visitor_audit_log_template.docx",
  ];

  let arrayBuffer: ArrayBuffer | null = null;

  for (const url of templateCandidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        arrayBuffer = await res.arrayBuffer();
        break;
      }
    } catch {
      // Try next candidate
    }
  }

  if (!arrayBuffer) {
    throw new Error(
      "Template file not found. Please ensure your Word template is placed in the project as static/audit_template.docx.",
    );
  }

  const zip = new PizZip(arrayBuffer);
  const docXmlFile = zip.file("word/document.xml");
  let docXml = docXmlFile ? docXmlFile.asText() : "";

  const now = new Date();
  const generatedAtStr =
    now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formattedVisitors: PrintableVisitorRecord[] = visitors.map(
    (v, idx) => ({
      index: idx + 1,
      fullName: v.fullName || "-",
      officeName: v.officeName || "General Campus",
      purpose: v.purpose || "-",
      checkInTime: v.checkInTime ? formatTime(v.checkInTime) : "-",
      checkOutTime: formatCheckOut(v.checkInTime, v.checkOutTime, v.status),
      status: v.status === "checked_in" ? "CHECKED-IN" : "COMPLETED",
      date: v.checkInTime ? formatDate(v.checkInTime) : "-",
      rawCheckInTime: v.checkInTime || "",
    }),
  );

  // Check if document.xml has placeholder tags (e.g. {visitors} or {fullName})
  const hasPlaceholderTags =
    docXml.includes("{visitors}") ||
    docXml.includes("{fullName}") ||
    docXml.includes("{#visitors}");

  if (hasPlaceholderTags) {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const templateData = {
      reportTitle:
        options.reportTitle || "OFFICIAL VISITOR COMPLIANCE AUDIT REPORT",
      scopeLabel: options.scopeLabel || "ALL RECORDS",
      dateRange: options.dateRange || formatDate(now.toISOString()),
      generatedAt: generatedAtStr,
      generatedBy: options.generatedBy || "Security Desk Officer",
      totalEntries: visitors.length,
      hasVisitors: visitors.length > 0,
      hasFullName: options.columns?.fullName !== false,
      hasOfficeName: options.columns?.officeName !== false,
      hasPurpose: options.columns?.purpose !== false,
      hasCheckInTime: options.columns?.checkInTime !== false,
      hasCheckOutTime: options.columns?.checkOutTime !== false,
      visitors: formattedVisitors,
    };

    try {
      doc.render(templateData);
    } catch (err: unknown) {
      console.error("Docxtemplater render error:", err);
      throw new Error(
        `Failed to populate Word template tags: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    // Template has header/footer letterheads but blank body -> inject structured table XML before <w:sectPr>
    const tableXml = buildDocxBodyXml(
      formattedVisitors,
      options,
      generatedAtStr,
    );

    if (docXml.includes("<w:sectPr")) {
      // Replace all empty paragraphs in body before <w:sectPr>
      const sectPrIndex = docXml.indexOf("<w:sectPr");
      const bodyStart = docXml.indexOf("<w:body>") + "<w:body>".length;
      const newDocXml =
        docXml.substring(0, bodyStart) +
        tableXml +
        docXml.substring(sectPrIndex);
      zip.file("word/document.xml", newDocXml);
    } else if (docXml.includes("</w:body>")) {
      const bodyEndIndex = docXml.indexOf("</w:body>");
      const newDocXml =
        docXml.substring(0, bodyEndIndex) +
        tableXml +
        docXml.substring(bodyEndIndex);
      zip.file("word/document.xml", newDocXml);
    }
  }

  const outBlob = zip.generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const filename =
    options.filename ||
    `Visitor_Audit_Report_${now.toISOString().slice(0, 10)}.docx`;
  downloadBlob(outBlob, filename);

  return { success: true, filename };
}

/**
 * Exports audit logs directly to PDF using headers, footers, and media logos extracted from the Word template.
 */
export async function exportAuditLogsToPdf(
  visitors: Visitor[] | any[],
  options: DocxExportOptions = {},
): Promise<{ success: boolean; filename: string }> {
  const templateCandidates = [
    options.templateUrl || "/audit_template.docx",
    "/templates/audit_template.docx",
    "/templates/visitor_audit_log_template.docx",
  ];

  let arrayBuffer: ArrayBuffer | null = null;
  for (const url of templateCandidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        arrayBuffer = await res.arrayBuffer();
        break;
      }
    } catch {
      // Continue
    }
  }

  let logoImages: string[] = [];
  if (arrayBuffer) {
    try {
      const zip = new PizZip(arrayBuffer);
      const mediaFiles = Object.keys(zip.files).filter(
        (k) => k.startsWith("word/media/") && /\.(png|jpe?g|svg)$/i.test(k),
      );
      for (const mPath of mediaFiles) {
        const file = zip.file(mPath);
        if (file) {
          const binary = file.asBinary();
          const ext = mPath.split(".").pop()?.toLowerCase() || "png";
          const mime =
            ext === "svg"
              ? "image/svg+xml"
              : `image/${ext === "jpg" ? "jpeg" : ext}`;
          const b64 = btoa(binary);
          logoImages.push(`data:${mime};base64,${b64}`);
        }
      }
    } catch (e) {
      console.warn("Failed to extract images from docx template:", e);
    }
  }

  const now = new Date();
  const generatedAtStr =
    now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

  const formattedVisitors: PrintableVisitorRecord[] = visitors.map(
    (v, idx) => ({
      index: idx + 1,
      fullName: v.fullName || "-",
      officeName: v.officeName || "General Campus",
      purpose: v.purpose || "-",
      checkInTime: v.checkInTime ? formatTime(v.checkInTime) : "-",
      checkOutTime: formatCheckOut(v.checkInTime, v.checkOutTime, v.status),
      status: v.status === "checked_in" ? "CHECKED-IN" : "COMPLETED",
      date: v.checkInTime ? formatDate(v.checkInTime) : "-",
      rawCheckInTime: v.checkInTime || "",
    }),
  );

  const scope = options.scopeLabel || "ALL RECORDS";
  const dateRange = options.dateRange || formatDate(now.toISOString());
  const generatedBy = options.generatedBy || "Security Desk Officer";

  const columnDefs = [
    {
      key: "fullName",
      label: "Visitor Name",
      align: "left",
      isBold: true,
      width: "26%",
    },
    {
      key: "officeName",
      label: "Office / Desk",
      align: "left",
      isBold: false,
      width: "24%",
    },
    {
      key: "purpose",
      label: "Purpose of Visit",
      align: "left",
      isBold: false,
      width: "26%",
    },
    {
      key: "checkInTime",
      label: "Time In",
      align: "center",
      isBold: false,
      width: "12%",
      mono: true,
    },
    {
      key: "checkOutTime",
      label: "Time Out",
      align: "center",
      isBold: false,
      width: "12%",
      mono: true,
    },
  ];

  const activeCols = columnDefs.filter((col) =>
    options.columns
      ? options.columns[col.key as keyof DocxColumnsConfig] !== false
      : true,
  );
  const colCount = Math.max(1, activeCols.length);

  let tableHeaderHtml = activeCols
    .map(
      (c) =>
        `<th style="background-color: #f4f4f5; border: 1px solid #a1a1aa; padding: 7px 9px; font-weight: bold; font-size: 9.5px; text-transform: uppercase; color: #000000; text-align: ${c.align}; width: ${c.width};">${c.label}</th>`,
    )
    .join("");

  const groups = groupVisitorsForDocx(formattedVisitors);
  let tableBodyHtml = "";

  if (groups.length === 0) {
    tableBodyHtml = `<tr><td colspan="${colCount}" style="padding: 24px; text-align: center; color: #71717a; font-style: italic; border: 1px solid #d4d4d8;">No visitor log records found for the selected scope.</td></tr>`;
  } else {
    for (const group of groups) {
      tableBodyHtml += `
        <tr style="background-color: #e4e4e7; border-top: 2px solid #71717a; border-bottom: 1px solid #a1a1aa; page-break-inside: avoid;">
          <td colspan="${colCount}" style="padding: 7px 10px; font-weight: 800; font-size: 11px; color: #09090b; border: 1px solid #d4d4d8;">
             ${group.dateLabel} &nbsp;•&nbsp; <span style="font-weight: 600; font-size: 10px; color: #52525b;">${group.visitors.length} ${group.visitors.length === 1 ? "Record" : "Records"}</span>
          </td>
        </tr>
      `;

      for (let i = 0; i < group.visitors.length; i++) {
        const v = group.visitors[i];
        const bg = i % 2 === 1 ? "#f4f4f5" : "#ffffff";
        let cells = "";
        for (const col of activeCols) {
          let val = "";
          if (col.key === "fullName") val = v.fullName;
          else if (col.key === "officeName") val = v.officeName;
          else if (col.key === "purpose") val = v.purpose;
          else if (col.key === "checkInTime") val = v.checkInTime;
          else if (col.key === "checkOutTime") val = v.checkOutTime;

          const fontStyle = col.mono
            ? "font-family: monospace; font-size: 10px;"
            : "";
          const weightStyle = col.isBold
            ? "font-weight: 700; color: #09090b;"
            : "color: #18181b;";
          cells += `<td style="border: 1px solid #d4d4d8; padding: 6px 9px; text-align: ${col.align}; ${fontStyle} ${weightStyle}">${val}</td>`;
        }
        tableBodyHtml += `<tr style="background-color: ${bg}; border-bottom: 1px solid #e4e4e7; page-break-inside: avoid;">${cells}</tr>`;
      }
    }
  }

  // Try loading /header.png image asset
  let headerImgBase64 = "";
  try {
    const res = await fetch("/header.png");
    if (res.ok) {
      const blob = await res.blob();
      headerImgBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn("Could not load /header.png:", e);
  }

  const logoLeft = logoImages[0] || "";
  const logoRight = logoImages[1] || "";

  const letterheadHtml = headerImgBase64
    ? `
      <div class="letterhead" style="margin-bottom: 12px; padding-bottom: 4px; border-bottom: 2px solid #000000; overflow: hidden; page-break-inside: avoid;">
        <div style="width: 100%; max-height: 125px; overflow: hidden; display: flex; align-items: flex-start;">
          <img src="${headerImgBase64}" style="width: 100%; display: block; object-fit: cover; object-position: top;" alt="Official Letterhead" />
        </div>
      </div>
    `
    : `
      <div class="letterhead" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000000; padding-bottom: 12px; margin-bottom: 14px; page-break-inside: avoid;">
        ${logoLeft ? `<img src="${logoLeft}" style="height: 56px; width: auto; max-width: 70px; object-fit: contain;" alt="Seal" />` : '<div style="width: 50px;"></div>'}
        <div style="text-align: center; flex: 1; padding: 0 12px;">
          <p style="font-size: 9.5px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px; color: #52525b; font-weight: 600;">Republic of the Philippines</p>
          <h1 style="font-size: 14px; font-weight: 900; margin: 2px 0; letter-spacing: 0.5px; text-transform: uppercase; color: #000000;">BOHOL ISLAND STATE UNIVERSITY</h1>
          <p style="font-size: 10.5px; font-weight: 700; margin: 0; text-transform: uppercase; color: #27272a;">Calape Campus • San Isidro, Calape, Bohol</p>
          <p style="font-size: 9px; color: #52525b; margin: 2px 0 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Official Visitor Compliance Audit Report</p>
        </div>
        ${logoRight ? `<img src="${logoRight}" style="height: 56px; width: auto; max-width: 70px; object-fit: contain;" alt="Seal" />` : logoLeft ? `<img src="${logoLeft}" style="height: 56px; width: auto; max-width: 70px; object-fit: contain; opacity: 0;" alt="" />` : '<div style="width: 50px;"></div>'}
      </div>
    `;

  const footerDocCodeHtml = headerImgBase64
    ? `
      <div style="width: 100%; max-height: 25px; overflow: hidden; display: flex; align-items: flex-end;">
        <img src="${headerImgBase64}" style="width: 100%; display: block; object-fit: cover; object-position: bottom;" alt="Document Tracking Code" />
      </div>
    `
    : `
      <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: #71717a; width: 100%;">
        <span>F-ADF-ADM-011 | Rev. 2 | 07/01/24 | Page 1 of 1</span>
        <span>BISU Calape Campus Visitor Logbook</span>
      </div>
    `;

  const reportHtml = `
    ${letterheadHtml}

    <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 600; color: #3f3f46; margin-bottom: 10px; padding: 5px 8px; background: #f4f4f5; border: 1px solid #d4d4d8; border-radius: 4px;">
      <div>Report Scope: <strong style="color: #000;">${scope}</strong> • Date Range: <strong style="color: #000;">${dateRange}</strong></div>
      <div>Total Log Entries: <strong style="color: #000;">${formattedVisitors.length}</strong> • Generated: ${generatedAtStr}</div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10.5px;">
      <thead>
        <tr>${tableHeaderHtml}</tr>
      </thead>
      <tbody>
        ${tableBodyHtml}
      </tbody>
    </table>

    <div class="footer" style="margin-top: 24px; padding-top: 8px; border-top: 1px solid #d4d4d8; page-break-inside: avoid;">
      ${footerDocCodeHtml}
    </div>
  `;

  const outFilename =
    options.filename ||
    `Visitor_Audit_Report_${now.toISOString().slice(0, 10)}.pdf`;

  return await exportHtmlToPdf(reportHtml, outFilename);
}

/**
 * Directly exports an HTML string to a downloadable .pdf file using an isolated iframe sandbox
 * to completely eliminate Tailwind CSS oklch() color parsing incompatibilities.
 */
export async function exportHtmlToPdf(
  htmlContent: string,
  filename?: string,
): Promise<{ success: boolean; filename: string }> {
  const html2pdfModule = await import("html2pdf.js");
  const html2pdf = html2pdfModule.default || html2pdfModule;

  const outFilename =
    filename ||
    `Visitor_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Create an isolated sandbox iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "794px"; // Standard A4 width at 96 DPI
  iframe.style.height = "1123px";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    throw new Error("Unable to create isolated rendering sandbox.");
  }

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8" />
	<title>Visitor Audit Report</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: Arial, Helvetica, sans-serif;
			background-color: #ffffff;
			color: #000000;
			padding: 24px;
			font-size: 11px;
			line-height: 1.4;
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
		.letterhead {
			text-align: center;
			border-bottom: 2px solid #000000;
			padding-bottom: 12px;
			margin-bottom: 16px;
			page-break-inside: avoid;
		}
		.letterhead h1 {
			font-size: 15px;
			font-weight: bold;
			margin-bottom: 4px;
			letter-spacing: 0.5px;
			text-transform: uppercase;
			color: #000000;
		}
		.letterhead h2 {
			font-size: 12px;
			font-weight: bold;
			margin-bottom: 4px;
			text-transform: uppercase;
			color: #27272a;
		}
		.letterhead p {
			font-size: 10px;
			color: #52525b;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-top: 8px;
			font-size: 10.5px;
		}
		thead {
			display: table-header-group;
		}
		tr {
			page-break-inside: avoid;
		}
		th {
			background-color: #f4f4f5;
			border: 1px solid #a1a1aa;
			padding: 7px 9px;
			font-weight: bold;
			font-size: 9.5px;
			text-transform: uppercase;
			color: #000000;
			text-align: left;
		}
		td {
			border: 1px solid #d4d4d8;
			padding: 6px 9px;
			color: #18181b;
		}
		.footer {
			margin-top: 24px;
			padding-top: 10px;
			border-top: 1px solid #d4d4d8;
			font-size: 9.5px;
			color: #71717a;
			display: flex;
			justify-content: space-between;
			font-weight: bold;
			page-break-inside: avoid;
		}
	</style>
</head>
<body>
	${htmlContent}
</body>
</html>`);
  iframeDoc.close();

  // Allow iframe DOM and fonts to settle
  await new Promise((resolve) => setTimeout(resolve, 300));

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename: outFilename,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false,
      onclone: (clonedDoc: Document) => {
        // Strip all external and global stylesheets (including Tailwind v4 oklch variables)
        Array.from(clonedDoc.querySelectorAll("style, link")).forEach((el) =>
          el.remove(),
        );
        const cleanStyle = clonedDoc.createElement("style");
        cleanStyle.textContent = `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #ffffff;
            color: #000000;
            padding: 24px;
            font-size: 11px;
            line-height: 1.4;
          }
          .letterhead {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 12px;
            margin-bottom: 16px;
            page-break-inside: avoid;
          }
          .letterhead h1 {
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 4px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #000000;
          }
          .letterhead h2 {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
            text-transform: uppercase;
            color: #27272a;
          }
          .letterhead p {
            font-size: 10px;
            color: #52525b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 10.5px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background-color: #f4f4f5;
            border: 1px solid #a1a1aa;
            padding: 7px 9px;
            font-weight: bold;
            font-size: 9.5px;
            text-transform: uppercase;
            color: #000000;
            text-align: left;
          }
          td {
            border: 1px solid #d4d4d8;
            padding: 6px 9px;
            color: #18181b;
          }
          .footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #d4d4d8;
            font-size: 9.5px;
            color: #71717a;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            page-break-inside: avoid;
          }
        `;
        clonedDoc.head.appendChild(cleanStyle);
      },
    },
    jsPDF: {
      unit: "mm" as const,
      format: "a4" as const,
      orientation: "portrait" as const,
    },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  try {
    await html2pdf().set(opt).from(iframeDoc.body).save();
  } finally {
    document.body.removeChild(iframe);
  }

  return { success: true, filename: outFilename };
}

/**
 * Triggers a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}
