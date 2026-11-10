import { Link } from "react-router";
import { Heart, Clock, MapPin, Phone, AlertTriangle } from "lucide-react";

export const meta = () => [
	{ title: "Donor Guidelines | DonateNow" },
	{
		name: "description",
		content: "Safety rules and best practices for blood donors on DonateNow.",
	},
];

export default function SafetyPage() {
	return (
		<div className="min-h-screen bg-background">
			{/* Simple top bar */}
			<header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
				<div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
					<Link to="/" className="flex items-center gap-2">
						<img src="/logo.png" className="h-7 mix-blend-multiply" alt="DonateNow" />
					</Link>
					<Link
						to="/"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						← Back to app
					</Link>
				</div>
			</header>

			<main className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
				<div className="space-y-2 mb-10">
					<p className="text-sm font-medium text-primary">Trust & Safety</p>
					<h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Donor Guidelines</h1>
					<p className="text-muted-foreground text-lg">
						Simple rules to keep everyone safe while saving lives.
					</p>
				</div>

				<div className="prose prose-neutral dark:prose-invert max-w-none space-y-10">
					{/* Eligibility */}
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Heart className="h-4 w-4 text-primary" />
							</div>
							<h2 className="text-xl font-semibold m-0">Who can donate?</h2>
						</div>
						<ul className="space-y-2 text-muted-foreground">
							<li>You must be in good general health on the day of donation.</li>
							<li>
								Standard recovery period is <strong>56 days</strong> (about 8 weeks) between
								whole-blood donations. The app automatically tracks this for you.
							</li>
							<li>
								Always follow the screening rules of the hospital or blood bank where you
								donate. DonateNow does <strong>not</strong> replace medical screening.
							</li>
						</ul>
					</section>

					{/* Before you go */}
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Clock className="h-4 w-4 text-primary" />
							</div>
							<h2 className="text-xl font-semibold m-0">Before you accept a request</h2>
						</div>
						<ul className="space-y-2 text-muted-foreground">
							<li>Check that you are currently eligible (no active cooldown).</li>
							<li>Confirm the hospital location and estimated travel time.</li>
							<li>
								Only accept if you can realistically reach the hospital within a reasonable
								time.
							</li>
							<li>
								If you are unsure about your health status, decline the request — there is no
								penalty.
							</li>
						</ul>
					</section>

					{/* At the hospital */}
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<MapPin className="h-4 w-4 text-primary" />
							</div>
							<h2 className="text-xl font-semibold m-0">At the hospital</h2>
						</div>
						<ul className="space-y-2 text-muted-foreground">
							<li>Bring a valid ID.</li>
							<li>
								Complete the hospital’s own donor questionnaire and screening. Their decision
								is final.
							</li>
							<li>
								After donating, mark the donation as completed in the app so the requester and
								other donors know the request is fulfilled.
							</li>
						</ul>
					</section>

					{/* Privacy & Contact */}
					<section className="space-y-4">
						<div className="flex items-center gap-2">
							<div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
								<Phone className="h-4 w-4 text-primary" />
							</div>
							<h2 className="text-xl font-semibold m-0">Contact & privacy</h2>
						</div>
						<ul className="space-y-2 text-muted-foreground">
							<li>
								Your phone number is shared with a requester{" "}
								<strong>only after you accept</strong> their request.
							</li>
							<li>
								Do not share personal information beyond what is needed for the donation
								coordination.
							</li>
							<li>
								If a requester asks for money, payment, or anything unrelated to blood
								donation, report the request immediately.
							</li>
						</ul>
					</section>

					{/* Important disclaimer */}
					<section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
						<div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
							<AlertTriangle className="h-5 w-5 shrink-0" />
							<h2 className="text-base font-semibold m-0">Important medical disclaimer</h2>
						</div>
						<p className="text-sm text-muted-foreground leading-relaxed m-0">
							DonateNow is a coordination platform only. We do not collect, store, or test
							blood. All medical screening, blood testing, and transfusion decisions are the
							responsibility of the hospital or licensed blood bank. Always follow their
							professional advice.
						</p>
					</section>
				</div>

				<div className="mt-14 pt-8 border-t text-sm text-muted-foreground">
					Last updated: November 2026
				</div>
			</main>
		</div>
	);
}
