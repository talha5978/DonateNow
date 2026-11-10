import { MapPin, Activity } from "lucide-react";

interface PakistanMapFilterProps {
	requests: any[];
	selectedRegion: string;
	onSelectRegion: (region: string) => void;
}

export function PakistanMapFilter({ requests, selectedRegion, onSelectRegion }: PakistanMapFilterProps) {
	// Map cities/locations to Pakistan administrative regions
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
		return "punjab"; // Default fallback region
	};

	// Calculate live counts per region
	const regionMapping: Record<string, { label: string; bg: string; border: string }> = {
		punjab: { label: "Punjab", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
		sindh: { label: "Sindh", bg: "bg-blue-500/10", border: "border-blue-500/30" },
		kpk: { label: "Khyber Pakhtunkhwa", bg: "bg-amber-500/10", border: "border-amber-500/30" },
		balochistan: { label: "Balochistan", bg: "bg-purple-500/10", border: "border-purple-500/30" },
		islamabad: { label: "Islamabad Capital", bg: "bg-rose-500/10", border: "border-rose-500/30" },
		kashmir: { label: "Azad Kashmir", bg: "bg-indigo-500/10", border: "border-indigo-500/30" },
		gilgit: { label: "Gilgit-Baltistan", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
	};

	const stats: Record<string, { count: number; critical: number }> = {};
	Object.keys(regionMapping).forEach((k) => {
		stats[k] = { count: 0, critical: 0 };
	});

	requests.forEach((req) => {
		const reg = getRegionForCity(req.hospitals?.city);
		if (stats[reg]) {
			stats[reg].count += 1;
			if (req.urgency === "critical") stats[reg].critical += 1;
		}
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<MapPin className="h-4 w-4 text-primary animate-bounce" />
					<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
						Interactive Regional Dispatch Map
					</h3>
				</div>
				{selectedRegion !== "all" && (
					<button
						onClick={() => onSelectRegion("all")}
						className="text-xs font-semibold text-primary hover:underline"
					>
						Reset Map Filter
					</button>
				)}
			</div>

			{/* Region Selectors / Pulse Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
				<button
					onClick={() => onSelectRegion("all")}
					className={`cursor-pointer p-3 rounded-xl border text-left transition-all ${
						selectedRegion === "all"
							? "bg-primary/10 text-foreground border-primary/40 ring-2 ring-primary/20 shadow-sm"
							: "bg-card border-border/70 hover:border-primary/50 text-foreground"
					}`}
				>
					<p className="text-[11px] font-bold uppercase tracking-wider opacity-80">All Pakistan</p>
					<p className="text-lg font-black mt-1">{requests.length}</p>
					<p className="text-[10px] opacity-70 mt-0.5">Active Emergencies</p>
				</button>

				{Object.entries(regionMapping).map(([key, meta]) => {
					const data = stats[key] || { count: 0, critical: 0 };
					const isSelected = selectedRegion === key;

					return (
						<button
							key={key}
							onClick={() => onSelectRegion(key)}

							className={`cursor-pointer p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${
								isSelected
									? `${meta.bg} ${meta.border} ring-2 ring-primary/30 shadow-sm scale-[1.02]`
									: `${meta.bg} ${meta.border} hover:border-primary/50 hover:shadow-sm`
							}`}
						>
							{data.critical > 0 && !isSelected && (
								<span className="absolute top-2 right-2 flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
								</span>
							)}
							<p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate group-hover:text-foreground">
								{meta.label}
							</p>
							<p className="text-lg font-black mt-1 text-foreground">{data.count}</p>
							<p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
								<Activity className="h-3 w-3 text-primary" /> {data.critical} Critical
							</p>
						</button>
					);
				})}
			</div>
		</div>
	);
}
