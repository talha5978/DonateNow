import { Link } from "react-router";

export const meta = () => [
	{ title: "Terms of Service | DonateNow" },
	{
		name: "description",
		content: "Terms governing the use of the DonateNow emergency blood coordination platform.",
	},
];

export default function TermsPage() {
	return (
		<div className="min-h-screen bg-background">
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
					<p className="text-sm font-medium text-primary">Legal</p>
					<h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Terms of Service</h1>
					<p className="text-muted-foreground">Last updated: November 10, 2026</p>
				</div>

				<div className="space-y-10 text-[15px] leading-relaxed text-muted-foreground">
					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
						<p>
							By creating an account or using DonateNow you agree to these Terms of Service and
							our Privacy Policy. If you do not agree, please do not use the platform.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">2. What DonateNow is</h2>
						<p>
							DonateNow is a peer-to-peer coordination tool that helps people post emergency
							blood requests and connect with nearby compatible donors. We are{" "}
							<strong className="text-foreground">not</strong> a blood bank, hospital, or
							medical service provider. We do not collect, store, test, or transfuse blood.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">3. Your responsibilities</h2>
						<ul className="list-disc pl-5 space-y-1.5">
							<li>Provide accurate information (blood group, location, contact details).</li>
							<li>
								Only post genuine emergency requests. False or fraudulent requests are
								strictly prohibited.
							</li>
							<li>
								Follow all hospital and blood-bank screening procedures. Their medical
								decision is final.
							</li>
							<li>
								Do not demand or offer payment for blood. Commercialization of blood is not
								allowed on this platform.
							</li>
							<li>
								Treat other users with respect. Harassment or abuse will result in removal.
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">4. Eligibility to donate</h2>
						<p>
							You are solely responsible for confirming that you meet the medical and legal
							requirements to donate blood in your jurisdiction. The 56-day recovery period
							shown in the app is a general guideline; always follow the advice of the
							collecting facility.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">5. No medical advice</h2>
						<p>
							Nothing on DonateNow constitutes medical advice. All clinical decisions (including
							whether you are fit to donate or receive blood) are made by licensed medical
							professionals at the hospital or blood bank.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">6. Limitation of liability</h2>
						<p>
							DonateNow and its operators are not liable for any injury, loss, or damage arising
							from the use of the platform, including (but not limited to) failed matches,
							incorrect information provided by users, or decisions made by hospitals. The
							service is provided “as is”.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">7. Account suspension</h2>
						<p>
							We may suspend or permanently disable accounts that post fraudulent requests,
							spam, harass other users, or otherwise violate these terms. Automated risk scoring
							and peer reports help us enforce this.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">8. Changes to the service</h2>
						<p>
							We may modify or discontinue features at any time. We will try to give reasonable
							notice of significant changes when possible.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">9. Governing law</h2>
						<p>
							These terms are governed by the laws of Pakistan. Any disputes will be handled in
							the courts of competent jurisdiction in Pakistan.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
						<p>
							For questions about these Terms, please reach out through the support channels
							available in the app.
						</p>
					</section>
				</div>
			</main>
		</div>
	);
}
