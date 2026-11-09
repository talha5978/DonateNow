import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthService } from "~/services/auth.service.server";
import { RequestService } from "~/services/request.service.server";
import { DonationsService } from "~/services/donations.service.server";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

import {
	Activity,
	ArrowLeft,
	Building2,
	Check,
	ChevronDown,
	ClipboardList,
	Droplet,
	Edit3,
	HeartHandshake,
	MapPin,
	MessageSquare,
	ShieldCheck,
	UserRoundCheck,
	X,
} from "lucide-react";

// ----------------------------------------------------
// Constants
// ----------------------------------------------------

const URGENCY_OPTIONS = ["routine", "urgent", "critical"] as const;

const REQUEST_STATUS_OPTIONS = ["open", "partially_filled", "fulfilled", "closed"] as const;

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------

function formatDate(value?: string | null) {
	if (!value) return "Not specified";

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return "Date unavailable";

	return new Intl.DateTimeFormat("en", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(date);
}

function formatLabel(value?: string | null) {
	if (!value) return "Unknown";

	return value
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function getRequestStatusStyles(status: string) {
	switch (status) {
		case "open":
			return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";

		case "partially_filled":
			return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";

		case "fulfilled":
			return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";

		case "closed":
			return "bg-muted text-muted-foreground border-border";

		case "expired":
			return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";

		default:
			return "bg-muted text-muted-foreground border-border";
	}
}

function getUrgencyStyles(urgency: string) {
	switch (urgency) {
		case "critical":
			return "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400";

		case "urgent":
			return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";

		case "routine":
			return "bg-muted text-muted-foreground border-border";

		default:
			return "bg-muted text-muted-foreground border-border";
	}
}

function getVerificationStyles(state: string) {
	switch (state) {
		case "slip_verified":
		case "peer_confirmed":
			return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";

		case "low_trust":
			return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";

		case "unverified":
		default:
			return "bg-muted text-muted-foreground border-border";
	}
}

function getResponseStyles(status: string) {
	switch (status) {
		case "accepted":
		case "arrived":
			return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";

		case "declined":
			return "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400";

		case "not_now":
			return "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400";

		case "notified":
			return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";

		default:
			return "bg-muted text-muted-foreground border-border";
	}
}

function getConfirmationStyles(type: string) {
	switch (type) {
		case "arrived":
		case "slip_verified":
			return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400";

		case "peer_vouched":
			return "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400";

		default:
			return "bg-muted text-muted-foreground border-border";
	}
}

// ----------------------------------------------------
// Loader
// ----------------------------------------------------

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData } = await auth.getCurrentProfile();

	if (!authData?.user) return redirect("/login");

	const myService = new RequestService(request);

	const requests = await myService.getUserRequestsWithConfirmations(authData.user.id);

	return { requests };
}

// ----------------------------------------------------
// Action
// ----------------------------------------------------

export async function action({ request }: ActionFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData } = await auth.getCurrentProfile();

	if (!authData?.user) return redirect("/login");

	const formData = await request.formData();
	const intent = formData.get("intent")?.toString() || "update_request";
	const requestId = formData.get("requestId")?.toString() || "";

	const fail = (message: string) => ({
		ok: false as const,
		requestId,
		message,
	});

	if (!requestId) {
		return fail("Missing request ID");
	}

	// Handle Fulfillment Confirmation Loop
	if (intent === "confirm_donation") {
		const donorId = formData.get("donorId")?.toString();
		const units = Number(formData.get("units") || 1);

		if (!donorId) {
			return fail("Missing donor ID");
		}

		if (units < 1 || units > 10) {
			return fail("Unit count must be between 1 and 10");
		}

		try {
			const donationsService = new DonationsService(request);
			await donationsService.confirmFulfillment(requestId, donorId, units);

			return {
				ok: true as const,
				requestId,
				message: `Donation of ${units} unit(s) confirmed! Cooldown initiated.`,
			};
		} catch (error) {
			return fail(error instanceof Error ? error.message : "Failed to confirm donation");
		}
	}

	const unitsRaw = formData.get("units_needed")?.toString();
	const urgencyRaw = formData.get("urgency")?.toString();
	const statusRaw = formData.get("status")?.toString();

	const unitsNeeded = Number(unitsRaw);

	if (!unitsRaw || !Number.isInteger(unitsNeeded) || unitsNeeded < 1 || unitsNeeded > 10) {
		return fail("Units needed must be between 1 and 10");
	}

	if (!urgencyRaw || !URGENCY_OPTIONS.includes(urgencyRaw as (typeof URGENCY_OPTIONS)[number])) {
		return fail("Invalid urgency level");
	}

	if (
		!statusRaw ||
		!REQUEST_STATUS_OPTIONS.includes(statusRaw as (typeof REQUEST_STATUS_OPTIONS)[number])
	) {
		return fail("Invalid request status");
	}

	try {
		const myService = new RequestService(request);

		await myService.updateRequestDetails(requestId, authData.user.id, {
			units_needed: unitsNeeded,
			urgency: urgencyRaw as (typeof URGENCY_OPTIONS)[number],
			status: statusRaw as (typeof REQUEST_STATUS_OPTIONS)[number],
		});

		return {
			ok: true as const,
			requestId,
			message: "Request updated successfully",
		};
	} catch (error) {
		return fail(error instanceof Error ? error.message : "Failed to update request");
	}
}

