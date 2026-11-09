import { z } from "zod";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const URGENCY_LEVELS = ["routine", "urgent", "critical"] as const;

export const structuredRequestSchema = z.object({
	blood_group: z.enum(BLOOD_GROUPS),
	units_needed: z.number().int().min(1).max(10),
	hospital_name: z.string().min(2).max(120),
	patient_name: z.string().min(2).max(80).optional(),
	needed_by: z.string().datetime().optional().nullable(),
	urgency: z.enum(URGENCY_LEVELS).default("urgent"),
	notes: z.string().max(500).optional(),
	contact_phone: z.string().optional(),
});

export type StructuredRequest = z.infer<typeof structuredRequestSchema>;

export const createRequestInputSchema = z.object({
	source: z.enum(["form", "paste", "voice"]),
	raw_input: z.string().min(1).max(4000),
	// Blood group is required for every request; other structured fields may be extracted or omitted.
	blood_group: z.enum(BLOOD_GROUPS, { error: "Please select a valid blood group" }),
	units_needed: z.coerce.number().int().min(1).max(10).optional(),
	hospital_name: z.string().optional(),
	patient_name: z.string().optional(),
	needed_by: z.string().optional(),
	urgency: z.enum(URGENCY_LEVELS).optional(),
	notes: z.string().optional(),
});
