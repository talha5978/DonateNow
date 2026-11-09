import { useState, useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Checkbox } from "~/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
	User,
	ShieldAlert,
	CheckCircle2,
	Loader2,
	Phone,
	Droplet,
	MapPin,
	Calendar,
	Navigation,
} from "lucide-react";
import { toast } from "sonner";

interface ProfileDialogProps {
	profile: {
		full_name?: string;
		phone?: string;
		blood_group?: string;
		status?: string;
		strikes?: number;
		email?: string;
		available?: boolean;
		last_donated_at?: string;
		geo?: string; // POINT(lng lat) format from PostGIS
	};
	triggerButton?: React.ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function ProfileDialog({
	profile,
	triggerButton,
	open: controlledOpen,
	onOpenChange,
}: ProfileDialogProps) {
	const fetcher = useFetcher();
	const [internalOpen, setInternalOpen] = useState(false);
	const wasSubmitting = useRef(false);
	const open = controlledOpen ?? internalOpen;

	const handleOpenChange = (nextOpen: boolean) => {
		if (controlledOpen === undefined) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
	};

	// Parse lat/lng from PostGIS geo string if available (e.g., "POINT(71.5249 29.3984)")
	const extractCoords = (geoStr?: string) => {
		if (!geoStr || typeof geoStr !== "string") {
			return { lat: "", lng: "" };
		}

		const pointMatch = geoStr.match(/POINT\(\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s*\)/i);
		if (pointMatch) {
			return { lng: pointMatch[1], lat: pointMatch[2] };
		}

		const hex = geoStr.trim().replace(/^\\x/i, "");
		if (hex.length < 42 || hex.length % 2 !== 0 || !/^[\da-f]+$/i.test(hex)) {
			return { lat: "", lng: "" };
		}

		const bytes = new Uint8Array(hex.length / 2);
		for (let i = 0; i < bytes.length; i++) {
			bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		}

		const view = new DataView(bytes.buffer);
		const byteOrder = view.getUint8(0);
		if (byteOrder !== 0 && byteOrder !== 1) {
			return { lat: "", lng: "" };
		}

		const littleEndian = byteOrder === 1;
		const geometryType = view.getUint32(1, littleEndian);
		const hasSrid = (geometryType & 0x20000000) !== 0;
		const coordinateOffset = hasSrid ? 9 : 5;
		if (bytes.length < coordinateOffset + 16) {
			return { lat: "", lng: "" };
		}

		const lng = view.getFloat64(coordinateOffset, littleEndian);
		const lat = view.getFloat64(coordinateOffset + 8, littleEndian);
		return Number.isFinite(lat) && Number.isFinite(lng)
			? { lat: String(lat), lng: String(lng) }
			: { lat: "", lng: "" };
	};

	const initialCoords = extractCoords(profile.geo);
	const [latitude, setLatitude] = useState(initialCoords.lat);
	const [longitude, setLongitude] = useState(initialCoords.lng);
	const [isLocating, setIsLocating] = useState(false);
	const [locationStatus, setLocationStatus] = useState<string | null>(null);

	const isSubmitting = fetcher.state === "submitting";

	useEffect(() => {
		if (fetcher.state !== "idle") {
			wasSubmitting.current = true;
			return;
		}

		const justSubmitted = wasSubmitting.current;
		wasSubmitting.current = false;

		if (justSubmitted && fetcher.data) {
			if (fetcher.data.ok) {
				toast.success(fetcher.data.message || "Profile updated successfully!");
				if (open) {
					if (controlledOpen === undefined) {
						setInternalOpen(false);
					}
					onOpenChange?.(false);
				}
			} else {
				toast.error(fetcher.data.message || "Failed to update profile. Please try again.");
			}
		}
	}, [fetcher.data, fetcher.state, open, controlledOpen, onOpenChange]);

	// Geolocation helper to fetch current device coordinates
	const handleGetLocation = () => {
		if (!navigator.geolocation) {
			setLocationStatus("Geolocation is not supported by your browser");
			return;
		}

		setIsLocating(true);
		setLocationStatus("Detecting your location...");

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLatitude(position.coords.latitude.toFixed(6));
				setLongitude(position.coords.longitude.toFixed(6));
				setIsLocating(false);
				setLocationStatus("Location updated successfully!");
			},
			(error) => {
				console.error(error);
				setIsLocating(false);
				setLocationStatus("Unable to retrieve your location. Please check permissions.");
			},
			{ timeout: 10000, enableHighAccuracy: true },
		);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{controlledOpen === undefined && (
				<DialogTrigger>
					{triggerButton || (
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start gap-2 text-xs font-medium"
						>
							<User className="h-4 w-4" />
							<span>My Profile & Location</span>
						</Button>
					)}
				</DialogTrigger>
			)}

			<DialogContent className="sm:max-w-lg rounded-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
				<DialogHeader className="space-y-1">
					<DialogTitle className="text-xl font-black tracking-tight">
						Account & Donor Profile
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						Manage your personal details, donation availability, and live emergency map
						coordinates.
					</DialogDescription>
				</DialogHeader>

