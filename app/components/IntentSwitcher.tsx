import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import {
	HeartHandshake,
	PlusCircle,
	FileText,
	Mic,
	MessageSquare,
	AlertTriangle,
	RefreshCw,
	X,
	Home,
	SlidersHorizontal,
} from "lucide-react";

const STORAGE_KEY = "donatenow_intent";

type Intent = "donate" | "need" | null;
type EntryMode = "form" | "paste" | "voice";

interface IntentSwitcherProps {
	/** Profile data needed for donate eligibility checks */
	profile: {
		available?: boolean | null;
		last_donated_at?: string | null;
	} | null;
}

const COOLDOWN_DAYS = 56;

function getCooldownInfo(lastDonatedAt?: string | null) {
	if (!lastDonatedAt) return { isCoolingDown: false, daysRemaining: 0 };

	const last = new Date(lastDonatedAt).getTime();
	const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
	const elapsed = Date.now() - last;

	if (elapsed < cooldownMs) {
		return {
			isCoolingDown: true,
			daysRemaining: Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000)),
		};
	}
	return { isCoolingDown: false, daysRemaining: 0 };
}

export function IntentSwitcher({ profile }: IntentSwitcherProps) {
	const navigate = useNavigate();

	const [intent, setIntent] = useState<Intent>(null);
	const [showChoice, setShowChoice] = useState(false);
	const [showDonateStatus, setShowDonateStatus] = useState(false);
	const [showNeedOptions, setShowNeedOptions] = useState(false);

	// Controls the expanded state when intent is "donate" or "need"
	const [isExpanded, setIsExpanded] = useState(false);

	// Load from localStorage on mount
	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY) as Intent;
		if (saved === "donate" || saved === "need") {
			setIntent(saved);
		} else {
			// First visit or cleared localStorage → force choice on every reload
			setShowChoice(true);
		}
	}, []);

	function saveIntent(value: Intent) {
		if (value) {
			localStorage.setItem(STORAGE_KEY, value);
		} else {
			localStorage.removeItem(STORAGE_KEY);
		}
		setIntent(value);
	}

	function handleDonate() {
		saveIntent("donate");
		setShowChoice(false);
		setIsExpanded(false);

		const { isCoolingDown } = getCooldownInfo(profile?.last_donated_at);
		const isUnavailable = profile?.available === false;

		if (isCoolingDown || isUnavailable) {
			setShowDonateStatus(true);
		} else {
			navigate("/");
		}
	}

	function handleNeed() {
		saveIntent("need");
		setShowChoice(false);
		setIsExpanded(false);
		setShowNeedOptions(true);
	}

	function handleEntryMode(mode: EntryMode) {
		setShowNeedOptions(false);
		setIsExpanded(false);
		navigate(`/requests/new?mode=${mode}`);
	}

	function resetIntentAndOpenSwitcher() {
		localStorage.removeItem(STORAGE_KEY);
		setIntent(null);
		setIsExpanded(false);
		setShowChoice(true);
	}

	const { isCoolingDown, daysRemaining } = getCooldownInfo(profile?.last_donated_at);
	const isUnavailable = profile?.available === false;

	return (
		<>
			{/* ========== FLOATING INTERACTION DYNAMIC BUTTONS ========== */}
			<div className="fixed bottom-6 md:bottom-8 right-6 md:right-8 z-50 flex flex-col items-end gap-2">
				{/* Expanded Menu Options when Intent is set to "Donate" */}
				{intent === "donate" && isExpanded && (
					<div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
						<button
							type="button"
							onClick={() => {
								setIsExpanded(false);
								navigate("/");
							}}
							className="cursor-pointer flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-semibold shadow-md hover:bg-muted transition-all text-foreground"
						>
							<Home className="h-4 w-4 text-primary" />
							<span>Go to Feed Page</span>
						</button>
						<button
							type="button"
							onClick={resetIntentAndOpenSwitcher}
							className="cursor-pointer flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-semibold shadow-md hover:bg-muted transition-all text-foreground"
						>
							<SlidersHorizontal className="h-4 w-4 text-primary" />
							<span>Change Intent</span>
						</button>
					</div>
				)}

				{/* Expanded Menu Options when Intent is set to "Need" */}
				{intent === "need" && isExpanded && (
					<div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
						<button
							type="button"
							onClick={() => {
								setIsExpanded(false);
								handleEntryMode("form");
							}}
							className="cursor-pointer flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-semibold shadow-md hover:bg-muted transition-all text-foreground"
						>
							<FileText className="h-4 w-4 text-primary" />
							<span>Manual Form Entry</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setIsExpanded(false);
								handleEntryMode("paste");
							}}
							className="cursor-pointer flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-semibold shadow-md hover:bg-muted transition-all text-foreground"
						>
							<MessageSquare className="h-4 w-4 text-primary" />
							<span>Paste WhatsApp Message</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setIsExpanded(false);
								handleEntryMode("voice");
							}}
							className="cursor-pointer flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-semibold shadow-md hover:bg-muted transition-all text-foreground"
						>
							<Mic className="h-4 w-4 text-primary" />
							<span>Record Voice Note</span>
						</button>
						<button
							type="button"
							onClick={resetIntentAndOpenSwitcher}
							className="cursor-pointer flex items-center gap-2 rounded-full bg-card border border-border px-4 py-2 text-xs font-semibold shadow-md hover:bg-muted transition-all text-foreground"
						>
							<SlidersHorizontal className="h-4 w-4 text-rose-500" />
							<span>Change Intent</span>
						</button>
					</div>
				)}

				{/* Main Floating Trigger Button (Becomes Cross (X) if intent is chosen and expanded) */}
				<button
					type="button"
					onClick={() => {
						if (!intent) {
							setShowChoice(true);
						} else {
							setIsExpanded(!isExpanded);
						}
					}}
					className="cursor-pointer group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:scale-110 active:scale-95 transition-all duration-300 ease-out focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
					aria-label="Toggle intent options"
				>
					{/* Subtle pulsing glow aura on hover */}
					<span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-700" />

					{/* Animated icon container with smooth rotation and scale */}
					<div
						className={`transition-transform duration-300 ease-out ${isExpanded ? "rotate-90 scale-110" : "rotate-0 scale-100"}`}
					>
						{intent && isExpanded ? (
							<X className="h-6 w-6 transition-transform" />
						) : intent ? (
							<HeartHandshake className="h-6 w-6 transition-transform group-hover:scale-110" />
						) : (
							<RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
						)}
					</div>
				</button>
			</div>

			{/* ========== MAIN CHOICE DIALOG (Shows on every reload if not in localStorage) ========== */}
			<Dialog open={showChoice} onOpenChange={setShowChoice}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="text-xl">What do you need right now?</DialogTitle>
						<DialogDescription>
							Choose one. Your preference is saved until you decide to change it.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 pt-2 [&>button]:cursor-pointer">
						<button
							type="button"
							onClick={handleDonate}
							className="cursor-pointer flex items-start gap-4 rounded-xl border border-border p-4 text-left hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors"
						>
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
								<HeartHandshake className="h-5 w-5" />
							</div>
							<div>
								<p className="font-semibold text-foreground">Donate Blood</p>
								<p className="text-sm text-muted-foreground mt-0.5">
									See nearby requests you can help with
								</p>
							</div>
						</button>

						<button
							type="button"
							onClick={handleNeed}
							className="cursor-pointer flex items-start gap-4 rounded-xl border border-border p-4 text-left hover:border-rose-500/50 hover:bg-rose-500/5 transition-colors"
						>
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
								<PlusCircle className="h-5 w-5" />
							</div>
							<div>
								<p className="font-semibold text-foreground">I Need Blood</p>
								<p className="text-sm text-muted-foreground mt-0.5">
									Post an emergency request
								</p>
							</div>
						</button>
					</div>
				</DialogContent>
			</Dialog>

			{/* ========== DONATE STATUS DIALOG (cooldown / unavailable) ========== */}
			<Dialog open={showDonateStatus} onOpenChange={setShowDonateStatus}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-amber-500" />
							You can’t donate right now
						</DialogTitle>
						<DialogDescription>
							<div className="space-y-3 pt-2 text-sm text-muted-foreground">
								{isCoolingDown && (
									<p>
										You are in the <strong>56-day recovery period</strong>.
										<strong className="text-foreground">
											{" "}
											{daysRemaining} day{daysRemaining === 1 ? "" : "s"}
										</strong>{" "}
										remaining before you become eligible again.
									</p>
								)}
								{isUnavailable && !isCoolingDown && (
									<p>
										Your profile is currently marked as <strong>unavailable</strong>. Turn
										availability on from your profile if you want to receive requests.
									</p>
								)}
								{isCoolingDown && isUnavailable && (
									<p className="text-xs">You also have availability turned off.</p>
								)}
							</div>
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-2 pt-2">
						<Button onClick={() => setShowDonateStatus(false)} variant="outline">
							Close
						</Button>
						<Button
							variant="secondary"
							onClick={() => {
								setShowDonateStatus(false);
								handleNeed();
							}}
						>
							I need blood instead
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* ========== NEED BLOOD – ENTRY METHOD DIALOG ========== */}
			<Dialog open={showNeedOptions} onOpenChange={setShowNeedOptions}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>How do you want to post the request?</DialogTitle>
						<DialogDescription>Choose the fastest way for you right now.</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 pt-2">
						<button
							type="button"
							onClick={() => handleEntryMode("form")}
							className="cursor-pointer flex items-start gap-4 rounded-xl border border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<FileText className="h-4 w-4" />
							</div>
							<div>
								<p className="font-semibold text-sm">Manual form</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Fill in the details yourself
								</p>
							</div>
						</button>

						<button
							type="button"
							onClick={() => handleEntryMode("paste")}
							className="cursor-pointer flex items-start gap-4 rounded-xl border border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<MessageSquare className="h-4 w-4" />
							</div>
							<div>
								<p className="font-semibold text-sm">Paste WhatsApp message</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									AI will extract the details for you
								</p>
							</div>
						</button>

						<button
							type="button"
							onClick={() => handleEntryMode("voice")}
							className="cursor-pointer flex items-start gap-4 rounded-xl border border-border p-4 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<Mic className="h-4 w-4" />
							</div>
							<div>
								<p className="font-semibold text-sm">Record voice note</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Speak in Urdu or English — AI will handle the rest
								</p>
							</div>
						</button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
