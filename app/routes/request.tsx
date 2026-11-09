import { redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, Link } from "react-router";
import { AuthService } from "~/services/auth.service.server";
import { RequestService } from "~/services/request.service.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	MapPin,
	Clock,
	Droplet,
	AlertTriangle,
	ShieldCheck,
	ArrowLeft,
	CheckCircle2,
	XCircle,
	Navigation,
	PhoneCall,
	Building2,
	User,
} from "lucide-react";

export async function loader({ request, params }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData, error: authError } = await auth.getCurrentProfile();

	if (authError || !authData?.user) {
		return redirect("/home");
	}

	const requestId = params.id;
	if (!requestId) return redirect("/");

	const requestService = new RequestService(request);
	const details = await requestService.getRequestWithDetails(requestId, authData.user.id);

	return {
		user: authData.user,
		profile: authData.profile,
		...details,
	};
}

export async function action({ request, params }: ActionFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData, error: authError } = await auth.getCurrentProfile();

	if (authError || !authData?.user) {
		return redirect("/home");
	}

	const requestId = params.id;
	if (!requestId) return redirect("/");

	const formData = await request.formData();
	const intent = formData.get("intent")?.toString() || "";

	const requestService = new RequestService(request);
	await requestService.handleDonorAction(requestId, authData.user.id, intent);

	return { success: true };
}

export const meta = () => [{ title: "Request Coordination | DonateNow" }];

