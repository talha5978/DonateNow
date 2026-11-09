import { BaseService } from "~/services/base.server.service";
import { ApiError } from "~/utils/errors/ApiError";
import type { StructuredRequest } from "~/schemas/request";
import { HospitalService } from "~/services/hospital.service.server";
import { ModerationService } from "~/services/moderation.service.server";
import type { Database } from "~/types/database";

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

		// --- COOLDOWN CHECK ---
		if (profile.status === "throttled") {
			const penaltyTimestamp = profile.updated_at ? new Date(profile.updated_at).getTime() : Date.now();
			const cooldownMs = this.COOLDOWN_MINUTES * 60 * 1000; // 30 minutes
			const timeElapsed = Date.now() - penaltyTimestamp;

			if (timeElapsed < cooldownMs) {
				const remainingMinutes = Math.ceil((cooldownMs - timeElapsed) / (60 * 1000));
				throw new ApiError(
					`Your account is currently throttled due to previous safety flags. Please wait ${remainingMinutes} more minute(s) before posting another request.`,
					429,
				);
			} else {
				// ==========================================
				// 30-MIN COOLDOWN PASSED: RESTORE TO ACTIVE
				// ==========================================
				// Check if they have been clean for more than 7 days to decay strikes
				const sevenDaysMs = 7 * 24 * 60 * 1000;
				const timeSincePenalty = Date.now() - penaltyTimestamp;
				const currentStrikes = profile.strikes || 1;

				const newStrikes =
					timeSincePenalty > sevenDaysMs
						? Math.max(0, currentStrikes - 1) // Decay 1 strike if clean for 7 days
						: currentStrikes; // Keep strikes if within 7 days

				await this.supabase
					.from(this.PROFILES_TABLE)
					.update({
						status: "active",
						strikes: newStrikes,
						updated_at: new Date().toISOString(),
					})
					.eq("id", params.created_by);
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

	async getUserRequestsWithConfirmations(userId: string) {
		// 1. Fetch requests created by this user
		const { data: requests, error } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.select(
				`
                *,
                hospitals (name, city),
                responses (
                    id,
                    status,
                    responded_at,
                    donor:profiles!donor_id (id, full_name, phone, blood_group)
                ),
                confirmations (
                    id,
                    type,
                    created_at,
                    user:profiles!user_id (id, full_name, phone)
                )
            `,
			)
			.eq("created_by", userId)
			.order("created_at", { ascending: false });

		if (error) throw new Error(error.message);
		return requests || [];
	}

	async updateRequestDetails(
		requestId: string,
		userId: string,
		updates: {
			units_needed?: number;
			urgency?: Database["public"]["Enums"]["urgency_enum"];
			status?: Database["public"]["Enums"]["request_status_enum"];
		},
	) {
		const { data, error } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.update(updates)
			.eq("id", requestId)
			.eq("created_by", userId)
			.select("id")
			.maybeSingle();

		if (error) throw new Error(error.message);
		if (!data) throw new Error("Request not found or you do not have permission to update it");
	}
}
