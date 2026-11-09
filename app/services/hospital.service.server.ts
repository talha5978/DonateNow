import { BaseService } from "~/services/base.server.service";
import { ApiError } from "~/utils/errors/ApiError";

export class HospitalService extends BaseService {
	/**
	 * Find an existing hospital using the PostgreSQL fuzzy search RPC function,
	 * or create a new one if no close match is found.
	 * Returns the hospital id.
	 */
	async findOrCreate(name: string, city?: string) {
		const cleanName = name.trim();
		if (!cleanName) {
			throw new ApiError("Hospital name is required", 400);
		}

		// 1. Call your custom Postgres function `find_hospital_by_name` using rpc()
		const { data: matches, error: searchError } = await this.supabase.rpc("find_hospital_by_name", {
			search_term: cleanName,
		});

		if (searchError) {
			throw new ApiError(searchError.message, 500, [searchError]);
		}

		// 2. If matches are found, return the top match's ID
		// (You can also filter by a minimum score threshold like score > 0.4 if needed)
		if (matches && matches.length > 0) {
			const bestMatch = matches[0];

			// Optional: Log score for debugging / tuning pg_trgm similarity threshold
			// console.log(
			// 	`🏥 Matched "${cleanName}" to existing hospital: "${bestMatch.name}" (Score: ${bestMatch.score})`,
			// );

			return bestMatch.id;
		}

		// 3. No match found -> create a new hospital entry
		const { data: created, error: createError } = await this.supabase
			.from("hospitals")
			.insert({
				name: cleanName,
				aliases: [cleanName],
				geo: "POINT(0 0)",
				city: city || null,
				is_active: true,
			})
			.select("id")
			.single();

		if (createError) {
			throw new ApiError(createError.message, 500, [createError]);
		}

		console.log(`🏥 Created new hospital entry for: "${cleanName}"`);
		return created.id;
	}
}
