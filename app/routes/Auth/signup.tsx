import { Link, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useFetcher, useNavigation } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";

import { AuthService } from "~/services/auth.service.server";
import { Field, FieldLabel, FieldError, FieldGroup } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

const signupSchema = z.object({
	email: z.email("Please enter a valid email").min(1, "Email is required"),
	password: z
		.string()
		.min(1, "Password is required")
		.min(6, "Password must be at least 6 characters")
		.regex(/\d/, "Password must contain at least one number"),
});

type SignUpFormValues = z.infer<typeof signupSchema>;

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data: user } = await auth.getUser();

	if (user) {
		return redirect("/");
	}

	return null;
}

export const meta = () => {
	return [
		{
			title: "Sign Up | DonateNow",
		},
	];
};

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const intent = formData.get("intent");

	const auth = new AuthService(request);

	// Handle Google OAuth action
	if (intent === "google") {
		const origin = new URL(request.url).origin;
		const { data, error } = await auth.signInWithGoogle(`${origin}/auth/callback`);

		if (error || !data?.url) {
			return {
				ok: false,
				message: error?.message || "Could not initialize Google Sign-in",
			};
		}

		return redirect(data.url, {
			headers: auth.headers,
		});
	}

	// Handle Email/Password login
	const email = String(formData.get("email") || "")
		.toLowerCase()
		.trim();

	const password = String(formData.get("password") || "").trim();

	const parsed = signupSchema.safeParse({ email, password });

	if (!parsed.success) {
		return {
			ok: false,
			message: "Validation failed",
			errors: parsed.error.flatten().fieldErrors,
		};
	}

	const { error } = await auth.signUpWithPassword({
		email: parsed.data.email,
		password: parsed.data.password,
	});

	if (error) {
		return {
			ok: false,
			message: error.message || "Invalid email or password",
		};
	}

	return redirect("/", {
		headers: auth.headers,
	});
}

export default function SignUpPage() {
	const actionData = useActionData<typeof action>();
	const fetcher = useFetcher<typeof action>();
	const navigation = useNavigation();
	const isSubmitting = navigation.state !== "idle" || fetcher.state !== "idle";

	const form = useForm<SignUpFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});
	const {
		register,
		handleSubmit,
		formState: { errors },
	} = form;

	const fetcherErrors =
		fetcher.data && !fetcher.data.ok && "errors" in fetcher.data ? fetcher.data.errors : undefined;

	useEffect(() => {
		if (actionData && !actionData.ok) {
			toast.error(actionData.message || "Something went wrong");
		}
	}, [actionData]);

	useEffect(() => {
		if (fetcher.data && !fetcher.data.ok && !("errors" in fetcher.data)) {
			toast.error(fetcher.data.message || "Something went wrong");
		}
	}, [fetcher.data]);

	const onSubmit = handleSubmit((values) => {
		fetcher.submit(values, { method: "post" });
	});

	return (
		<div className="min-h-screen flex">
			{/* Left side – branding / description */}
			<div className="hidden lg:flex lg:w-1/2 bg-muted items-center justify-center p-12">
				<div className="max-w-md space-y-4">
					{/* <div>
						<img src="/logo.png" className="w-40 mix-blend-multiply" alt="DonateNow" />
					</div> */}
					<h1 className="text-3xl font-semibold tracking-tight">DonateNow</h1>
					<p className="text-muted-foreground text-lg">
						Connecting blood donors with those in urgent need. Fast, trusted, and
						community-driven.
					</p>
				</div>
			</div>

			{/* Right side – form */}
			<div className="flex-1 flex items-center justify-center p-6 sm:p-12">
				<Card className="w-full max-w-md border-0 shadow-none sm:border sm:shadow-sm">
					<CardHeader className="space-y-1">
						{/* <CardTitle className="text-2xl flex gap-2 items-center">
							<img src="/logo_icon.png" className="w-8 mix-blend-multiply" alt="" />
							<span>Sign up</span>
						</CardTitle> */}
						<CardTitle className="text-2xl flex gap-2 items-center">Sign up</CardTitle>
						<CardDescription>Enter your credentials or continue with Google</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Google Sign Up Button */}
						<Form method="post">
							<input type="hidden" name="intent" value="google" />
							<Button
								type="submit"
								variant="outline"
								className="w-full flex gap-2 items-center justify-center"
								disabled={isSubmitting}
							>
								<svg className="w-5 h-5" viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
									/>
								</svg>
								Continue with Google
							</Button>
						</Form>

						<div className="relative flex py-2 items-center">
							<div className="grow border-t border-muted-foreground/30"></div>
							<span className="shrink mx-4 text-muted-foreground text-xs uppercase">
								Or continue with
							</span>
							<div className="grow border-t border-muted-foreground/30"></div>
						</div>

						{/* Email / Password Form */}
						<fetcher.Form method="post" noValidate className="space-y-4" onSubmit={onSubmit}>
							<FieldGroup>
								<Field data-invalid={!!errors.email || !!fetcherErrors?.email?.[0]}>
									<FieldLabel htmlFor="email">Email</FieldLabel>
									<Input
										id="email"
										type="email"
										placeholder="you@example.com"
										autoComplete="email"
										disabled={isSubmitting}
										aria-invalid={!!errors.email || !!fetcherErrors?.email?.[0]}
										{...register("email")}
									/>
									{(errors.email?.message || fetcherErrors?.email?.[0]) && (
										<FieldError>
											{errors.email?.message || fetcherErrors?.email?.[0]}
										</FieldError>
									)}
								</Field>

								<Field data-invalid={!!errors.password || !!fetcherErrors?.password?.[0]}>
									<FieldLabel htmlFor="password">Password</FieldLabel>
									<Input
										id="password"
										type="password"
										placeholder="••••••••"
										autoComplete="current-password"
										disabled={isSubmitting}
										aria-invalid={!!errors.password || !!fetcherErrors?.password?.[0]}
										{...register("password")}
									/>
									{(errors.password?.message || fetcherErrors?.password?.[0]) && (
										<FieldError>
											{errors.password?.message || fetcherErrors?.password?.[0]}
										</FieldError>
									)}
								</Field>
							</FieldGroup>

							<Button type="submit" className="w-full" disabled={isSubmitting}>
								{isSubmitting ? "Creating account…" : "Create Account"}
							</Button>
						</fetcher.Form>
					</CardContent>
					<CardFooter>
						<div className="flex justify-between items-center">
							Already have an account?{" "}
							<Link to="/login" prefetch="intent" className="ml-1 text-primary hover:underline">
								Sign in
							</Link>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
