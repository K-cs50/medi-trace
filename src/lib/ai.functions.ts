import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const extractedSchema = z.object({
  document_type: z.string(),
  document_date: z.string().nullable(),
  provider: z.string().nullable(),
  medications: z.array(z.object({
    name: z.string(),
    strength: z.string().nullable(),
    frequency: z.string().nullable(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    source_page: z.number().nullable(),
  })),
  lab_results: z.array(z.object({
    label: z.string(),
    value: z.string(),
    unit: z.string().nullable(),
    source_page: z.number().nullable(),
  })),
  conditions: z.array(z.object({ label: z.string(), source_page: z.number().nullable() })),
  procedures: z.array(z.object({ label: z.string(), source_page: z.number().nullable() })),
  notes: z.array(z.object({ label: z.string(), source_page: z.number().nullable() })),
});

export type ExtractedDocument = z.infer<typeof extractedSchema>;

const extractInput = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  dataUrl: z.string(),
});

export const extractMedicalDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => extractInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Lovable AI is not configured for this workspace.");

    const gateway = createLovableAiGatewayProvider(apiKey);
    const documentPart = data.mimeType === "application/pdf"
      ? { type: "file" as const, data: data.dataUrl, mediaType: data.mimeType, filename: data.fileName }
      : { type: "image" as const, image: data.dataUrl, mediaType: data.mimeType };

    const result = await generateText({
      model: gateway("google/gemini-3.7-flash"),
      output: Output.object({ schema: extractedSchema }),
      prompt: `You are MedLens, a medical information extraction assistant. Analyze the attached document ${data.fileName}. Return only information explicitly visible in the source. Never diagnose, prescribe, infer missing dates, invent values, or add reference ranges. If absent, use null or an empty array. Page numbers must be included only when visible or reliably available. Keep the output concise.`,
      messages: [{
        role: "user" as const,
        content: [
          { type: "text", text: "Extract the requested structured medical information from this source document." },
          documentPart,
        ],
      }],
    });

    return extractedSchema.parse(result.output);
  });

const summaryInput = z.object({
  records: z.array(z.object({ label: z.string(), value: z.string(), unit: z.string().nullable(), record_type: z.string() })),
  medications: z.array(z.object({ name: z.string(), strength: z.string().nullable(), frequency: z.string().nullable() })),
});

export const generateMedicalSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => summaryInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Lovable AI is not configured for this workspace.");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const result = await generateText({
      model: gateway("google/gemini-3.7-flash"),
      prompt: `You are writing a safe clinical information summary for a patient record. Start exactly with "Based on the uploaded records,...". Use only the validated JSON below. Do not diagnose, prescribe, recommend changing medication, or make medical conclusions. Mention when a field is not available in source. Keep it to 3 short sentences and use neutral language. Validated records: ${JSON.stringify(data)}`,
    });
    return { summary: result.text };
  });