import type { User } from "@supabase/supabase-js";
import type { Database } from "~/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type CachedProfile = {
	data: { user: User; profile: Profile };
	expiresAt: number;
};

const profileCache = new Map<string, CachedProfile>();

export function getCachedProfile(cookieHeader: string | null) {
	if (!cookieHeader) return null;
	const cached = profileCache.get(cookieHeader);
	if (cached && cached.expiresAt > Date.now()) {
		return cached.data;
	}
	if (cached) {
		profileCache.delete(cookieHeader);
	}
	return null;
}

export function setCachedProfile(
	cookieHeader: string | null,
	data: { user: User; profile: Profile },
	ttlSeconds = 45,
) {
	if (!cookieHeader) return;
	profileCache.set(cookieHeader, {
		data,
		expiresAt: Date.now() + ttlSeconds * 1000,
	});
}

export function clearCachedProfile(cookieHeader: string | null) {
	if (cookieHeader) {
		profileCache.delete(cookieHeader);
	}
}
