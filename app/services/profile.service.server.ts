import { BaseService } from "~/services/base.server.service";
import { ApiError } from "~/utils/errors/ApiError";
import type { Database } from "~/types/database";
import { clearCachedProfile } from "~/utils/auth-cache.server";
import type { ServiceResult } from "~/types/service-result";

type ProfileUpdate = Pick<
	Database["public"]["Tables"]["profiles"]["Update"],
	"available" | "blood_group" | "full_name" | "geo" | "last_donated_at" | "phone" | "updated_at"
>;

export class ProfileService extends BaseService {
	async updateProfile(
		userId: string,
		input: {
			available: boolean;
			blood_group: Database["public"]["Enums"]["blood_group_enum"];
			full_name: string;
			last_donated_at?: string;
			phone: string;
			latitude?: string;
			longitude?: string;
		},
	): Promise<ServiceResult<boolean>> {
		const update: ProfileUpdate = {
			full_name: input.full_name,
			phone: input.phone,
			blood_group: input.blood_group,
			last_donated_at: input.last_donated_at ? new Date(input.last_donated_at).toISOString() : null,
			available: input.available,
			updated_at: new Date().toISOString(),
		};

		if (input.latitude && input.longitude) {
			update.geo = `POINT(${input.longitude} ${input.latitude})`;
		}

		const { error } = await this.supabase.from(this.PROFILES_TABLE).update(update).eq("id", userId);

		if (error) {
			return {
				data: null,
				error: new ApiError(error.message || "Failed to update profile", 500, [error]),
			};
		}

		clearCachedProfile(this.request.headers.get("cookie"));

		return { data: true, error: null };
	}
}
