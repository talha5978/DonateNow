import { redirect, type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { AuthService } from "~/services/auth.service.server";
import { MatchService, type MatchedRequest } from "~/services/match.service.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/components/ui/card";
import {
	MapPin,
	Clock,
	Droplet,
	AlertTriangle,
	ShieldCheck,
	Activity,
	User,
	Building2,
	ArrowUpRight,
} from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data, error } = await auth.getCurrentProfile();

	if (error || !data?.user) {
		return redirect("/home");
	}

	// Fetch matched emergency feed requests using our matching engine
	const matchService = new MatchService(request);
	const feedRequests = await matchService.getFeedForUser(data.user.id);

	return {
		user: data.user,
		profile: data.profile,
		feedRequests,
	};
}

export const meta = () => [{ title: "Feed | DonateNow" }];

export default function FeedPage() {
	const { profile, feedRequests } = useLoaderData<typeof loader>();

	return (
		<div className="py-8 space-y-6">
			{/* Welcome / Status Banner */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between bg-muted/30 border border-border/60 rounded-xl p-6">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight">Your Emergency Feed</h1>
						<span className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-2.5 py-0.5 text-xs font-semibold">
							Eligible Donor
						</span>
					</div>
					<p className="text-sm text-muted-foreground">
						Showing verified requests matching your blood group (
						<strong className="text-foreground">{profile.blood_group || "Not Set"}</strong>)
						within your radius.
					</p>
				</div>
			</div>
			{/* {JSON.stringify(feedRequests, null, 2)} */}
			{/* Feed List Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{feedRequests.length === 0 ? (
					<div className="col-span-full">
						<Card className="border border-border/60 bg-card py-20 text-center shadow-none rounded-2xl">
							<CardContent className="space-y-4 max-w-md mx-auto">
								<div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
									<Droplet className="h-7 w-7 fill-primary/20" />
								</div>
								<div className="space-y-1">
									<h3 className="font-semibold text-lg">No active requests in your area</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										There are currently no compatible blood requests within your search
										radius. We will notify you via waves when someone nearby needs
										assistance.
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				) : (
					feedRequests.map((req: MatchedRequest) => {
						const isCritical = req.urgency === "critical";
						const isUrgent = req.urgency === "urgent";

						return (
							<Card
								key={req.request_id}
								className="group relative flex flex-col justify-between overflow-hidden border border-border/60 bg-card hover:border-primary/50 transition-all duration-300 hover:shadow-lg rounded-2xl"
							>
								{/* Top colored accent border */}
								<div
									className={`absolute top-0 left-0 right-0 h-1.5 ${
										isCritical
											? "bg-destructive"
											: isUrgent
												? "bg-amber-500"
												: "bg-primary"
									}`}
								/>

								<div className="p-5 sm:p-6 space-y-4 flex-1">
									{/* Top Row: Blood Group, Units & Match Badge */}
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-3">
											{/* Big Blood Badge */}
											<div className="flex flex-col items-center justify-center bg-primary/10 border border-primary/20 rounded-xl px-3.5 py-2 text-primary shadow-2xs">
												<Droplet className="h-4 w-4 fill-primary mb-0.5" />
												<span className="font-extrabold text-base tracking-tight">
													{req.blood_group}
												</span>
											</div>

											<div>
												<div className="flex items-center gap-2">
													<h2 className="font-bold text-foreground text-base">
														{req.units_needed}{" "}
														{req.units_needed === 1
															? "Unit Required"
															: "Units Required"}
													</h2>
												</div>
												<p className="text-xs text-muted-foreground font-medium pt-0.5 flex items-center gap-1">
													<User className="h-3 w-3" />
													{req.structured?.patient_name
														? `Patient: ${req.structured.patient_name}`
														: "Emergency Request"}
												</p>
											</div>
										</div>

										{/* Urgency Badge */}
										<span
											className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
												isCritical
													? "bg-destructive/10 text-destructive border-destructive/20"
													: isUrgent
														? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
														: "bg-muted text-muted-foreground border-border"
											}`}
										>
											<AlertTriangle className="h-3 w-3 shrink-0" />
											{req.urgency.charAt(0).toUpperCase() + req.urgency.slice(1)}
										</span>
									</div>

									{/* Hospital & Location Box */}
									<div className="bg-muted/30 border border-border/40 rounded-xl p-3.5 space-y-2 text-xs">
										<div className="flex items-center gap-2.5">
											<Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
											<div className="flex-1 min-w-0">
												<p className="font-semibold text-foreground truncate text-sm">
													{req.hospital_name}
												</p>
												<p className="text-muted-foreground flex items-center gap-1 pt-0.5">
													<MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
													<span className="truncate">
														{req.hospital_city || "Pakistan"}
													</span>
													<span className="font-semibold text-foreground bg-background px-1.5 py-0.5 rounded border border-border/60 ml-auto">
														{req.distance_km} km away
													</span>
												</p>
											</div>
										</div>
									</div>

									{/* Notes snippet if available */}
									{req.structured?.notes && (
										<p className="text-xs text-muted-foreground/90 italic bg-muted/10 p-2.5 rounded-lg border border-border/30 line-clamp-2">
											&ldquo;{req.structured.notes}&rdquo;
										</p>
									)}
								</div>

								{/* Card Footer: Match score, timestamp & action button */}
								<div className="px-5 sm:px-6 py-3.5 bg-muted/20 border-t border-border/40 flex  flex-col gap-3 text-xs">
									<div className="space-y-0.5">
										<div className="flex items-center gap-1.5 text-muted-foreground">
											<Clock className="h-3 w-3" />
											<span>
												Posted{" "}
												{new Date(req.created_at).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												})}
											</span>
										</div>
										{req.verification_state === "slip_verified" ? (
											<span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
												<ShieldCheck className="h-3 w-3" /> Slip Verified
											</span>
										) : (
											<span className="text-muted-foreground/70">Unverified slip</span>
										)}
									</div>

									<div className="flex items-center gap-2 self-end">
										{req.match_score && (
											<span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
												<Activity className="h-3 w-3" />
												{Math.round(req.match_score)}% Match
											</span>
										)}
										<Button
											size="sm"
											className="font-medium text-xs h-9 px-4 shadow-2xs group-hover:bg-primary/90"
										>
											<Link
												to={`/requests/${req.request_id}`}
												className="flex items-center gap-1"
											>
												<span>Respond</span>
												<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
											</Link>
										</Button>
									</div>
								</div>
							</Card>
						);
					})
				)}
			</div>
		</div>
	);
}
