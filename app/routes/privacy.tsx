import { Link } from "react-router";

export const meta = () => [
	{ title: "Privacy Policy | DonateNow" },
	{
		name: "description",
		content: "How DonateNow collects, uses, and protects your personal information.",
	},
];

export default function PrivacyPage() {
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
					<h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Privacy Policy</h1>
					<p className="text-muted-foreground">Last updated: November 10, 2026</p>
				</div>

				<div className="space-y-10 text-[15px] leading-relaxed text-muted-foreground">
					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">1. Information we collect</h2>
						<p>When you use DonateNow we may collect:</p>
						<ul className="list-disc pl-5 space-y-1.5">
							<li>
								<strong className="text-foreground">Account data</strong> — name, email, phone
								number, blood group, approximate location (coarse), and last donation date.
							</li>
							<li>
								<strong className="text-foreground">Request data</strong> — blood requests you
								create or respond to, including hospital name and urgency.
							</li>
							<li>
								<strong className="text-foreground">Usage data</strong> — basic technical logs
								needed to operate and improve the service (e.g. device type, approximate
								region).
							</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">
							2. How we use your information
						</h2>
						<ul className="list-disc pl-5 space-y-1.5">
							<li>To match compatible donors with nearby emergency requests.</li>
							<li>To notify you of relevant blood requests (wave notifications).</li>
							<li>To enforce the 56-day donation recovery period.</li>
							<li>To detect and reduce spam or fraudulent requests.</li>
							<li>To improve the reliability and safety of the platform.</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">
							3. When we share information
						</h2>
						<p>
							We share the minimum information necessary. Your phone number is revealed to a
							requester <strong className="text-foreground">only after you accept</strong> their
							request. We never sell personal data. We may share anonymized, aggregated
							statistics (for example, which blood groups are most needed in a city).
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">4. Location data</h2>
						<p>
							We store only a coarse location (not your exact address) so we can calculate
							distance to hospitals and rank nearby requests. You can update or clear this data
							from your profile at any time.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">5. Data retention</h2>
						<p>
							We keep your account and donation history for as long as your account is active so
							we can correctly apply eligibility rules. You may request deletion of your account
							and associated personal data by contacting us.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">6. Security</h2>
						<p>
							We use industry-standard measures (encrypted connections, access controls, and
							secure authentication) to protect your data. No system is 100% secure; please use
							a strong password and keep your login details private.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">7. Children’s privacy</h2>
						<p>
							DonateNow is intended for adults who are eligible to donate blood under local
							regulations. We do not knowingly collect data from children.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">8. Changes to this policy</h2>
						<p>
							We may update this Privacy Policy from time to time. The “Last updated” date at
							the top will always reflect the latest version. Continued use of the service after
							changes means you accept the updated policy.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
						<p>
							If you have questions about privacy or wish to request access or deletion of your
							data, please contact us through the app or the support channels listed on the
							platform.
						</p>
					</section>
				</div>
			</main>
		</div>
	);
}
