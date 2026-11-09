import { BaseService } from "~/services/base.server.service";

export class DonationsService extends BaseService {
	async getDonorData(userId: string) {
		// 1. Fetch user profile for cooldown check (`last_donated_at`)
		const { data: profile } = await this.supabase
			.from(this.PROFILES_TABLE)
			.select("last_donated_at, blood_group, full_name, strikes, status")
			.eq("id", userId)
			.single();

		// 2. Fetch completed donations ledger from `donations` table
		const { data: donations } = await this.supabase
			.from(this.DONATIONS_TABLE)
			.select(
				`
                id,
                units,
                notes,
                donated_at,
                request:requests!request_id (
                    id,
                    blood_group,
                    urgency,
                    hospitals (name, city)
                )
            `,
			)
			.eq("donor_id", userId)
			.order("donated_at", { ascending: false });

		// 3. Fetch active responses where donor committed to help
		const { data: commitments } = await this.supabase
			.from(this.RESPONSES_TABLE)
			.select(
				`
                id,
                status,
                responded_at,
                request:requests!request_id (
                    id,
                    blood_group,
                    units_needed,
                    urgency,
                    status,
                    hospitals (name, city)
                )
            `,
			)
			.eq("donor_id", userId)
			.eq("status", "accepted")
			.order("responded_at", { ascending: false });

		return {
			profile,
			donations: donations || [],
			commitments: commitments || [],
		};
	}

	async confirmFulfillment(requestId: string, donorId: string, units: number) {
		// 1. Insert into donations table
		const { error: donationError } = await this.supabase.from(this.DONATIONS_TABLE).insert({
			request_id: requestId,
			donor_id: donorId,
			units: units,
			confirmed_by: donorId,
		});

		if (donationError) throw new Error(donationError.message);

		// 2. Fetch current request details to get units_needed and current units_fulfilled
		const { data: requestData, error: reqError } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.select("units_needed, units_fulfilled")
			.eq("id", requestId)
			.single();

		if (reqError || !requestData) throw new Error("Request not found");

		const currentFulfilled = requestData.units_fulfilled || 0;
		const newFulfilled = currentFulfilled + units;

		// Only mark as 'fulfilled' if total fulfilled meets or exceeds units_needed
		const newStatus = newFulfilled >= requestData.units_needed ? "fulfilled" : "partially_filled";

		// 3. Update request with new cumulative units_fulfilled and dynamic status
		const { error: updateError } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.update({
				units_fulfilled: newFulfilled,
				status: newStatus,
				updated_at: new Date().toISOString(),
			})
			.eq("id", requestId);

		if (updateError) throw new Error(updateError.message);

		// 4. Trigger donor's 56-day medical cooldown
		await this.supabase
			.from(this.PROFILES_TABLE)
			.update({
				last_donated_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			})
			.eq("id", donorId);
	}
}