				<fetcher.Form method="post" action="/update-profile" className="space-y-4">
					{/* Hidden Coordinate Fields submitted to Action */}
					<input type="hidden" name="latitude" value={latitude} />
					<input type="hidden" name="longitude" value={longitude} />

					{/* Trust & Status Overview Banner */}
					<div className="bg-muted/40 border border-border/60 rounded-xl p-3.5 flex items-center justify-between text-xs">
						<div className="flex items-center gap-2.5">
							<div
								className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
									profile.status === "active"
										? "bg-emerald-500/10 text-emerald-600"
										: "bg-amber-500/10 text-amber-600"
								}`}
							>
								{profile.status === "active" ? (
									<CheckCircle2 className="h-4 w-4" />
								) : (
									<ShieldAlert className="h-4 w-4" />
								)}
							</div>
							<div>
								<p className="font-bold capitalize text-foreground flex items-center gap-1.5">
									Status:{" "}
									<span
										className={
											profile.status === "active"
												? "text-emerald-600"
												: "text-amber-600"
										}
									>
										{profile.status || "Active"}
									</span>
								</p>
								<p className="text-[11px] text-muted-foreground">
									Safety Strikes:{" "}
									<strong className="text-foreground">{profile.strikes || 0}</strong>
								</p>
							</div>
						</div>
						<span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
							Verified Peer
						</span>
					</div>

					{/* Editable Form Fields */}
					<div className="space-y-6">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
								<User className="h-3.5 w-3.5 text-primary" /> Full Name
							</label>
							<Input
								type="text"
								name="full_name"
								defaultValue={profile.full_name || ""}
								placeholder="Enter your full name"
								required
								className="text-xs bg-background h-9 w-full"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
								<Phone className="h-3.5 w-3.5 text-primary" /> Phone Number (For Emergency
								Contact)
							</label>
							<Input
								type="tel"
								name="phone"
								defaultValue={profile.phone || ""}
								placeholder="e.g., +92 300 1234567"
								required
								className="text-xs bg-background h-9 w-full"
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
									<Droplet className="h-3.5 w-3.5 text-primary" /> Blood Group
								</label>
								<Select name="blood_group" defaultValue={profile.blood_group || "O+"}>
									<SelectTrigger className="w-full min-w-full text-xs bg-background h-9 [&>span]:capitalize">
										<SelectValue placeholder="Select group" />
									</SelectTrigger>
									<SelectContent>
										{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
											<SelectItem key={group} value={group}>
												{group}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-1.5">
								<label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
									<Calendar className="h-3.5 w-3.5 text-primary" /> Last Donated Date
								</label>
								<Input
									type="date"
									name="last_donated_at"
									defaultValue={
										profile.last_donated_at ? profile.last_donated_at.split("T")[0] : ""
									}
									className="text-xs bg-background h-9 w-full"
								/>
							</div>
						</div>

						{/* Availability Toggle */}
						<div className="flex items-center justify-between bg-muted/30 border border-border/50 rounded-xl p-3">
							<div className="space-y-0.5">
								<label className="text-xs font-semibold text-foreground">
									Available for Donation
								</label>
								<p className="text-[11px] text-muted-foreground">
									Show your profile in active donor matching feeds.
								</p>
							</div>
							<Checkbox
								id="available"
								name="available"
								defaultChecked={profile.available ?? true}
							/>
						</div>

						{/* Location / Geo-coordinates Section */}
						<div className="bg-muted/20 border border-border/60 rounded-xl p-3.5 space-y-2.5">
							<div className="flex items-center justify-between">
								<label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
									<MapPin className="h-3.5 w-3.5 text-primary" /> Live Map Coordinates
								</label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleGetLocation}
									disabled={isLocating}
									className="h-7 text-[11px] gap-1 font-semibold"
								>
									{isLocating ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<Navigation className="h-3 w-3" />
									)}
									<span>Detect My Location</span>
								</Button>
							</div>

							<div className="grid grid-cols-2 gap-2 text-xs [&>div]:space-y-2">
								<div className="bg-background border border-border/50 rounded-lg p-2">
									<span className="text-[10px] text-muted-foreground uppercase block font-medium">
										Latitude
									</span>
									<span className="font-mono font-bold text-foreground">
										{latitude || "Not set"}
									</span>
								</div>
								<div className="bg-background border border-border/50 rounded-lg p-2">
									<span className="text-[10px] text-muted-foreground uppercase block font-medium">
										Longitude
									</span>
									<span className="font-mono font-bold text-foreground">
										{longitude || "Not set"}
									</span>
								</div>
							</div>

							{locationStatus && (
								<p className="text-[11px] text-muted-foreground italic">{locationStatus}</p>
							)}
						</div>
					</div>

					{fetcher.data?.message && !fetcher.data?.ok && (
						<p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
							{fetcher.data.message}
						</p>
					)}

					<DialogFooter className="pt-2 gap-2 sm:gap-0">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => handleOpenChange(false)}
							className="text-xs h-9"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={isSubmitting}
							className="text-xs font-semibold h-9 shadow-2xs gap-1.5"
						>
							{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
							<span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
						</Button>
					</DialogFooter>
				</fetcher.Form>
			</DialogContent>
		</Dialog>
	);
}
