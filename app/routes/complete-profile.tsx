import {
	redirect,
	useNavigate,
	useRouteLoaderData,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useNavigation } from "react-router";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ProfileService } from "~/services/profile.service.server";
import { AuthService } from "~/services/auth.service.server";
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Check, Loader2, LocateIcon } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const completeProfileSchema = z.object({
	full_name: z.string().min(2, "Name must be at least 2 characters"),
	phone: z
		.string()
		.min(10, "Enter a valid phone number")
		.regex(/^[+]?[\d\s-]{10,15}$/, "Enter a valid phone number"),
	blood_group: z.enum(BLOOD_GROUPS, {
		message: "Please select your blood group",
	}),
	last_donated_at: z.string().optional(),
	available: z.boolean().default(true),
	latitude: z.string().optional(),
	longitude: z.string().optional(),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

export async function loader({ request }: LoaderFunctionArgs) {
	// We only need to make sure the user is logged in.
	// The actual profile data comes from the parent layout.
	const auth = new AuthService(request);
	const { data } = await auth.getCurrentProfile();

	if (!data?.user) {
		return redirect("/login");
	}

	return null;
}

export async function action({ request }: ActionFunctionArgs) {
	const authSvc = new AuthService(request);
	const { data: current, error: authError } = await authSvc.getCurrentProfile();

	if (authError || !current?.user) {
		return redirect("/login");
	}

	const formData = await request.formData();

	const raw = {
		full_name: String(formData.get("full_name") || "").trim(),
		phone: String(formData.get("phone") || "").trim(),
		blood_group: String(formData.get("blood_group") || ""),
		last_donated_at: String(formData.get("last_donated_at") || "") || undefined,
		available: formData.get("available") === "on" || formData.get("available") === "true",
		latitude: String(formData.get("latitude") || ""),
		longitude: String(formData.get("longitude") || ""),
	};

	const parsed = completeProfileSchema.safeParse(raw);

	if (!parsed.success) {
		return {
			ok: false,
			message: "Please fix the errors below",
			errors: parsed.error.flatten().fieldErrors,
		};
	}

	const profiles = new ProfileService(request);
	const { error: updateError } = await profiles.updateProfile(current.user.id, parsed.data);

	if (updateError) {
		return {
			ok: false,
			message: updateError.message || "Failed to update profile",
		};
	}

	return redirect("/");
}

export const meta = () => [{ title: "Complete your profile | DonateNow" }];

export default function CompleteProfilePage() {
	const naviagate = useNavigate();
	// Get data from the parent protected layout
	const layoutData = useRouteLoaderData("routes/protected_layout") as {
		user: any;
		profile: any;
	};

	const profile = layoutData?.profile;

	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

	const {
		register,
		control,
		setValue,
		formState: { errors },
	} = useForm<CompleteProfileValues>({
		// @ts-ignore
		resolver: zodResolver(completeProfileSchema),
		defaultValues: {
			full_name: profile?.full_name ?? "",
			phone: profile?.phone ?? "",
			blood_group: profile?.blood_group ?? undefined,
			last_donated_at: profile?.last_donated_at
				? new Date(profile.last_donated_at).toISOString().slice(0, 10)
				: "",
			available: profile?.available ?? true,
			latitude: "",
			longitude: "",
		},
	});

	const bloodGroup = useWatch({ control, name: "blood_group" });

	useEffect(() => {
		if (actionData && !actionData.ok) {
			toast.error(actionData.message || "Something went wrong");
		}
	}, [actionData]);

	useEffect(() => {
		const isProfileIncomplete = !profile?.blood_group || !profile?.phone || !profile?.geo;

		// IMPORTANT: only redirect if we are NOT already on the complete-profile page
		if (!isProfileIncomplete) {
			naviagate("/", { replace: true });
		}
	}, [profile]);

	function requestLocation() {
		if (!navigator.geolocation) {
			setLocationStatus("error");
			toast.error("Geolocation is not supported by your browser");
			return;
		}

		setLocationStatus("loading");

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const lat = position.coords.latitude.toFixed(6);
				const lng = position.coords.longitude.toFixed(6);

				setValue("latitude", lat);
				setValue("longitude", lng);
				setLocationStatus("success");
				toast.success("Location captured");
			},
			() => {
				setLocationStatus("error");
				toast.error("Unable to get your location. Please allow location access.");
			},
			{ enableHighAccuracy: false, timeout: 10000 },
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
			<Card className="w-full max-w-lg shadow-sm">
				<CardHeader>
					<CardTitle className="text-2xl">Complete your profile</CardTitle>
					<CardDescription>
						We need a few details so we can match you with the right requests.
					</CardDescription>
				</CardHeader>

				<CardContent>
					<Form method="post" className="space-y-6">
						{/* Hidden geo fields */}
						<input type="hidden" {...register("latitude")} />
						<input type="hidden" {...register("longitude")} />

						<FieldGroup>
							{/* Full Name */}
							<Field data-invalid={!!errors.full_name}>
								<FieldLabel htmlFor="full_name">Full name</FieldLabel>
								<Input
									id="full_name"
									placeholder="Your name"
									disabled={isSubmitting}
									{...register("full_name")}
								/>
								{errors.full_name && <FieldError>{errors.full_name.message}</FieldError>}
							</Field>

							{/* Phone */}
							<Field data-invalid={!!errors.phone}>
								<FieldLabel htmlFor="phone">Phone number</FieldLabel>
								<Input
									id="phone"
									type="tel"
									placeholder="+92 300 1234567"
									disabled={isSubmitting}
									{...register("phone")}
								/>
								<FieldDescription>
									Only shared with a requester after you accept their request.
								</FieldDescription>
								{errors.phone && <FieldError>{errors.phone.message}</FieldError>}
							</Field>

							{/* Blood Group - using Controller for proper Select support */}
							<Field data-invalid={!!errors.blood_group}>
								<FieldLabel>Blood group</FieldLabel>
								<Controller
									control={control}
									name="blood_group"
									render={({ field }) => (
										<Select
											value={field.value}
											onValueChange={field.onChange}
											disabled={isSubmitting}
										>
											<SelectTrigger>
												<SelectValue placeholder="Select your blood group" />
											</SelectTrigger>
											<SelectContent>
												{BLOOD_GROUPS.map((group) => (
													<SelectItem key={group} value={group}>
														{group}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									)}
								/>
								{/* Native input so the value is submitted */}
								<input type="hidden" name="blood_group" value={bloodGroup || ""} />
								{errors.blood_group && <FieldError>{errors.blood_group.message}</FieldError>}
							</Field>

							{/* Last Donated */}
							<Field>
								<FieldLabel htmlFor="last_donated_at">Last donated (optional)</FieldLabel>
								<Input
									id="last_donated_at"
									type="date"
									disabled={isSubmitting}
									{...register("last_donated_at")}
								/>
								<FieldDescription>
									Helps us know when you will be eligible again.
								</FieldDescription>
							</Field>

							{/* Location */}
							<Field>
								<FieldLabel>Your location</FieldLabel>
								<div className="flex gap-3 items-center">
									<Button
										type="button"
										variant={locationStatus === "success" ? "outline" : "default"}
										onClick={requestLocation}
										disabled={isSubmitting || locationStatus === "loading"}
									>
										{locationStatus === "idle" && <LocateIcon className="w-4 h-4" />}
										{locationStatus === "loading" && (
											<Loader2 className="w-4 h-4 animate-spin" />
										)}
										{locationStatus === "success" && <Check className="w-4 h-4" />}
										{locationStatus === "loading"
											? "Getting location…"
											: locationStatus === "success"
												? "Location saved"
												: "Use my current location"}
									</Button>
								</div>
								<FieldDescription>
									We only store a coarse location for matching. Exact address is never
									saved.
								</FieldDescription>
								{locationStatus === "error" && (
									<p className="text-sm text-destructive mt-1">
										Location is required for matching. Please allow access.
									</p>
								)}
							</Field>

							{/* Available */}
							<div className="flex items-center gap-2 pt-2">
								<Controller
									control={control}
									name="available"
									render={({ field }) => (
										<Checkbox
											id="available"
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={isSubmitting}
										/>
									)}
								/>
								{/* Hidden input for form submission */}
								<input
									type="hidden"
									name="available"
									value={String(useWatch({ control, name: "available" }))}
								/>
								<Label htmlFor="available" className="font-normal">
									I am currently available to donate
								</Label>
							</div>
						</FieldGroup>

						<Button type="submit" className="w-full" disabled={isSubmitting}>
							{isSubmitting ? "Saving…" : "Save & continue"}
						</Button>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
