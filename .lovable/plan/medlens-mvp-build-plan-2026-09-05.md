# MedLens MVP Build Plan

## Goal
Build a working, demo-ready MedLens clinical information organizer around the memorable flow:

```text
Upload → Understand → Verify → Organize → Compare → Summarize
```

The experience will be explicitly non-diagnostic: source gaps show “Not available in source.”, uncertain records show “Review required.”, and all extracted values remain unverified until a user action.

## Product experience
- Replace the starter screen with a polished MedLens workspace and responsive navigation.
- Add the requested screens: landing, register, login, dashboard, patient, documents, document details, medications, timeline, and compare reports.
- Make the dashboard the main demo surface: patient overview, workflow strip, upload action, processing/review counts, recent documents, recent timeline, and a prominent “What changed?” comparison.
- Add document detail review with extracted medications/labs/conditions/procedures/notes, source provenance, page/source labels when available, and VERIFY / EDIT / REJECT actions.
- Add empty, loading, failed, review-required, and unauthorized states without fake success messages.
- Clearly label synthetic demo content and keep user-entered data separate from document-derived data.

## Data, auth, and security
- Enable Lovable Cloud and use its managed authentication for registration, login, logout, protected data access, and token/session handling.
- Create the minimum persistent model: patients, documents, extracted_records, medications, and audit_logs, with user ownership, timestamps, foreign keys, status fields, and row-level access rules. Use the managed auth user entity for accounts rather than duplicating credentials.
- Store uploaded files in private storage, validate PDF/JPG/PNG type and the 20 MB limit, and retain originals when processing fails.
- Keep all AI requests, validation, persistence, and authorization server-side through TanStack server functions. No model keys, database credentials, or privileged clients reach browser code.
- Use Zod schemas as the runtime equivalent of the requested Pydantic validation boundary; reject invalid structured AI output and persist REVIEW REQUIRED instead of unsafe records.

## Gemini-powered workflow
- Use the Lovable AI gateway with the Gemini model `google/gemini-3.7-flash` from server-only code.
- For uploaded PDFs/images, send the original media plus a strict JSON extraction instruction and structured schema containing document type/date/provider, medications, lab results, conditions, procedures, notes, and provenance fields.
- Save only validated extraction results. Every record gets source type DOCUMENT, source document, optional page, and UNVERIFIED status; user-entered profile fields get USER provenance.
- Generate summaries only from validated records, starting with “Based on the uploaded records...” and labeling them AI-GENERATED SUMMARY. Surface gateway failures and provide bounded retry only for retryable statuses.
- Keep sorting, arithmetic, compatibility checks, change calculations, verification state changes, and audit writes deterministic in application code.

## Core screens and interactions
1. Auth: register/login forms with clear duplicate, invalid credential, expired-session, and network error handling.
2. Patient: create/edit a profile with name, date of birth, gender, and contact information, marked USER-ENTERED.
3. Documents: upload, list, filter by processing/verification status, show filename/date/type, and navigate to detail.
4. Document detail: show processing lifecycle, extracted values, provenance drawer/section, and actual verify/edit/reject mutations with audit history.
5. Medications: show name, strength, frequency, dates, source document, and verification state; use “Not specified” for absent source fields and never give treatment advice.
6. Timeline: render upload, processing, extraction, verification, edits, and rejections chronologically from audit logs.
7. Compare: select two compatible lab reports, calculate only available numeric changes deterministically, and show the “WHAT CHANGED?” view with CALCULATED labels and neutral wording.
8. Dashboard: generate the concise AI summary from validated information and expose the complete demo path without requiring hidden setup.

## Demo readiness and verification
- Include clearly marked synthetic sample data/documents so the five-minute demonstration can proceed immediately while preserving the same real upload/review path.
- Exercise registration/login, patient creation, upload validation, processing success/failure, structured validation, provenance display, verify/edit/reject, medication history, timeline, comparison, what-changed calculations, summary generation, and audit history.
- Run the project checks and browser-driven acceptance flow, inspect console/runtime failures, and fix obvious issues before reporting completion.
- Finish with an implementation report covering completed features, final structure, Gemini usage, data model, server APIs, security measures, actual tests, genuine limitations, run commands, and the five-minute demo sequence.

## Technical implementation
- Preserve TanStack Start routing and the existing Tailwind/shadcn-compatible design system; do not introduce React Router, a separate Python/FastAPI service, or unnecessary dependencies.
- Add route files before linking to them and keep shared shell/navigation in the root or a dedicated layout route.
- Use server functions for app-internal mutations and AI calls, with client-side queries for protected data after authentication; keep generated route files untouched.
- Add route-specific head metadata for every content route and maintain accessible labels, semantic headings, keyboard-friendly controls, and responsive layouts.
