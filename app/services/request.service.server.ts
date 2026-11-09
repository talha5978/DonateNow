import { BaseService } from "~/services/base.server.service";
import { ApiError } from "~/utils/errors/ApiError";
import type { StructuredRequest } from "~/schemas/request";
import { HospitalService } from "~/services/hospital.service.server";

export class RequestService extends BaseService {
	async createRequest(params: {
		created_by: string;
		source: "form" | "paste" | "voice";
		raw_input: string;
		structured: StructuredRequest;
	}) {
		// Resolve hospital_id
		const hospitalService = new HospitalService(this.request);
		const hospitalId = await hospitalService.findOrCreate(params.structured.hospital_name);

		const { data, error } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.insert({
				created_by: params.created_by,
				source: params.source,
				raw_input: params.raw_input,
				structured: params.structured,
				blood_group: params.structured.blood_group,
				units_needed: params.structured.units_needed,
				hospital_id: hospitalId, // ← now properly set
				urgency: params.structured.urgency,
				status: "open",
				verification_state: "unverified",
				risk_score: null,
				risk_signals: [],
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
