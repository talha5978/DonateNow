import { structuredRequestSchema, type StructuredRequest } from "~/schemas/request";
import { ApiError } from "~/utils/errors/ApiError";

function getExtractionSystemPrompt(currentIsoDate: string) {
	return `You are an expert medical request parser for a blood donation app in Pakistan.
Extract structured information from messy WhatsApp messages, Roman Urdu, Urdu, or English.
Current reference timestamp: ${currentIsoDate}

Return ONLY valid JSON matching this schema:
{
  "blood_group": "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-",
  "units_needed": number,
  "hospital_name": string,
  "patient_name": string | null,
  "needed_by": ISO datetime string | null,
  "urgency": "routine" | "urgent" | "critical",
  "notes": string | null,
  "contact_phone": string | null
}

Rules:
- blood_group is mandatory. Normalize "O negative", "O-ve", "O neg" → "O-"
- units_needed: Default to 1 if not explicitly mentioned (e.g., "2 bottle" = 2, "ek bag" = 1)
- patient_name: Extract the name of the patient if mentioned (e.g., "Furqan ka accident", "patient Ali", "For Furqan"). If no name is mentioned, use null.
- needed_by: Convert relative time phrases based on the reference timestamp (${currentIsoDate}):
  * "aj raat" / "tonight" → Today at 21:00:00
  * "aj subah" / "this morning" → Today at 09:00:00
  * "kal raat" / "tomorrow night" → Tomorrow at 21:00:00
  * "foran" / "immediate" / "abhi" → Current timestamp + 2 hours
  * If no time frame is mentioned, use null. Output must be a valid ISO datetime string.
- urgency: "critical" if words like "emergency", "accident", "serious", "dying", "abhi", "foran" appear. "urgent" if needed within 24 hours. Otherwise "routine".
- notes: Capture any extra contextual details like reason ("car accident") or specific requirements.
- If a field is missing, use null. Never invent data.`;
}

export class AiService {
	private accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
	private apiToken = process.env.CLOUDFLARE_API_TOKEN!;
	private baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`;

	private async callModel(model: string, input: any) {
		const res = await fetch(`${this.baseUrl}/${model}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(input),
		});

		if (!res.ok) {
			const err = await res.text();
			throw new ApiError(`Cloudflare AI error: ${err}`, 502);
		}

		return res.json();
	}

	/**
	 * Extract structured blood request from free text
	 */
	async extractRequest(rawText: string): Promise<StructuredRequest> {
		// Pass current ISO date so the LLM can accurately resolve "aj raat", "kal", etc.
		const currentIsoDate = new Date().toISOString();
		const systemPrompt = getExtractionSystemPrompt(currentIsoDate);

		const response = await this.callModel("@cf/meta/llama-3.1-8b-instruct", {
			messages: [
				{ role: "system", content: systemPrompt },
				{ role: "user", content: rawText },
			],
			max_tokens: 600,
		});

		const content = response.result?.response;
		if (!content) {
			throw new ApiError("AI returned empty response", 502);
		}

		console.log("AI raw output:", content);

		let parsed: any;
		try {
			if (typeof content === "object" && content !== null) {
				parsed = content;
			} else {
				const jsonMatch = String(content).match(/\{[\s\S]*\}/);
				const jsonString = jsonMatch ? jsonMatch[0] : String(content);

				try {
					parsed = JSON.parse(jsonString);
				} catch {
					const sanitized = jsonString
						.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // Fix unquoted keys
						.replace(/'([^']*)'/g, '"$1"'); // Fix single quotes

					parsed = JSON.parse(sanitized);
				}
			}
		} catch (err: any) {
			throw new ApiError(`AI returned invalid format: ${err.message}`, 502);
		}

		// Convert any null values to undefined so optional fields pass Zod validation
		const cleanedParsed = Object.fromEntries(
			Object.entries(parsed).map(([k, v]) => [k, v === null ? undefined : v]),
		);

		const result = structuredRequestSchema.safeParse(cleanedParsed);
		if (!result.success) {
			throw new ApiError("AI extraction failed validation", 422, result.error.issues);
		}

		return result.data;
	}

	/**
	 * Speech-to-text using Cloudflare Whisper
	 */
	async speechToText(audio: ArrayBuffer): Promise<string> {
		const response = await this.callModel("@cf/openai/whisper", {
			audio: [...new Uint8Array(audio)],
		});

		const text = response.result?.text;
		if (!text) {
			throw new ApiError("Speech-to-text failed", 502);
		}
		return text;
	}
}
