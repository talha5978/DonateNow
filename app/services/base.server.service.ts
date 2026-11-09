import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "~/lib/supabase/supabase.server";
import type { Database } from "~/types/database";

export class BaseService {
	protected supabase: SupabaseClient<Database>;
	readonly request: Request;
	readonly headers: Headers;

	protected readonly CONFIRMATIONS_TABLE = "confirmations";
	protected readonly DONATIONS_TABLE = "donations";
	protected readonly HOSPITALS_TABLE = "hospitals";
	protected readonly MODERATION_EVENTS_TABLE = "moderation_events";
	protected readonly NOTIFICATION_LOG_TABLE = "notification_log";
	protected readonly PROFILES_TABLE = "profiles";
	protected readonly REQUESTS_TABLE = "requests";
	protected readonly RESPONSES_TABLE = "responses";

	constructor(request: Request) {
		const { supabase, headers } = createServerSupabaseClient(request);
		this.supabase = supabase;
		this.request = request;
		this.headers = headers;
	}
}
