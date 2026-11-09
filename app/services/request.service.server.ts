import { BaseService } from "~/services/base.server.service";
import { ApiError } from "~/utils/errors/ApiError";
import type { StructuredRequest } from "~/schemas/request";
import { HospitalService } from "~/services/hospital.service.server";
import { ModerationService } from "~/services/moderation.service.server";

export class RequestService extends BaseService {
	private readonly COOLDOWN_MINUTES = 30;

	async createRequest(params: {
		created_by: string;
		source: "form" | "paste" | "voice";
		raw_input: string;
		structured: StructuredRequest;
		verification_state?: "unverified" | "slip_verified";
	}) {
		const { data: profile, error: profileErr } = await this.supabase
			.from(this.PROFILES_TABLE)
			.select("status, strikes, updated_at")
			.eq("id", params.created_by)
			.single();

		if (profileErr || !profile) {
			throw new ApiError("User profile not found", 404);
		}

		if (profile.status === "blocked" || profile.status === "suspended") {
			throw new ApiError(
				`Your account has been ${profile.status} due to multiple community trust violations. You cannot post requests.`,
				403,
			);
		}

		// --- FIXED COOLDOWN CHECK ---
		if (profile.status === "throttled") {
			// Check when the throttle penalty was applied on their profile
			const penaltyTimestamp = profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now();
			const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000;
			const timeElapsed = Date.now() - penaltyTimestamp;

			if (timeElapsed < cooldownMs) {
				const remainingMinutes = Math.ceil((cooldownMs - timeElapsed) / (60 * 1000));
				throw new ApiError(
					`Your account is currently throttled due to previous safety flags. Please wait ${remainingMinutes} more minute(s) before posting another request.`,
					429, // Too Many Requests
				);
			}
		}

		// 1. Run Pre-Publication Risk & Anti-Spam Moderation Audit
		const moderationService = new ModerationService(this.request);
		const moderation = await moderationService.auditRequest(
			params.created_by,
			JSON.stringify(params.structured),
			params.structured.hospital_name,
		);
		console.log("Moderation audit result:", moderation);
		// If verdict is severe scam/spam and action is block/suspend, throw error to reject request

		const severeVerdicts = ["payment_demand", "spam", "fabricated", "abusive", "advertisement"];
		const severeActions = ["block", "suspend"];

		if (severeVerdicts.includes(moderation.verdict) && moderation.riskScore >= 0.6) {
			throw new ApiError(`Request rejected by security policy: ${moderation.reason}`, 403);
		}

		if (severeActions.includes(moderation.action)) {
			throw new ApiError(
				`Request rejected due to automated moderation action: ${moderation.action}`,
				403,
			);
		}

		const hospitalService = new HospitalService(this.request);
		const hospitalId = await hospitalService.findOrCreate(params.structured.hospital_name);

		// If risk score is high, force verification state to low_trust regardless of slip
		const finalVerificationState =
			moderation.riskScore >= 0.5 ? "low_trust" : params.verification_state || "unverified";

		const { data, error } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.insert({
				created_by: params.created_by,
				source: params.source,
				raw_input: params.raw_input,
				structured: params.structured,
				blood_group: params.structured.blood_group,
				units_needed: params.structured.units_needed,
				hospital_id: hospitalId,
				urgency: params.structured.urgency,
				status: "open",
				verification_state: finalVerificationState,
				risk_score: moderation.riskScore,
				risk_signals: moderation.riskSignals,
				needed_by: params.structured.needed_by,
			})
			.select()
			.single();

		if (error) {
			throw new ApiError(error.message, 500, [error]);
		}

		return data;
	}

	/**
	 * Fetch complete request details along with hospital info and donor response status.
	 */
	async getRequestWithDetails(requestId: string, userId: string) {
		// 1. Fetch request details with hospital relation
		const { data: requestItem, error: reqError } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.select(
				`
                *,
                hospitals (
                    name,
                    city,
                    geo
                )
            `,
			)
			.eq("id", requestId)
			.single();

		if (reqError || !requestItem) {
			throw new ApiError("Request not found", 404);
		}

		// 2. Fetch existing response status for this donor if any
		const { data: donorResponse } = await this.supabase
			.from(this.RESPONSES_TABLE)
			.select("*")
			.eq("request_id", requestId)
			.eq("donor_id", userId)
			.maybeSingle();

		// 3. Fetch requester profile info if accepted (to unlock direct contact)
		let requesterProfile = null;
		if (donorResponse?.status === "accepted") {
			const { data: prof } = await this.supabase
				.from(this.PROFILES_TABLE)
				.select("full_name, phone")
				.eq("id", requestItem.created_by)
				.single();
			requesterProfile = prof;
		}

		return {
			requestItem,
			donorResponse,
			requesterProfile,
		};
	}

	/**
	 * Handle donor response actions (accept, decline, arrived).
	 */
	async handleDonorAction(requestId: string, userId: string, intent: string) {
		if (intent === "accept" || intent === "decline") {
			const responseStatus = intent === "accept" ? "accepted" : "declined";

			const { error } = await this.supabase.from(this.RESPONSES_TABLE).upsert(
				{
					request_id: requestId,
					donor_id: userId,
					status: responseStatus,
					responded_at: new Date().toISOString(),
				},
				{ onConflict: "request_id,donor_id" },
			);

			if (error) {
				throw new ApiError(error.message, 500);
			}
		} else if (intent === "arrived") {
			const { error } = await this.supabase.from(this.CONFIRMATIONS_TABLE).insert({
				request_id: requestId,
				user_id: userId,
				type: "arrived",
				metadata: { timestamp: new Date().toISOString() },
			});

			if (error) {
				throw new ApiError(error.message, 500);
			}
		}
	}
}
