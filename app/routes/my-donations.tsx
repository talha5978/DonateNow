import { redirect, type LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import {
	Activity,
	ArrowLeft,
	Award,
	Building2,
	CalendarDays,
	CheckCircle2,
	Clock3,
	Droplet,
	HeartHandshake,
	MapPin,
	ShieldCheck,
} from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";
import { AuthService } from "~/services/auth.service.server";
import { DonationsService } from "~/services/donations.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData } = await auth.getCurrentProfile();

	if (!authData?.user) return redirect("/login");

	const service = new DonationsService(request);
	return service.getDonorData(authData.user.id);
}

export const meta = () => [{ title: "My Donations & Impact | DonateNow" }];

export default function MyDonationsPage() {
	const { profile, donations, commitments } = useLoaderData<typeof loader>();

	// Calculate the 56-day donation cooldown.
	const COOLDOWN_DAYS = 56;
	const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

	let daysRemaining = 0;
	let isCoolingDown = false;
	let hasDonationDate = false;
	let recoveryProgress = 0;

	if (profile?.last_donated_at) {
		const lastDonatedDate = new Date(profile.last_donated_at).getTime();

		if (Number.isFinite(lastDonatedDate)) {
			hasDonationDate = true;

			const timeElapsed = Math.max(0, Date.now() - lastDonatedDate);

			isCoolingDown = timeElapsed < cooldownMs;

			if (isCoolingDown) {
				daysRemaining = Math.ceil((cooldownMs - timeElapsed) / (24 * 60 * 60 * 1000));
			}

			recoveryProgress = Math.min(100, (timeElapsed / cooldownMs) * 100);
		}
	}

	const bloodGroup = profile?.blood_group || "Not set";

	const formatDate = (date: string | Date) =>
		new Intl.DateTimeFormat("en", {
			day: "numeric",
			month: "short",
			year: "numeric",
		}).format(new Date(date));

	return (
		<div className="min-h-screen py-8 lg:py-12">
			<div className="mx-auto max-w-5xl space-y-8">
				{/* Page Header */}
				<header className="space-y-5">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Feed
					</Link>

					<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
						<div className="space-y-2">
							<div className="flex items-center gap-2 text-sm font-semibold text-primary">
								<HeartHandshake className="h-4 w-4" />
								Donor Dashboard
							</div>

							<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
								My Donations
							</h1>

							<p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
								Your donation history, active commitments, and recovery status in one place.
							</p>
						</div>
					</div>
				</header>

				{/* Donor Profile & Recovery Status */}
				<Card className="overflow-hidden rounded-2xl border-border/70 shadow-sm">
					<CardContent className="p-0">
						<div className="flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
							{/* Donor Information */}
							<div className="flex items-center gap-4">
								<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
									<HeartHandshake className="h-7 w-7" />
								</div>

								<div className="min-w-0 space-y-1">
									<h2 className="truncate text-lg font-bold text-foreground">
										{profile?.full_name || "Verified Donor"}
									</h2>

									<div className="flex flex-wrap items-center gap-2 text-sm">
										<span className="rounded-md bg-primary/10 px-2 py-0.5 font-bold text-primary">
											{bloodGroup}
										</span>

										<span className="text-muted-foreground">Blood Group</span>
									</div>
								</div>
							</div>

							{/* Recovery Status */}
							<div
								className={`w-full rounded-xl border p-4 lg:max-w-sm ${
									isCoolingDown
										? "border-amber-500/25 bg-amber-500/5"
										: "border-emerald-500/25 bg-emerald-500/5"
								}`}
							>
								<div className="flex items-start gap-3">
									<div
										className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
											isCoolingDown
												? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
												: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
										}`}
									>
										<Clock3 className="h-5 w-5" />
									</div>

									<div className="min-w-0 flex-1">
										<p className="text-sm font-semibold text-foreground">
											{isCoolingDown ? "Recovery Period" : "No Active Cooldown"}
										</p>

										<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
											{isCoolingDown
												? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} remaining in your 56-day recovery period.`
												: "No active donation cooldown is recorded on your profile."}
										</p>

										{hasDonationDate && (
											<div className="mt-3 space-y-1.5">
												<div className="h-1.5 overflow-hidden rounded-full bg-muted">
													<div
														className={`h-full rounded-full transition-all ${
															isCoolingDown ? "bg-amber-500" : "bg-emerald-500"
														}`}
														style={{
															width: `${recoveryProgress}%`,
														}}
													/>
												</div>

												<div className="flex justify-between text-[10px] text-muted-foreground">
													<span>Recovery progress</span>
													<span>{Math.round(recoveryProgress)}%</span>
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>

						<div className="border-t border-border/60 bg-muted/20 px-5 py-3 sm:px-7">
							<p className="text-xs text-muted-foreground">
								<ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
								Donation eligibility is subject to medical screening and hospital guidelines.
							</p>
						</div>
					</CardContent>
				</Card>

				{/* Overview Statistics */}
				<section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{/* Completed Donations */}
					<Card className="rounded-2xl border-border/70 shadow-sm">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
								<Droplet className="h-5 w-5" />
							</div>

							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Completed Donations
								</p>
								<p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
									{donations.length}
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Active Commitments */}
					<Card className="rounded-2xl border-border/70 shadow-sm">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
								<Activity className="h-5 w-5" />
							</div>

							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Active Commitments
								</p>
								<p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
									{commitments.length}
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Blood Group */}
					<Card className="rounded-2xl border-border/70 shadow-sm">
						<CardContent className="flex items-center gap-4 p-5">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<HeartHandshake className="h-5 w-5" />
							</div>

							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Registered Blood Group
								</p>
								<p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
									{bloodGroup}
								</p>
							</div>
						</CardContent>
					</Card>
				</section>

				{/* Active Commitments */}
				<section className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<ShieldCheck className="h-5 w-5" />
							</div>

							<div>
								<h2 className="font-bold text-foreground">Active Commitments</h2>
								<p className="text-xs text-muted-foreground">Requests you have accepted</p>
							</div>
						</div>

						<span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
							{commitments.length} {commitments.length === 1 ? "Request" : "Requests"}
						</span>
					</div>

					{commitments.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
								<HeartHandshake className="h-6 w-6" />
							</div>

							<h3 className="mt-4 text-sm font-semibold text-foreground">
								No active commitments
							</h3>

							<p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
								When you accept a blood donation request, it will appear here so you can keep
								track of your commitments.
							</p>

							<Link
								to="/"
								className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
							>
								Explore donation requests
								<ArrowLeft className="h-3.5 w-3.5 rotate-180" />
							</Link>
						</div>
					) : (
						<div className="space-y-3">
							{commitments.map((item: any) => (
								<Card
									key={item.id}
									className="rounded-xl border-border/70 shadow-sm transition-shadow hover:shadow-md"
								>
									<CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
										<div className="flex min-w-0 items-center gap-4">
											<div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-primary">
												<Droplet className="h-4 w-4 fill-current" />
												<span className="mt-0.5 text-sm font-extrabold">
													{item.request?.blood_group || "—"}
												</span>
											</div>

											<div className="min-w-0 space-y-1.5">
												<h3 className="font-semibold text-foreground">
													{item.request?.units_needed || 0}{" "}
													{item.request?.units_needed === 1 ? "Unit" : "Units"}{" "}
													<span className="font-normal text-muted-foreground">
														at
													</span>{" "}
													{item.request?.hospitals?.name || "Hospital"}
												</h3>

												<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
													<span className="inline-flex items-center gap-1">
														<Building2 className="h-3.5 w-3.5" />
														{item.request?.hospitals?.name || "Hospital"}
													</span>

													<span className="inline-flex items-center gap-1">
														<MapPin className="h-3.5 w-3.5" />
														{item.request?.hospitals?.city || "Pakistan"}
													</span>
												</div>

												<div className="flex flex-wrap items-center gap-2 pt-0.5">
													<span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium capitalize text-muted-foreground">
														{item.request?.urgency || "Standard"} urgency
													</span>
												</div>
											</div>
										</div>

										<div className="flex items-center sm:justify-end">
											<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
												<CheckCircle2 className="h-3.5 w-3.5" />
												Accepted
											</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</section>

				{/* Completed Donation History */}
				<section className="space-y-4">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
								<Award className="h-5 w-5" />
							</div>

							<div>
								<h2 className="font-bold text-foreground">Donation History</h2>
								<p className="text-xs text-muted-foreground">
									Your verified donation records
								</p>
							</div>
						</div>

						<span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
							{donations.length} {donations.length === 1 ? "Record" : "Records"}
						</span>
					</div>

					{donations.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
								<Droplet className="h-6 w-6" />
							</div>

							<h3 className="mt-4 text-sm font-semibold text-foreground">
								No donations recorded yet
							</h3>

							<p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
								Once a blood donation is completed and verified, your donation record will
								appear here.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{donations.map((item) => (
								<Card
									key={item.id}
									className="rounded-xl border-border/70 shadow-sm transition-shadow hover:shadow-md"
								>
									<CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
										<div className="flex min-w-0 items-center gap-4">
											<div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
												<CheckCircle2 className="h-4 w-4" />
												<span className="mt-0.5 text-xs font-bold">
													{item.units} {item.units === 1 ? "Unit" : "Units"}
												</span>
											</div>

											<div className="min-w-0 space-y-1.5">
												<h3 className="font-semibold text-foreground">
													Donation at {item.request?.hospitals?.name || "Hospital"}
												</h3>

												<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
													<span className="inline-flex items-center gap-1">
														<Droplet className="h-3.5 w-3.5 text-primary" />
														{item.request?.blood_group ||
															"Blood group unavailable"}
													</span>

													<span className="inline-flex items-center gap-1">
														<CalendarDays className="h-3.5 w-3.5" />
														{formatDate(item.donated_at)}
													</span>
												</div>
											</div>
										</div>

										<div className="flex items-center sm:justify-end">
											<span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
												<CheckCircle2 className="h-3.5 w-3.5" />
												Verified
											</span>
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</section>

				{/* Footer */}
				<footer className="border-t border-border/60 pt-5">
					<p className="text-center text-xs text-muted-foreground">
						Every donation counts. Thank you for being part of the DonateNow community.
					</p>
				</footer>
			</div>
		</div>
	);
}
