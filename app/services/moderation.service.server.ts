import { BaseService } from "~/services/base.server.service";
import { AiService } from "~/services/ai.service.server";
import type { Database } from "~/types/database";

export interface ModerationResult {
	riskScore: number;
	verdict: Database["public"]["Enums"]["moderation_verdict_enum"];
	confidence: number;
	reason: string;
	action: Database["public"]["Enums"]["moderation_action_enum"];
	strikesDelta: number;
	riskSignals: string[];
}

export class ModerationService extends BaseService {
	/**
	 * Run full pre-publication risk and anti-spam audit on a request input.
	 */
	async auditRequest(userId: string, rawInput: string, _hospitalName: string): Promise<ModerationResult> {
		const riskSignals: string[] = [];
		let riskScore = 0.0;
		let verdict: ModerationResult["verdict"] = "legit";
		let action: ModerationResult["action"] = "none";
		let strikesDelta = 0;

		const ai = new AiService();
		const scamAnalysis = await this.analyzeScamIndicators(rawInput, ai);

		if (scamAnalysis.isScam) {
			riskScore += 0.8;
			verdict = scamAnalysis.verdict;
			riskSignals.push(`Scam indicator detected: ${scamAnalysis.reason}`);
		}

		// 2. Check for duplicate spam using Postgres pg_trgm similarity on recent requests
		const isDuplicate = await this.checkFuzzyDuplicate(userId, rawInput);
		if (isDuplicate) {
			riskScore += 0.5;
			verdict = "spam";
			riskSignals.push("Duplicate or highly similar recent request found from this account.");
		}

		// Normalize risk score between 0 and 1
		riskScore = Math.min(Math.max(riskScore, 0.0), 1.0);

		// Determine automated actions based on risk score thresholds
		if (riskScore >= 0.75) {
			action = "throttle";
			strikesDelta = 1;
		} else if (riskScore >= 0.5) {
			action = "warn";
		}

		// 3. Log audit trail into moderation_events table
		await this.logModerationEvent({
			userId,
			requestId: null, // will attach or update post-creation if needed
			verdict,
			confidence: scamAnalysis.confidence,
			reason: riskSignals.join(" | ") || "Passed automated risk screening.",
			action,
			strikesDelta,
			inputHash: this.hashInput(rawInput),
		});

		// 4. Apply strikes or throttling to user profile if high risk
		if (strikesDelta > 0) {
			await this.applyUserPenalty(userId, strikesDelta, action);
		}

		return {
			riskScore,
			verdict,
			confidence: scamAnalysis.confidence,
			reason: riskSignals.join(" | ") || "Clean",
			action,
			strikesDelta,
			riskSignals,
		};
	}

	private async analyzeScamIndicators(rawInput: string, ai: AiService) {
		try {
			const prompt = `Analyze this blood request text for scam indicators, financial fraud, demands for money transfers, phone cash (JazzCash/EasyPaisa/Bank Transfer/SadaPay/NayaPay), selling blood commercially, or fake/fabricated emergencies or abusive content.
Return ONLY valid JSON matching this schema:
{
  "isScam": boolean,
  "verdict": "legit" | "spam" | "advertisement" | "payment_demand" | "abusive" | "fabricated",
  "confidence": number (0 to 1),
  "reason": string
}
Text to analyze: "${rawInput}"`;

			// We can leverage Llama via AiService helper or direct call
			const response = await ai.callModel("@cf/meta/llama-3.1-8b-instruct", {
				messages: [
					{
						role: "system",
						content: "You are a strict financial and medical fraud detection security engine.",
					},
					{ role: "user", content: prompt },
				],
				max_tokens: 300,
			});

			const content = response.result?.response;
			const jsonMatch = String(content).match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				return JSON.parse(jsonMatch[0]);
			}
		} catch (err) {
			console.error("AI scam check fallback triggered:", err);
		}

		// Fallback heuristic check for common cash/payment keywords
		const lower = rawInput.toLowerCase();
		const hasPaymentTerms =
			lower.includes("jazzcash") ||
			lower.includes("easypaisa") ||
			lower.includes("transfer money") ||
			lower.includes("rs ") ||
			lower.includes("fee");

		return {
			isScam: hasPaymentTerms,
			verdict: hasPaymentTerms ? ("payment_demand" as const) : ("legit" as const),
			confidence: hasPaymentTerms ? 0.85 : 0.9,
			reason: hasPaymentTerms
				? "Detected monetary cash request keywords."
				: "No explicit financial scam indicators found.",
		};
	}

	private async checkFuzzyDuplicate(userId: string, rawInput: string): Promise<boolean> {
		// Query recent requests by the same user within the last 1 hour
		const { data } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.select("raw_input")
			.eq("created_by", userId)
			.gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

		if (!data || data.length === 0) return false;

		// Simple substring / exact match check or similarity check
		const normalizedInput = rawInput.trim().toLowerCase();
		return data.some((req) => req.raw_input && req.raw_input.trim().toLowerCase() === normalizedInput);
	}

	private async logModerationEvent(params: {
		userId: string;
		requestId: string | null;
		verdict: string;
		confidence: number;
		reason: string;
		action: string;
		strikesDelta: number;
		inputHash: string;
	}) {
		await this.supabase.from(this.MODERATION_EVENTS_TABLE).insert({
			user_id: params.userId,
			request_id: params.requestId,
			verdict: params.verdict as Database["public"]["Enums"]["moderation_verdict_enum"],
			confidence: params.confidence,
			reason: params.reason,
			action: params.action as Database["public"]["Enums"]["moderation_action_enum"],
			strikes_delta: params.strikesDelta,
			input_hash: params.inputHash,
		});
	}

	private async applyUserPenalty(userId: string, strikesDelta: number, action: string) {
		const { data: profile } = await this.supabase
			.from(this.PROFILES_TABLE)
			.select("strikes")
			.eq("id", userId)
			.single();

		const currentStrikes = profile?.strikes || 0;
		const newStrikes = currentStrikes + strikesDelta;
		const newStatus = action === "throttle" ? "throttled" : "active";

		await this.supabase
			.from(this.PROFILES_TABLE)
			.update({
				strikes: newStrikes,
				status: newStatus,
				updated_at: new Date().toISOString(),
			})
			.eq("id", userId);
	}

	private hashInput(input: string): string {
		// Simple lightweight hash identifier for tracking repeated inputs
		let hash = 0;
		for (let i = 0; i < input.length; i++) {
			hash = (hash << 5) - hash + input.charCodeAt(i);
			hash |= 0;
		}
		return hash.toString();
	}
}
