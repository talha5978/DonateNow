import { redirect, Outlet, type LoaderFunctionArgs } from "react-router";
import { LogoutButton } from "~/components/LogoutButton";
import { AuthService } from "~/services/auth.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);

	try {
		const { data } = await auth.getCurrentProfile();

		if (!data?.user) {
			throw redirect("/login");
		}

		// if (data?.user && data.profile) {
		// 	const isProfileIncomplete = !data.profile.blood_group || !data.profile.phone || !data.profile.geo;

		// 	if (isProfileIncomplete) {
		// 		return redirect("/complete-profile?from=home");
		// 	}
		// }

		return {
			user: data?.user ?? null,
			profile: data?.profile ?? null,
		};
	} catch (error) {
		throw redirect("/login");
	}
}

export const meta = () => {
	return [
		{
			title: "Dashboard | LedgerPilot",
		},
	];
};

export default function DashboardLayout() {
	return (
		<div className="min-h-screen">
			{/* <SidebarLayout> */}
			<Outlet />
			<LogoutButton />
			{/* </SidebarLayout> */}
		</div>
	);
}