export default function RequestDetailPage() {
	const { requestItem, donorResponse, requesterProfile } = useLoaderData<typeof loader>();
	const fetcher = useFetcher();

	const isCritical = requestItem.urgency === "critical";
	const isUrgent = requestItem.urgency === "urgent";
	const hospital = requestItem.hospitals;
	const structured = requestItem.structured || {};

	const currentStatus = donorResponse?.status;
	const isSubmitting = fetcher.state !== "idle";

	return (
		<div className="py-10 max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
			{/* Top Navigation Bar */}
			<div>
				<Link to="/">
					<Button
						variant="ghost"
						size="sm"
						className="gap-2 text-muted-foreground hover:text-foreground pl-0"
					>
						<ArrowLeft className="h-4 w-4" />
						<span>Back to Emergency Feed</span>
					</Button>
				</Link>
			</div>

			{/* Main Request Card */}
			<Card className="border border-border/60 bg-card rounded-2xl shadow-xs overflow-hidden relative">
				{/* Top Urgency Accent Border */}
				<div
					className={`absolute top-0 left-0 right-0 h-1.5 ${
						isCritical ? "bg-destructive" : isUrgent ? "bg-amber-500" : "bg-primary"
					}`}
				/>

				<CardContent className="p-6 sm:p-8 space-y-6">
					{/* Header Row: Blood Type, Units & Urgency */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
						<div className="flex items-center gap-4">
							<div className="flex flex-col items-center justify-center bg-primary/10 border border-primary/20 rounded-2xl px-4 py-2.5 text-primary shadow-2xs">
								<Droplet className="h-5 w-5 fill-primary mb-0.5" />
								<span className="font-extrabold text-lg tracking-tight">
									{requestItem.blood_group}
								</span>
							</div>
							<div>
								<h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
									{requestItem.units_needed}{" "}
									{requestItem.units_needed === 1 ? "Unit Required" : "Units Required"}
								</h1>
								<p className="text-xs text-muted-foreground pt-0.5 flex items-center gap-1.5 font-medium">
									<User className="h-3.5 w-3.5" />
									<span>
										Patient:{" "}
										<strong className="text-foreground">
											{structured.patient_name || "Emergency Patient"}
										</strong>
									</span>
								</p>
							</div>
						</div>

						<span
							className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border self-start sm:self-center ${
								isCritical
									? "bg-destructive/10 text-destructive border-destructive/20"
									: isUrgent
										? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
										: "bg-muted text-muted-foreground border-border"
							}`}
						>
							<AlertTriangle className="h-3.5 w-3.5" />
							{requestItem.urgency.charAt(0).toUpperCase() + requestItem.urgency.slice(1)}{" "}
							Urgency
						</span>
					</div>

					{/* Hospital & Location Details */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-1">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
								<Building2 className="h-3.5 w-3.5 text-primary" /> Hospital
							</span>
							<p className="font-bold text-foreground text-base pt-1">
								{hospital?.name || structured.hospital_name || "Unspecified Hospital"}
							</p>
							<p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
								<MapPin className="h-3 w-3" />
								<span>{hospital?.city || "Pakistan"}</span>
							</p>
						</div>

						<div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-1">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
								<Clock className="h-3.5 w-3.5 text-primary" /> Timeline & Status
							</span>
							<p className="font-bold text-foreground text-base pt-1">
								{requestItem.needed_by
									? new Date(requestItem.needed_by).toLocaleDateString([], {
											month: "short",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})
									: "As soon as possible"}
							</p>
							<p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-0.5 flex items-center gap-1">
								<ShieldCheck className="h-3.5 w-3.5" />
								{requestItem.verification_state === "verified"
									? "Hospital Slip Verified"
									: "Active Emergency Request"}
							</p>
						</div>
					</div>

					{/* Notes / Context */}
					{structured.notes && (
						<div className="space-y-1.5 bg-muted/20 border border-border/40 rounded-xl p-4">
							<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
								Clinical Notes / Reason
							</span>
							<p className="text-sm text-muted-foreground leading-relaxed">
								&ldquo;{structured.notes}&rdquo;
							</p>
						</div>
					)}

					{/* COORDINATION & RESPONSE BOX */}
					<div className="border-t border-border/40 pt-6 space-y-4">
						<h2 className="font-bold text-base tracking-tight">Donor Coordination & Action</h2>

						{currentStatus === "accepted" ? (
							<div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 space-y-4">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
										<CheckCircle2 className="h-5 w-5" />
									</div>
									<div>
										<h3 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
											You have accepted this request
										</h3>
										<p className="text-xs text-emerald-700 dark:text-emerald-400">
											Thank you for stepping up. Contact details and coordination steps
											are unlocked below.
										</p>
									</div>
								</div>

								{requesterProfile && (
									<div className="bg-background/80 border border-emerald-500/30 rounded-lg p-3.5 flex items-center justify-between text-sm">
										<div>
											<span className="text-xs text-muted-foreground block font-medium">
												Requester Contact
											</span>
											<strong className="text-foreground">
												{requesterProfile.full_name || "Family Coordinator"}
											</strong>
										</div>
										<a href={`tel:${requesterProfile.phone}`}>
											<Button
												size="sm"
												variant="outline"
												className="gap-1.5 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
											>
												<PhoneCall className="h-3.5 w-3.5" /> Call{" "}
												{requesterProfile.phone}
											</Button>
										</a>
									</div>
								)}

								<div className="flex items-center justify-between pt-2">
									<fetcher.Form method="post">
										<input type="hidden" name="intent" value="arrived" />
										<Button
											type="submit"
											size="sm"
											variant="default"
											disabled={isSubmitting}
											className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
										>
											<Navigation className="h-4 w-4" /> I have arrived at the hospital
										</Button>
									</fetcher.Form>

									<fetcher.Form method="post">
										<input type="hidden" name="intent" value="decline" />
										<Button
											type="submit"
											size="sm"
											variant="ghost"
											disabled={isSubmitting}
											className="text-muted-foreground hover:text-destructive"
										>
											Cancel Acceptance
										</Button>
									</fetcher.Form>
								</div>
							</div>
						) : currentStatus === "declined" ? (
							<div className="bg-muted/30 border border-border/40 rounded-xl p-4 flex items-center justify-between">
								<div className="flex items-center gap-3 text-muted-foreground">
									<XCircle className="h-5 w-5 text-muted-foreground" />
									<span className="text-sm font-medium">You declined this request.</span>
								</div>
								<fetcher.Form method="post">
									<input type="hidden" name="intent" value="accept" />
									<Button type="submit" size="sm" variant="outline" disabled={isSubmitting}>
										Change to Accept
									</Button>
								</fetcher.Form>
							</div>
						) : (
							<div className="flex flex-col sm:flex-row items-center gap-3">
								<fetcher.Form method="post" className="w-full sm:flex-1">
									<input type="hidden" name="intent" value="accept" />
									<Button
										type="submit"
										size="lg"
										disabled={isSubmitting}
										className="w-full gap-2 font-semibold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
									>
										<CheckCircle2 className="h-4 w-4" /> Accept & Coordinate Donation
									</Button>
								</fetcher.Form>

								<fetcher.Form method="post" className="w-full sm:w-auto">
									<input type="hidden" name="intent" value="decline" />
									<Button
										type="submit"
										size="lg"
										variant="outline"
										disabled={isSubmitting}
										className="w-full text-muted-foreground hover:text-foreground"
									>
										Decline
									</Button>
								</fetcher.Form>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
