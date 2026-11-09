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
			.from("requests")
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
			})
			.select()
			.single();

		if (error) {
			throw new ApiError(error.message, 500, [error]);
		}

		return data;
	}
}