// ----------------------------------------------------
// Meta
// ----------------------------------------------------

export const meta = () => [{ title: "My Requests & Coordination | DonateNow" }];

// ----------------------------------------------------
// Page
// ----------------------------------------------------

export default function MyRequestsPage() {
	const { requests } = useLoaderData<typeof loader>();

	const fetcher = useFetcher<typeof action>();

	const [editingId, setEditingId] = useState<string | null>(null);

	// ------------------------------------------------
	// Handle action responses & toasts
	// ------------------------------------------------

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data) {
			return;
		}

		if (fetcher.data.ok) {
			if (editingId) {
				setEditingId(null);
			}
			toast.success(fetcher.data.message || "Operation successful");
		} else {
			toast.error(fetcher.data.message);
		}
	}, [fetcher.data, fetcher.state, editingId]);

	// ------------------------------------------------
	// Dashboard statistics
	// ------------------------------------------------

	const activeRequests = requests.filter(
		(item) => item.status === "open" || item.status === "partially_filled",
	).length;

	const totalResponses = requests.reduce((total, item) => total + (item.responses?.length ?? 0), 0);

	const totalConfirmations = requests.reduce((total, item) => total + (item.confirmations?.length ?? 0), 0);

	const statistics = [
		{
			label: "Total Requests",
			value: requests.length,
			description: "All requests you created",
			icon: <ClipboardList className="h-5 w-5" />,
			iconStyles: "bg-primary/10 text-primary",
		},
		{
			label: "Active Requests",
			value: activeRequests,
			description: "Currently accepting donors",
			icon: <Activity className="h-5 w-5" />,
			iconStyles: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		},
		{
			label: "Donor Responses",
			value: totalResponses,
			description: "Responses from potential donors",
			icon: <MessageSquare className="h-5 w-5" />,
			iconStyles: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
		},
		{
			label: "Confirmation Records",
			value: totalConfirmations,
			description: "Arrival and verification events",
			icon: <ShieldCheck className="h-5 w-5" />,
			iconStyles: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
		},
	];

	return (
		<div className="min-h-screen py-8 lg:py-12">
			<div className="mx-auto space-y-8">
				{/* ==========================================
				    PAGE HEADER
				========================================== */}

				<header className="space-y-5">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Emergency Feed
					</Link>

					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-semibold text-primary">
							<HeartHandshake className="h-4 w-4" />
							Request Management
						</div>

						<h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							My Emergency Requests
						</h1>

						<p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
							Manage your blood requests, monitor donor responses, and keep track of hospital
							confirmations.
						</p>
					</div>
				</header>

				{/* ==========================================
				    OVERVIEW STATISTICS
				========================================== */}

				<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{statistics.map((stat) => (
						<Card key={stat.label} className="rounded-2xl border-border/70 shadow-sm">
							<CardContent className="flex items-center gap-4 p-5">
								<div
									className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconStyles}`}
								>
									{stat.icon}
								</div>

								<div className="min-w-0">
									<p className="text-sm font-medium text-muted-foreground">{stat.label}</p>

									<p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
										{stat.value}
									</p>

									<p className="mt-0.5 text-[11px] text-muted-foreground">
										{stat.description}
									</p>
								</div>
							</CardContent>
						</Card>
					))}
				</section>

				{/* ==========================================
				    REQUESTS SECTION
				========================================== */}

				<section className="space-y-5">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2.5">
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<Droplet className="h-5 w-5" />
							</div>

							<div>
								<h2 className="font-bold text-foreground">Your Requests</h2>

								<p className="text-xs text-muted-foreground">
									Blood requests you've submitted
								</p>
							</div>
						</div>

						<span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
							{requests.length} {requests.length === 1 ? "Request" : "Requests"}
						</span>
					</div>

					{requests.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
								<Droplet className="h-6 w-6" />
							</div>

							<h3 className="mt-4 text-base font-semibold text-foreground">
								No requests created yet
							</h3>

							<p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
								You haven't submitted any blood requests. Create one to start coordinating
								with potential donors.
							</p>

							<Link
								to="/requests/new"
								className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
							>
								<Droplet className="h-4 w-4" />
								Create a Blood Request
							</Link>
						</div>
					) : (
						<div className="space-y-5">
							{requests.map((item: (typeof requests)[0]) => {
								const isEditing = editingId === item.id;

								const isEditable =
									item.status === "open" || item.status === "partially_filled";

								const unitsNeeded = item.units_needed ?? 0;
								const unitsFulfilled = item.units_fulfilled ?? 0;

								const remainingUnits = Math.max(0, unitsNeeded - unitsFulfilled);

								const progress =
									unitsNeeded > 0 ? Math.min(100, (unitsFulfilled / unitsNeeded) * 100) : 0;

								const responses = item.responses ?? [];
								const confirmations = item.confirmations ?? [];

								return (
									<Card
										key={item.id}
										className="overflow-hidden rounded-xl border-border/70 shadow-sm transition-shadow hover:shadow-md"
									>
										<details className="group">
											{/* =====================================
											COLLAPSED HEADER
										===================================== */}

											<summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none transition-colors hover:bg-muted/30 sm:p-5 [&::-webkit-details-marker]:hidden">
												<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/5 text-sm font-extrabold text-primary">
													{item.blood_group}
												</div>

												<div className="min-w-0 flex-1 space-y-1.5">
													<div className="flex flex-wrap items-center gap-1.5">
														<span
															className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getRequestStatusStyles(item.status)}`}
														>
															{formatLabel(item.status)}
														</span>

														<span
															className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getUrgencyStyles(item.urgency)}`}
														>
															{formatLabel(item.urgency)}
														</span>
													</div>

													<h3 className="truncate text-sm font-bold text-foreground sm:text-base">
														{item.units_needed} Units of {item.blood_group}{" "}
														Required
													</h3>

													<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
														<span className="inline-flex items-center gap-1">
															<Building2 className="h-3.5 w-3.5" />
															{item.hospitals?.name || "Hospital"}
														</span>

														<span className="inline-flex items-center gap-1">
															<MapPin className="h-3.5 w-3.5" />
															{item.hospitals?.city || "Location unavailable"}
														</span>
													</div>
												</div>

												<div className="flex shrink-0 flex-col items-end gap-2">
													<span
														className={`hidden rounded-full border px-2 py-1 text-[10px] font-semibold sm:inline-flex ${
															isEditable
																? "border-primary/20 bg-primary/5 text-primary"
																: "border-border bg-muted text-muted-foreground"
														}`}
													>
														{isEditable ? "Editable" : "Read only"}
													</span>

													<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
												</div>
											</summary>

											{/* =====================================
											EXPANDED CONTENT
										===================================== */}

											<div className="space-y-5 border-t border-border/60 p-4 sm:p-5">
												<div className="space-y-3">
													<div className="flex items-center justify-between gap-3">
														<h4 className="text-sm font-bold text-foreground">
															Request Overview
														</h4>

														{isEditable && (
															<Button
																variant="outline"
																size="sm"
																disabled={fetcher.state !== "idle"}
																onClick={() =>
																	setEditingId(isEditing ? null : item.id)
																}
																className="h-8 gap-1.5 text-xs"
															>
																{isEditing ? (
																	<>
																		<X className="h-3.5 w-3.5" />
																		Cancel Editing
																	</>
																) : (
																	<>
																		<Edit3 className="h-3.5 w-3.5" />
																		Manage Request
																	</>
																)}
															</Button>
														)}
													</div>

													<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
														<div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-2">
															<div className="flex items-center justify-between">
																<span className="text-xs font-medium text-muted-foreground">
																	Donation Progress
																</span>

																<span className="text-xs font-bold text-foreground">
																	{unitsFulfilled}/{unitsNeeded} Units
																</span>
															</div>

															<div className="h-2 overflow-hidden rounded-full bg-muted">
																<div
																	className="h-full rounded-full bg-emerald-500 transition-all"
																	style={{ width: `${progress}%` }}
																/>
															</div>

															<div className="flex justify-between text-[11px] text-muted-foreground">
																<span>{remainingUnits} units remaining</span>
																<span>{Math.round(progress)}% fulfilled</span>
															</div>
														</div>

														<div className="rounded-lg border border-border/60 p-3">
															<p className="text-[11px] text-muted-foreground">
																Needed By
															</p>
															<p className="mt-1 text-xs font-semibold text-foreground">
																{formatDate(item.needed_by)}
															</p>
														</div>

														<div className="rounded-lg border border-border/60 p-3">
															<p className="text-[11px] text-muted-foreground">
																Created On
															</p>
															<p className="mt-1 text-xs font-semibold text-foreground">
																{formatDate(item.created_at)}
															</p>
														</div>

														<div className="col-span-2 rounded-lg border border-border/60 p-3 sm:col-span-1">
															<p className="text-[11px] text-muted-foreground">
																Verification
															</p>
															<span
																className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getVerificationStyles(item.verification_state)}`}
															>
																{formatLabel(item.verification_state)}
															</span>
														</div>
													</div>
												</div>

												{/* =====================================
												EDIT REQUEST FORM
											===================================== */}

												{isEditing && (
													<fetcher.Form
														method="post"
														className="space-y-4 rounded-xl border border-primary/20 bg-primary/2.5 p-4"
													>
														<input
															type="hidden"
															name="intent"
															value="update_request"
														/>
														<input
															type="hidden"
															name="requestId"
															value={item.id}
														/>

														<div>
															<h4 className="text-sm font-bold text-foreground">
																Update Request
															</h4>
															<p className="mt-0.5 text-xs text-muted-foreground">
																Modify your request parameters.
															</p>
														</div>

														<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
															<div className="space-y-2">
																<label className="text-xs font-semibold">
																	Units Needed
																</label>
																<Input
																	type="number"
																	name="units_needed"
																	defaultValue={item.units_needed}
																	min={Math.max(1, unitsFulfilled)}
																	max={10}
																	required
																	className="h-9 bg-background text-sm"
																/>
															</div>

															<div className="space-y-2">
																<label className="text-xs font-semibold">
																	Urgency
																</label>
																<Select
																	name="urgency"
																	defaultValue={item.urgency}
																>
																	<SelectTrigger className="h-9 bg-background text-sm">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="routine">
																			Routine
																		</SelectItem>
																		<SelectItem value="urgent">
																			Urgent
																		</SelectItem>
																		<SelectItem value="critical">
																			Critical
																		</SelectItem>
																	</SelectContent>
																</Select>
															</div>

															<div className="space-y-2">
																<label className="text-xs font-semibold">
																	Status
																</label>
																<Select
																	name="status"
																	defaultValue={item.status}
																>
																	<SelectTrigger className="h-9 bg-background text-sm">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="open">
																			Open
																		</SelectItem>
																		<SelectItem value="partially_filled">
																			Partially Filled
																		</SelectItem>
																		<SelectItem value="fulfilled">
																			Fulfilled
																		</SelectItem>
																		<SelectItem value="closed">
																			Closed
																		</SelectItem>
																	</SelectContent>
																</Select>
															</div>
														</div>

														<div className="flex justify-end gap-2 border-t border-border/60 pt-3">
															<Button
																type="button"
																variant="ghost"
																size="sm"
																onClick={() => setEditingId(null)}
															>
																Cancel
															</Button>

															<Button
																type="submit"
																size="sm"
																disabled={fetcher.state !== "idle"}
																className="gap-1.5"
															>
																<Check className="h-3.5 w-3.5" />
																{fetcher.state !== "idle"
																	? "Saving..."
																	: "Save Changes"}
															</Button>
														</div>
													</fetcher.Form>
												)}

												{/* =====================================
												DONOR RESPONSES & CONFIRMATIONS
											===================================== */}

												<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
													{/* Donor Responses */}

													<div className="space-y-3 rounded-xl border border-border/60 p-4">
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<UserRoundCheck className="h-4 w-4 text-primary" />
																<h4 className="text-sm font-semibold">
																	Donor Responses
																</h4>
															</div>

															<span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
																{responses.length}
															</span>
														</div>

														{responses.length === 0 ? (
															<p className="py-4 text-center text-xs text-muted-foreground">
																No donor responses received yet.
															</p>
														) : (
															<div className="space-y-2">
																{responses.map((resp) => {
																	const donorId = resp.donor?.id;
																	const canConfirm =
																		(resp.status === "accepted" ||
																			resp.status === "arrived") &&
																		item.status !== "fulfilled" &&
																		item.status !== "closed";

																	const maxSelectableUnits = Math.max(
																		1,
																		(item.units_needed ?? 1) -
																			(item.units_fulfilled ?? 0),
																	);

																	return (
																		<div
																			key={resp.id}
																			className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg bg-muted/30 p-3"
																		>
																			<div className="min-w-0 space-y-1">
																				<p className="truncate text-xs font-semibold text-foreground">
																					{resp.donor?.full_name ||
																						"Verified Donor"}
																				</p>

																				<p className="text-[11px] text-muted-foreground">
																					{resp.donor
																						?.blood_group ||
																						"Unknown blood group"}
																				</p>

																				{resp.donor?.phone && (
																					<a
																						href={`tel:${resp.donor.phone}`}
																						className="text-xs font-medium text-primary hover:underline"
																					>
																						{resp.donor.phone}
																					</a>
																				)}

																				<p className="text-[10px] text-muted-foreground">
																					{resp.responded_at
																						? formatDate(
																								resp.responded_at,
																							)
																						: "Awaiting response"}
																				</p>
																			</div>

																			<div className="flex shrink-0 flex-col gap-2">
																				<span
																					className={`rounded-full border px-2 py-1 text-[9px] font-bold ${getResponseStyles(resp.status)}`}
																				>
																					{formatLabel(resp.status)}
																				</span>

																				{/* CONFIRM PARTIAL / FULL DONATION FORM */}
																				{canConfirm && donorId && (
																					<fetcher.Form
																						method="post"
																						className="flex items-center gap-2"
																					>
																						<input
																							type="hidden"
																							name="intent"
																							value="confirm_donation"
																						/>
																						<input
																							type="hidden"
																							name="requestId"
																							value={item.id}
																						/>
																						<input
																							type="hidden"
																							name="donorId"
																							value={donorId}
																						/>

																						<div className="flex items-center gap-1">
																							<Input
																								type="number"
																								name="units"
																								defaultValue={Math.min(
																									1,
																									maxSelectableUnits,
																								)}
																								min={1}
																								max={
																									maxSelectableUnits
																								}
																								className="h-7 w-14 text-xs bg-background text-center"
																								title="Units contributed"
																							/>
																							<Button
																								type="submit"
																								size="sm"
																								variant="default"
																								className="h-7 px-2.5 text-[10px] font-semibold"
																								disabled={
																									fetcher.state !==
																									"idle"
																								}
																							>
																								Confirm Units
																							</Button>
																						</div>
																					</fetcher.Form>
																				)}
																			</div>
																		</div>
																	);
																})}
															</div>
														)}
													</div>

													{/* Hospital Confirmations */}

													<div className="space-y-3 rounded-xl border border-border/60 p-4">
														<div className="flex items-center justify-between">
															<div className="flex items-center gap-2">
																<ShieldCheck className="h-4 w-4 text-emerald-600" />
																<h4 className="text-sm font-semibold">
																	Confirmations
																</h4>
															</div>

															<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
																{confirmations.length}
															</span>
														</div>

														{confirmations.length === 0 ? (
															<p className="py-4 text-center text-xs text-muted-foreground">
																No confirmation records yet.
															</p>
														) : (
															<div className="space-y-2">
																{confirmations.map((conf: any) => (
																	<div
																		key={conf.id}
																		className="flex items-start justify-between gap-2 rounded-lg bg-muted/30 p-3"
																	>
																		<div className="min-w-0 space-y-1">
																			<p className="truncate text-xs font-semibold text-foreground">
																				{conf.user?.full_name ||
																					"Confirmed Participant"}
																			</p>

																			<p className="text-[11px] text-muted-foreground">
																				{formatDate(conf.created_at)}
																			</p>
																		</div>

																		<span
																			className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-bold ${getConfirmationStyles(conf.type)}`}
																		>
																			{formatLabel(conf.type)}
																		</span>
																	</div>
																))}
															</div>
														)}
													</div>
												</div>
											</div>
										</details>
									</Card>
								);
							})}
						</div>
					)}
				</section>

				{/* ==========================================
				    FOOTER
				========================================== */}

				<footer className="border-t border-border/60 pt-5">
					<p className="text-center text-xs text-muted-foreground">
						Thank you for using DonateNow to coordinate life-saving blood donations.
					</p>
				</footer>
			</div>
		</div>
	);
}
