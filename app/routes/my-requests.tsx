import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, Link } from "react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthService } from "~/services/auth.service.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
	Droplet,
	ShieldCheck,
	CheckCircle2,
	UserCheck,
	Edit3,
	X,
	Check,
	Building2,
	ArrowLeft,
} from "lucide-react";
import { RequestService } from "~/services/request.service.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData } = await auth.getCurrentProfile();

	if (!authData?.user) return redirect("/login");

	const myService = new RequestService(request);
	const requests = await myService.getUserRequestsWithConfirmations(authData.user.id);

	return { requests };
}

export async function action({ request }: ActionFunctionArgs) {
	const auth = new AuthService(request);
	const { data: authData } = await auth.getCurrentProfile();
	if (!authData?.user) return redirect("/login");

	const formData = await request.formData();
	const requestId = formData.get("requestId")?.toString();
	const unitsNeeded = formData.get("units_needed") ? Number(formData.get("units_needed")) : undefined;
	const urgency = formData.get("urgency")?.toString();
	const status = formData.get("status")?.toString();

	if (!requestId) return { ok: false, message: "Missing Request ID" };

	try {
		const myService = new RequestService(request);
		await myService.updateRequestDetails(requestId, authData.user.id, {
			units_needed: unitsNeeded,
			urgency: urgency as any,
			status: status as any,
		});

		return { ok: true, requestId };
	} catch (error) {
		return {
			ok: false,
			requestId,
			message: error instanceof Error ? error.message : "Failed to update request",
		};
	}
}

export const meta = () => [{ title: "My Requests & Coordination | DonateNow" }];

