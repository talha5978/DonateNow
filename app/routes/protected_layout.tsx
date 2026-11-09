import { redirect, Outlet, type LoaderFunctionArgs, useLoaderData } from "react-router";
import { Footer } from "~/components/layout/Footer";
import { Header } from "~/components/layout/Header";
import { AuthService } from "~/services/auth.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const url = new URL(request.url);

	try {
		const { data } = await auth.getCurrentProfile();

		if (!data?.user) {
			throw redirect("/home");
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
		throw redirect("/home");
	}
}

export default function ProtectedLayout() {
	const { profile, user } = useLoaderData<typeof loader>();
	return (
		<div className="min-h-screen flex flex-col bg-background text-foreground">
			<Header profile={profile} user={user} />
			<main className="flex-1 max-w-7xl  mx-auto w-full px-4 sm:px-6">
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
