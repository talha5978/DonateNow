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
		// Inserts into donations table, which triggers cooldown & status updates
		const { error } = await this.supabase.from(this.DONATIONS_TABLE).insert({
			request_id: requestId,
			donor_id: donorId,
			units: units,
			confirmed_by: donorId, // or requester id depending on context
		});

		if (error) throw new Error(error.message);

		// Update donor's last_donated_at timestamp to start 56-day cooldown
		await this.supabase
			.from(this.PROFILES_TABLE)
			.update({ last_donated_at: new Date().toISOString() })
			.eq("id", donorId);

		// Update request status to fulfilled
		await this.supabase.from(this.REQUESTS_TABLE).update({ status: "fulfilled" }).eq("id", requestId);
	}
}