export default function MyRequestsPage() {
	const { requests } = useLoaderData<typeof loader>();
	const fetcher = useFetcher<typeof action>();

	// State to manage which request is currently open for editing
	const [editingId, setEditingId] = useState<string | null>(null);

	useEffect(() => {
		if (fetcher.state !== "idle" || !fetcher.data || !("requestId" in fetcher.data)) return;
		if (fetcher.data.requestId !== editingId) return;

		if (fetcher.data.ok) {
			setEditingId(null);
			toast.success("Request updated");
		} else {
			toast.error(fetcher.data.message);
		}
	}, [fetcher.data, fetcher.state, editingId]);

	return (
		<div className="min-h-screen bg-muted/20 py-10 px-4 sm:px-6">
			<div className="max-w-3xl mx-auto space-y-6">
				{/* Header Section */}
				<div className="flex flex-col gap-2 pb-2">
					<Link to="/" className="inline-flex items-center">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-muted-foreground hover:text-foreground pl-0 h-8"
						>
							<ArrowLeft className="h-4 w-4" />
							<span>Back to Emergency Feed</span>
						</Button>
					</Link>
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div>
							<h1 className="text-2xl font-black tracking-tight text-foreground">
								My Emergency Requests
							</h1>
							<p className="text-xs sm:text-sm text-muted-foreground pt-0.5">
								Monitor your active blood requests, review donor responses, and track hospital
								check-ins.
							</p>
						</div>
					</div>
				</div>

				{/* Requests Feed Container */}
				{requests.length === 0 ? (
					<div className="text-center py-16 border border-dashed border-border/80 rounded-2xl bg-card shadow-xs space-y-3">
						<div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
							<Droplet className="h-6 w-6 fill-primary" />
						</div>
						<div className="space-y-1">
							<h3 className="font-bold text-foreground text-base">No requests posted yet</h3>
							<p className="text-xs text-muted-foreground max-w-xs mx-auto">
								You haven't created any blood requests. Post an emergency request when
								coordination is needed.
							</p>
						</div>
						<div className="pt-2">
							<Link to="/requests/new">
								<Button size="sm" className="font-semibold shadow-xs">
									Post a Request Now
								</Button>
							</Link>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{requests.map((item) => {
							const isEditing = editingId === item.id;
							const isClosed = item.status === "fulfilled" || item.status === "closed";

							return (
								<Card
									key={item.id}
									className="border border-border/70 bg-card rounded-2xl shadow-xs overflow-hidden transition-all duration-200"
								>
									<CardContent className="p-5 sm:p-6 space-y-5">
										{/* Top Row: Blood Group, Status & Action Button */}
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
											<div className="flex items-center gap-3.5">
												<div className="flex flex-col items-center justify-center bg-primary/10 border border-primary/20 rounded-xl px-3.5 py-2 text-primary shrink-0 shadow-2xs">
													<Droplet className="h-4 w-4 fill-primary mb-0.5" />
													<span className="font-black text-base tracking-tight">
														{item.blood_group}
													</span>
												</div>
												<div className="space-y-0.5">
													<div className="flex items-center gap-2 flex-wrap">
														<h3 className="font-bold text-base text-foreground tracking-tight">
															{item.units_needed}{" "}
															{item.units_needed === 1
																? "Unit Required"
																: "Units Required"}
														</h3>
														<span
															className={`text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border ${
																item.status === "open"
																	? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
																	: "bg-muted text-muted-foreground border-border"
															}`}
														>
															{item.status}
														</span>
													</div>
													<p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
														<Building2 className="h-3.5 w-3.5 text-primary/70 shrink-0" />
														<span>
															{item.hospitals?.name || "Hospital"} •{" "}
															<span className="text-foreground font-medium">
																{item.hospitals?.city || "Pakistan"}
															</span>
														</span>
													</p>
												</div>
											</div>

											{!isClosed && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => setEditingId(isEditing ? null : item.id)}
													className="gap-1.5 text-xs font-semibold self-start sm:self-center border-border/80 shadow-2xs hover:bg-muted/50"
												>
													{isEditing ? (
														<X className="h-3.5 w-3.5" />
													) : (
														<Edit3 className="h-3.5 w-3.5" />
													)}
													<span>
														{isEditing ? "Close Editor" : "Manage Request"}
													</span>
												</Button>
											)}
										</div>

										{/* LIMITED UPDATION FORM (Collapsible Panel) */}
										{isEditing && (
											<fetcher.Form
												method="post"
												className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-4 animate-in fade-in-50 duration-150"
											>
												<input type="hidden" name="requestId" value={item.id} />
												<div className="flex items-center justify-between">
													<h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
														Update Request Parameters
													</h4>
													<span className="text-[11px] text-muted-foreground">
														Limited editing enabled
													</span>
												</div>

												<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
													<div className="space-y-1.5 w-full">
														<label className="text-xs text-muted-foreground font-semibold">
															Units Needed
														</label>
														<Input
															type="number"
															name="units_needed"
															defaultValue={item.units_needed}
															min={1}
															max={10}
															className="text-xs bg-background h-9 w-full"
														/>
													</div>

													<div className="space-y-1.5 w-full">
														<label className="text-xs text-muted-foreground font-semibold">
															Urgency Level
														</label>
														<Select name="urgency" defaultValue={item.urgency}>
															<SelectTrigger className="w-full min-w-full text-xs bg-background h-9 [&>span]:capitalize">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="routine">
																	Routine
																</SelectItem>
																<SelectItem value="urgent">Urgent</SelectItem>
																<SelectItem value="critical">
																	Critical
																</SelectItem>
															</SelectContent>
														</Select>
													</div>

													<div className="space-y-1.5 w-full">
														<label className="text-xs text-muted-foreground font-semibold">
															Status Control
														</label>
														<Select name="status" defaultValue={item.status}>
															<SelectTrigger className="w-full min-w-full text-xs bg-background h-9 [&>span]:capitalize">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="open">
																	Open (Active)
																</SelectItem>
																<SelectItem value="fulfilled">
																	Fulfilled / Closed
																</SelectItem>
															</SelectContent>
														</Select>
													</div>
												</div>

												<div className="flex justify-end gap-2 pt-1 border-t border-border/30">
													<Button
														type="button"
														variant="ghost"
														size="sm"
														onClick={() => setEditingId(null)}
														className="text-xs h-8"
													>
														Cancel
													</Button>
													<Button
														type="submit"
														size="sm"
														disabled={fetcher.state !== "idle"}
														className="gap-1.5 text-xs font-semibold h-8 shadow-2xs"
													>
														<Check className="h-3.5 w-3.5" />
														{fetcher.state !== "idle"
															? "Saving…"
															: "Save Updates"}
													</Button>
												</div>
											</fetcher.Form>
										)}

										{/* PEER RESPONSES & CONFIRMATIONS SECTION */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{/* Donor Responses Box */}
											<div className="bg-muted/20 border border-border/50 rounded-xl p-4 space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
														<UserCheck className="h-3.5 w-3.5 text-primary" />{" "}
														Donor Responses{" "}
														<span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[10px]">
															{item.responses?.length || 0}
														</span>
													</span>
												</div>

												{!item.responses || item.responses.length === 0 ? (
													<p className="text-xs text-muted-foreground italic py-2">
														No donor responses received yet.
													</p>
												) : (
													<div className="space-y-2">
														{item.responses.map((resp: any) => (
															<div
																key={resp.id}
																className="bg-card border border-border/60 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs"
															>
																<div className="space-y-0.5">
																	<p className="font-bold text-foreground">
																		{resp.donor?.full_name ||
																			"Verified Donor"}
																	</p>
																	<p className="text-[11px] text-muted-foreground">
																		Blood:{" "}
																		<strong className="text-foreground">
																			{resp.donor?.blood_group}
																		</strong>{" "}
																		• Phone:{" "}
																		<a
																			href={`tel:${resp.donor?.phone}`}
																			className="text-primary font-medium hover:underline"
																		>
																			{resp.donor?.phone || "N/A"}
																		</a>
																	</p>
																</div>
																<span
																	className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${
																		resp.status === "accepted"
																			? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
																			: "bg-muted text-muted-foreground"
																	}`}
																>
																	{resp.status}
																</span>
															</div>
														))}
													</div>
												)}
											</div>

											{/* Peer Confirmations (Hospital Arrivals) */}
											<div className="bg-muted/20 border border-border/50 rounded-xl p-4 space-y-3">
												<div className="flex items-center justify-between">
													<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
														<ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />{" "}
														Hospital Check-Ins{" "}
														<span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px]">
															{item.confirmations?.length || 0}
														</span>
													</span>
												</div>

												{!item.confirmations || item.confirmations.length === 0 ? (
													<p className="text-xs text-muted-foreground italic py-2">
														No hospital arrivals confirmed yet.
													</p>
												) : (
													<div className="space-y-2">
														{item.confirmations.map((conf: any) => (
															<div
																key={conf.id}
																className="bg-card border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs"
															>
																<div className="space-y-0.5">
																	<p className="font-bold text-foreground">
																		{conf.user?.full_name ||
																			"Confirmed Donor"}
																	</p>
																	<p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
																		<span>Physically checked in</span>
																	</p>
																</div>
																<div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
																	<CheckCircle2 className="h-3.5 w-3.5" />
																</div>
															</div>
														))}
													</div>
												)}
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
