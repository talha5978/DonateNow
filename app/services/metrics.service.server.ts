import { BaseService } from "~/services/base.server.service";

export class MetricsService extends BaseService {
	async getFeedMetrics() {
		// 1. Fetch active requests for Critical Count & Unit Progress
		const { data: requests, error: reqError } = await this.supabase
			.from(this.REQUESTS_TABLE)
			.select("urgency, units_needed, units_fulfilled, status")
			.in("status", ["open", "partially_filled"]);

		if (reqError) {
			throw new Error(reqError.message);
		}

		const activeRequests = requests || [];
		const criticalCount = activeRequests.filter((r) => r.urgency === "critical").length;

		const totalNeeded = activeRequests.reduce((acc, r) => acc + (r.units_needed || 0), 0);
		const totalFulfilled = activeRequests.reduce((acc, r) => acc + (r.units_fulfilled || 0), 0);
		const progressPercentage = totalNeeded > 0 ? Math.round((totalFulfilled / totalNeeded) * 100) : 0;

		// 2. Fetch available donors who have passed the 56-day medical recovery check
		const fiftySixDaysAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString();

		const { count: availableDonorsCount, error: donorError } = await this.supabase
			.from(this.PROFILES_TABLE)
			.select("id", { count: "exact", head: true })
			.eq("available", true)
			.or(`last_donated_at.is.null,last_donated_at.lt.${fiftySixDaysAgo}`);

		if (donorError) {
			throw new Error(donorError.message);
		}

		// 3. Fetch total completed donations count (Lives Impacted)
		const { count: livesImpactedCount, error: donationError } = await this.supabase
			.from(this.DONATIONS_TABLE)
			.select("id", { count: "exact", head: true });

		if (donationError) {
			throw new Error(donationError.message);
		}

		return {
			criticalCount,
			availableDonors: availableDonorsCount || 0,
			totalFulfilled,
			totalNeeded,
			progressPercentage,
			livesImpacted: livesImpactedCount || 0,
		};
	}
}
