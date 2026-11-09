import { BaseService } from "~/services/base.server.service";
import { ApiError } from "~/utils/errors/ApiError";

export interface MatchedRequest {
	request_id: string;
	created_by: string;
	source: "form" | "paste" | "voice";
	raw_input: string;
	structured: any;
	blood_group: string;
	units_needed: number;
	hospital_id: string;
	hospital_name: string;
	hospital_city: string | null;
	needed_by: string | null;
	urgency: "routine" | "urgent" | "critical";
	status: string;
	verification_state: string;
	created_at: string;
	distance_km: number;
	match_score: number;
}

export class MatchService extends BaseService {
	/**
	 * Retrieve personalized, eligible, and geographically matched blood requests for a user's feed.
	 */
	async getFeedForUser(userId: string): Promise<MatchedRequest[]> {
		try {
			const { data, error } = await this.supabase.rpc("get_matched_requests_for_user", {
				target_user_id: userId,
			});

			if (error) {
				throw new ApiError(error.message, 500, [error]);
			}

			return (data as MatchedRequest[]) || [];
		} catch (err: any) {
			if (err instanceof ApiError) throw err;
			throw new ApiError(err.message || "Failed to fetch matching feed", 500);
		}
	}
}
