import { redirect, Outlet, type LoaderFunctionArgs } from "react-router";
import { LogoutButton } from "~/components/LogoutButton";
import { AuthService } from "~/services/auth.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const url = new URL(request.url);

	try {
		const { data } = await auth.getCurrentProfile();

		if (!data?.user) {
			throw redirect("/login");
		}

		const isProfileIncomplete = !data.profile?.blood_group || !data.profile?.phone || !data.profile?.geo;

		// IMPORTANT: only redirect if we are NOT already on the complete-profile page
		if (isProfileIncomplete && !url.pathname.startsWith("/complete-profile")) {
			throw redirect("/complete-profile");
		}

		return {
			user: data.user,
			profile: data.profile,
		};
	} catch (error) {
		if (error instanceof Response) throw error;
		throw redirect("/login");
	}
}

export default function ProtectedLayout() {
	return (
		<div className="min-h-screen">
			<Outlet />
			<LogoutButton />
		</div>
	);
}
