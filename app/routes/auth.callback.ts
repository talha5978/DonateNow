import { type LoaderFunctionArgs, redirect } from "react-router";
import { AuthService } from "~/services/auth.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const next = url.searchParams.get("next") || "/";

	if (code) {
		const auth = new AuthService(request);
		const { error } = await auth.exchangeCodeForSession(code);

		if (!error) {
			return redirect(next, {
				headers: auth.headers,
			});
		}
	}

	// Return to login if authentication failed
	return redirect("/login?error=Could not authenticate with Google");
}
