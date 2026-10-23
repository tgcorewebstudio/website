/**
 * TG Core — website intake backend (Google Apps Script, free)
 *
 * Every "Text us" website message:
 *   - emails tgcore.webstudio@gmail.com right away (Reply goes straight to the visitor
 *     when they left an email) and logs it on the "Messages" tab
 *
 * Every "Submit your company" form submission:
 *   1. adds a row to the "Submissions" tab of your Google Sheet
 *   2. emails tgcore.webstudio@gmail.com (hit Reply to answer the client)
 *   3. sends the client a branded "we got it" confirmation
 *   4. puts a 30-minute "Review" follow-up on your Google Calendar
 *
 * SETUP (about 5 minutes, signed in as tgcore.webstudio@gmail.com)
 *   1. Go to sheets.google.com → Blank spreadsheet → name it "TG Core Leads".
 *   2. Extensions → Apps Script. Delete the sample code, paste this whole file, Save.
 *   3. Deploy → New deployment → gear icon → Web app.
 *        Execute as: Me      Who has access: Anyone
 *      Click Deploy and approve the permissions (Sheets, Gmail, Calendar).
 *   4. Copy the Web app URL (ends in /exec) and paste it into
 *      APPS_SCRIPT_URL at the top of main.js on the website.
 *   5. Optional: run testSetup() once from the editor to check everything works.
 *
 * After editing this script later: Deploy → Manage deployments → edit → Version: New version.
 */

const NOTIFY_EMAIL = "tgcore.webstudio@gmail.com";
const SHEET_NAME = "Submissions";
const TIMEZONE = "America/Phoenix";
const SEND_CLIENT_CONFIRMATION = true;
const CREATE_CALENDAR_FOLLOWUP = true;

const COLUMNS = [
  ["Received", "received"], ["Status", "status"], ["Name", "name"], ["Email", "email"], ["Phone", "phone"],
  ["Company", "company"], ["Industry", "industry"], ["Website", "website"], ["Location", "location"],
  ["Services", "services"], ["Budget", "budget"], ["Package", "plan"], ["Goals", "goals"],
];

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (data._gotcha) return json({ ok: true }); // honeypot: silently ignore bots
    if (data.type === "message") return handleMessage(data);
    if (!data.name || !data.email || !data.company) return json({ ok: false, error: "Missing required fields" });

    data.received = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm");
    data.status = "New";
    saveRow(data);
    notifyTeam(data);
    if (SEND_CLIENT_CONFIRMATION) confirmClient(data);
    if (CREATE_CALENDAR_FOLLOWUP) addFollowUp(data);
    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: "TG Core intake" });
}

function handleMessage(data) {
  if (!data.name || !data.contact || !data.message) return json({ ok: false, error: "Missing required fields" });
  const contact = String(data.contact).trim();
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const received = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Messages") || ss.insertSheet("Messages");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Received", "Status", "Name", "Contact", "Message"]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#0b2447").setFontColor("#ffffff");
  }
  sheet.appendRow([received, "New", data.name, contact, data.message].map((v) => "'" + String(v).slice(0, 5000)));

  const replyHow = isEmail
    ? `Just hit <b>Reply</b> — it goes to ${esc(contact)}.`
    : `Reply by text or call: <a href="sms:${esc(contact.replace(/[^\d+]/g, ""))}">${esc(contact)}</a>`;
  const mail = {
    to: NOTIFY_EMAIL,
    subject: `New website message from ${data.name}`,
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#0b2447;margin:0 0 12px">New message from ${esc(data.name)}</h2>
      <p style="white-space:pre-wrap;padding:14px;border-left:3px solid #6fb2ff;background:#f3f7fd">${esc(data.message)}</p>
      <p><b>Contact:</b> ${esc(contact)}<br><span style="color:#7d8fab">${received} Arizona time</span></p>
      <p>${replyHow}</p></div>`,
  };
  if (isEmail) mail.replyTo = contact;
  MailApp.sendEmail(mail);
  return json({ ok: true });
}

function saveRow(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map((c) => c[0]));
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight("bold").setBackground("#0b2447").setFontColor("#ffffff");
    sheet.getRange("B2:B").setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(["New", "Reviewing", "Contacted", "Proposal sent", "Won", "Lost"]).build()
    );
  }
  // Prefix with ' so values like "=..." are stored as plain text, never formulas
  sheet.appendRow(COLUMNS.map(([, key]) => "'" + String(data[key] || "").slice(0, 5000)));
}

function notifyTeam(data) {
  const rows = COLUMNS.filter(([, k]) => k !== "status")
    .map(([label, k]) => `<tr><td style="padding:6px 12px;color:#7d8fab">${label}</td><td style="padding:6px 12px">${esc(data[k] || "—")}</td></tr>`)
    .join("");
  MailApp.sendEmail({
    to: NOTIFY_EMAIL,
    replyTo: data.email,
    subject: `New company submission: ${data.company}`,
    htmlBody: `<div style="font-family:Arial,sans-serif"><h2 style="color:#0b2447">New submission from ${esc(data.company)}</h2>
      <table style="border-collapse:collapse">${rows}</table>
      <p><a href="${SpreadsheetApp.getActiveSpreadsheet().getUrl()}">Open the leads sheet</a></p></div>`,
  });
}

function confirmClient(data) {
  MailApp.sendEmail({
    to: data.email,
    replyTo: NOTIFY_EMAIL,
    name: "TG Core",
    subject: "We received your submission — TG Core",
    htmlBody: `<div style="font-family:Arial,sans-serif;max-width:560px">
      <h2 style="color:#0b2447">Thank you, ${esc(data.name)}!</h2>
      <p>We received the details for <b>${esc(data.company)}</b>. Our team reviews every submission personally and will reply within 1–2 business days with ideas and a plan.</p>
      <p>Questions in the meantime? Reply to this email or call/text <a href="tel:+14806670415">+1 (480) 667-0415</a>.</p>
      <p style="color:#7d8fab">— TG Core · Tempe, Arizona</p></div>`,
  });
}

function addFollowUp(data) {
  // Next weekday at 10:00 Arizona time
  const start = new Date();
  start.setDate(start.getDate() + 1);
  while ([0, 6].includes(Number(Utilities.formatDate(start, TIMEZONE, "u")) % 7)) start.setDate(start.getDate() + 1);
  const day = Utilities.formatDate(start, TIMEZONE, "yyyy-MM-dd");
  const begin = new Date(`${day}T10:00:00-07:00`);
  const end = new Date(begin.getTime() + 30 * 60 * 1000);
  CalendarApp.getDefaultCalendar().createEvent(`Review: ${data.company} (${data.plan || "package TBD"})`, begin, end, {
    description: COLUMNS.map(([label, k]) => `${label}: ${data[k] || "—"}`).join("\n"),
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** Run once from the editor to verify permissions: logs a test message + submission, emails you, creates an event. */
function testSetup() {
  doPost({ postData: { contents: JSON.stringify({ type: "message", name: "Test Visitor", contact: NOTIFY_EMAIL, message: "Setup test message — safe to delete." }) } });
  doPost({ postData: { contents: JSON.stringify({
    name: "Test Client", email: NOTIFY_EMAIL, phone: "+1 480 000 0000", company: "Test Company",
    industry: "Other", plan: "Growth", budget: "$1,000–$2,500", services: "New website", goals: "Setup test — safe to delete.",
  }) } });
}
