import { type ActionFunctionArgs } from "react-router";
import { AuthService } from "~/services/auth.service.server";
import { ProfileService } from "~/services/profile.service.server";
import type { Database } from "~/types/database";

export async function action({ request }: ActionFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData } = await auth.getCurrentProfile();
	if (!authData?.user) return { ok: false, message: "Unauthorized" };

	const formData = await request.formData();
	const full_name = formData.get("full_name")?.toString() || "";
	const phone = formData.get("phone")?.toString() || "";
	const blood_group = formData
		.get("blood_group")
		?.toString() as Database["public"]["Enums"]["blood_group_enum"];
	const available = formData.get("available") === "on" || formData.get("available") === "true";
	const last_donated_at = formData.get("last_donated_at")?.toString();
	const latitude = formData.get("latitude")?.toString();
	const longitude = formData.get("longitude")?.toString();

	const profileService = new ProfileService(request);
	const result = await profileService.updateProfile(authData.user.id, {
		full_name,
		phone,
		blood_group,
		available,
		last_donated_at: last_donated_at || undefined,
		latitude: latitude || undefined,
		longitude: longitude || undefined,
	});

	if (result.error) {
		return { ok: false, message: result.error.message };
	}

	return { ok: true, message: "Profile updated successfully" };
}
