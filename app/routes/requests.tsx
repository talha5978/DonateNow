import { Link, useLoaderData, useSearchParams } from "react-router";
import { useState } from "react";
import { BaseService } from "~/services/base.server.service";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Droplet, Building2, MapPin, Activity, Search, ArrowLeft } from "lucide-react";
import { PakistanMapFilter } from "~/components/PakistanMapFilter";
import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
	const baseService = new BaseService(request);

	// Fetch active open or partially filled requests
	const { data: requests, error } = await baseService.supabase
		.from("requests")
		.select(
			`
            id,
            blood_group,
            units_needed,
            units_fulfilled,
            urgency,
            status,
            needed_by,
            created_at,
            hospitals (name, city)
        `,
		)
		.in("status", ["open", "partially_filled"])
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(error.message);
	}

	return { requests: requests || [] };
}

export const meta = () => [{ title: "Active Emergency Requests & Dispatch Map | DonateNow" }];

export default function ActiveRequestsPage() {
	const { requests } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();

	const bloodFilter = searchParams.get("blood") || "all";
	const urgencyFilter = searchParams.get("urgency") || "all";
	const selectedRegion = searchParams.get("region") || "all";
	const [searchQuery, setSearchQuery] = useState("");

	// Helper to match city to region for filtering
	const getRegionForCity = (city: string = ""): string => {
		const c = city.toLowerCase();
		if (
			["lahore", "multan", "faisalabad", "rawalpindi", "bahawalpur", "gujranwala", "sialkot"].some(
				(x) => c.includes(x),
			)
		)
			return "punjab";
		if (["karachi", "hyderabad", "sukkur", "larkana", "nawabshah"].some((x) => c.includes(x)))
			return "sindh";
		if (["peshawar", "abbottabad", "swat", "mardan", "bannu"].some((x) => c.includes(x))) return "kpk";
		if (["quetta", "gwadar", "turbat", "khuzdar"].some((x) => c.includes(x))) return "balochistan";
		if (c.includes("islamabad")) return "islamabad";
		if (["muzaffarabad", "mirpur", "rawalakot"].some((x) => c.includes(x))) return "kashmir";
		if (["gilgit", "skardu", "hunza"].some((x) => c.includes(x))) return "gilgit";
		return "punjab";
	};

	// Filter requests based on query, dropdowns, and regional map selection
	const filteredRequests = requests.filter((req: any) => {
		const matchesBlood = bloodFilter === "all" || req.blood_group === bloodFilter;
		const matchesUrgency = urgencyFilter === "all" || req.urgency === urgencyFilter;

		const reqRegion = getRegionForCity(req.hospitals?.city);
		const matchesRegion = selectedRegion === "all" || reqRegion === selectedRegion;

		const hospitalName = req.hospitals?.name?.toLowerCase() || "";
		const city = req.hospitals?.city?.toLowerCase() || "";
		const matchesSearch =
			hospitalName.includes(searchQuery.toLowerCase()) || city.includes(searchQuery.toLowerCase());

		return matchesBlood && matchesUrgency && matchesRegion && matchesSearch;
	});

	const handleSelectRegion = (region: string) => {
		if (region === "all") {
			searchParams.delete("region");
		} else {
			searchParams.set("region", region);
		}
		setSearchParams(searchParams, {
			state: {
				suppressLoadingBar: true,
			},
			preventScrollReset: true,
		});
	};

	return (
		<div className="min-h-screen bg-muted/20 py-8 lg:py-12">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
				{/* Header & Back Link */}
				<div className="space-y-4">
					<Link to="/" className="inline-flex items-center">
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-muted-foreground hover:text-foreground pl-0 h-8"
						>
							<ArrowLeft className="h-4 w-4" />
							<span>Back to Feed</span>
						</Button>
					</Link>

					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div>
							<h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
								<Activity className="h-7 w-7 text-primary animate-pulse" /> Active Emergency
								Dispatch
							</h1>
							<p className="text-xs sm:text-sm text-muted-foreground pt-1">
								Select a region on the interactive map below or filter by blood group to
								coordinate emergency care.
							</p>
						</div>
					</div>
				</div>

				{/* Interactive Regional Pakistan Map Filter Component */}
				<PakistanMapFilter
					requests={requests}
					selectedRegion={selectedRegion}
					onSelectRegion={handleSelectRegion}
				/>

				{/* Filter & Search Toolbar */}
				<div className="bg-card border border-border/70 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
					<div className="relative w-full md:w-72">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search hospital or city..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-9 text-xs bg-background h-9"
						/>
					</div>

					<div className="flex items-center gap-3 w-full md:w-auto">
						<Select
							value={bloodFilter.charAt(0).toUpperCase() + bloodFilter.slice(1)}
							onValueChange={(val) => {
								searchParams.set("blood", val || "all");
								setSearchParams(searchParams, {
									state: {
										suppressLoadingBar: true,
									},
									preventScrollReset: true,
								});
							}}
						>
							<SelectTrigger className="text-xs h-9 w-full md:w-36 bg-background">
								<SelectValue placeholder="Blood Group" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Groups</SelectItem>
								{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => (
									<SelectItem key={g} value={g}>
										{g}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={urgencyFilter.charAt(0).toUpperCase() + urgencyFilter.slice(1)}
							onValueChange={(val) => {
								searchParams.set("urgency", val || "all");
								setSearchParams(searchParams, {
									state: {
										suppressLoadingBar: true,
									},
									preventScrollReset: true,
								});
							}}
						>
							<SelectTrigger className="text-xs h-9 w-full md:w-36 bg-background">
								<SelectValue placeholder="Urgency" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Urgencies</SelectItem>
								<SelectItem value="critical">Critical</SelectItem>
								<SelectItem value="urgent">Urgent</SelectItem>
								<SelectItem value="routine">Routine</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Requests Grid */}
				{filteredRequests.length === 0 ? (
					<div className="text-center py-16 border border-dashed border-border/80 rounded-2xl bg-card space-y-3">
						<Droplet className="h-10 w-10 text-muted-foreground mx-auto" />
						<h3 className="font-bold text-foreground text-sm">
							No active requests found in this region
						</h3>
						<p className="text-xs text-muted-foreground max-w-xs mx-auto">
							Try resetting your regional map filter or searching for a different hospital.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{filteredRequests.map((item: any) => {
							const needed = item.units_needed || 1;
							const fulfilled = item.units_fulfilled || 0;
							const progress = Math.min(100, (fulfilled / needed) * 100);

							return (
								<Card
									key={item.id}
									className="border border-border/70 bg-card rounded-2xl shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
								>
									<CardContent className="p-5 space-y-4">
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-base font-black text-primary">
													{item.blood_group}
												</div>
												<div>
													<span
														className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mb-1 ${
															item.urgency === "critical"
																? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
																: "bg-amber-500/15 text-amber-600 border border-amber-500/30"
														}`}
													>
														{item.urgency}
													</span>
													<h3 className="font-bold text-sm text-foreground">
														{needed} Units Required
													</h3>
												</div>
											</div>
										</div>

										<div className="space-y-1.5 text-xs text-muted-foreground pt-1">
											<p className="flex items-center gap-1.5 truncate">
												<Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
												<span className="truncate text-foreground font-medium">
													{item.hospitals?.name || "Hospital"}
												</span>
											</p>
											<p className="flex items-center gap-1.5">
												<MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
												<span>{item.hospitals?.city || "Pakistan"}</span>
											</p>
										</div>

										{/* Progress Bar */}
										<div className="space-y-1.5 pt-2 border-t border-border/50">
											<div className="flex items-center justify-between text-xs">
												<span className="text-muted-foreground">Fulfillment</span>
												<span className="font-bold text-foreground">
													{fulfilled} / {needed} Units
												</span>
											</div>
											<div className="h-1.5 overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-emerald-500 transition-all"
													style={{ width: `${progress}%` }}
												/>
											</div>
										</div>
									</CardContent>

									<div className="p-4 pt-0">
										<Button className="w-full text-xs font-semibold h-9 shadow-2xs">
											<Link to={`/requests/${item.id}`}>View & Respond</Link>
										</Button>
									</div>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
