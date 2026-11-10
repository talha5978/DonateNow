import { Link, type LoaderFunctionArgs } from "react-router";
import { AuthService } from "~/services/auth.service.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
	ShieldCheck,
	Zap,
	Users,
	ArrowRight,
	CheckCircle2,
	FileText,
	BellRing,
	HeartHandshake,
} from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data } = await auth.getCurrentProfile();

	// If user is already logged in, redirect them to the main app feed
	if (data?.user) {
		throw new Response(null, {
			status: 302,
			headers: { Location: "/" },
		});
	}

	return null;
}

export const meta = () => [
	{ title: "DonateNow — Emergency Blood Coordination Network" },
	{
		name: "description",
		content:
			"Connect blood donors with emergency requesters instantly through structured verification and smart wave notifications. No middlemen, no delays.",
	},
];

export default function PublicLandingPage() {
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
			{/* Top Minimal Navigation */}
			<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
				<div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
					<div className="flex items-center gap-2">
						<img src="/logo.png" className="h-7 w-7 mix-blend-multiply" alt="DonateNow" />
						<span className="text-lg font-bold tracking-tight">
							Donate<span className="text-primary">Now</span>
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="sm" className="font-medium text-xs sm:text-sm">
							<Link to="/login">Sign In</Link>
						</Button>
						<Button size="sm" className="font-medium shadow-2xs text-xs sm:text-sm">
							<Link to="/signup">Get Started</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				{/* Hero Section */}
				<section className="relative overflow-hidden py-20 sm:py-28 lg:py-32 border-b border-border/40 bg-linear-to-b from-muted/30 via-background to-background">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-3xl mx-auto text-center space-y-6">
							<div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3.5 py-1 text-xs font-medium text-foreground">
								<span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
								Zero Admin Bottlenecks • Direct P2P Emergency Network
							</div>

							<h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.1]">
								Emergency blood coordination,{" "}
								<span className="text-primary">without the WhatsApp chaos.</span>
							</h1>

							<p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
								Stop forwarding unverified messages across groups. DonateNow organizes
								emergency requests, manages hospital verification slips, and alerts compatible
								local donors in smart waves.
							</p>

							<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
								<Link to="/signup" className="flex items-center gap-2">
									<Button
										size="lg"
										className="w-full sm:w-auto font-semibold h-11 px-8 shadow-sm"
									>
										<span>Join as Donor or Requester</span>
										<ArrowRight className="h-4 w-4" />
									</Button>
								</Link>
								<Link to="/login">
									<Button
										variant="outline"
										size="lg"
										className="w-full sm:w-auto h-11 px-8 font-medium"
									>
										Sign In to Account
									</Button>
								</Link>
							</div>

							{/* Mini Feature Badges */}
							<div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground max-w-xl mx-auto border-t border-border/40 mt-12">
								<div className="flex items-center justify-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
									<span>Structured Request Intake</span>
								</div>
								<div className="flex items-center justify-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
									<span>Hospital Slip Audit</span>
								</div>
								<div className="flex items-center justify-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
									<span>Targeted Wave Alerts</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Platform Impact Stats */}
				<section className="py-16 border-b border-border/40 bg-muted/10">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
									Direct
								</p>
								<p className="text-sm text-muted-foreground">Peer-to-peer connection lines</p>
							</div>
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
									100%
								</p>
								<p className="text-sm text-muted-foreground">Transparent trust tracking</p>
							</div>
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
									Zero
								</p>
								<p className="text-sm text-muted-foreground">Manual intermediary delays</p>
							</div>
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
									Smart
								</p>
								<p className="text-sm text-muted-foreground">Location-based filtering</p>
							</div>
						</div>
					</div>
				</section>

				{/* VISUALIZED WORKFLOW SECTION: How the Portal Connects Donors & Recipients */}
				<section className="py-24 bg-background border-b border-border/40">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
							<h2 className="text-3xl font-bold tracking-tight">
								How DonateNow Connects Donors & Requesters
							</h2>
							<p className="text-muted-foreground text-sm sm:text-base">
								A streamlined, automated lifecycle designed to eliminate noise and bridge
								emergency needs with verified help.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
							{/* Step 1 */}
							<div className="bg-card border border-border/70 rounded-2xl p-6 space-y-4 relative shadow-2xs flex flex-col justify-between">
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
											01
										</div>
										<span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
											Requester Action
										</span>
									</div>
									<h3 className="text-lg font-bold">Publish Emergency Request</h3>
									<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
										Requesters specify blood group, hospital location, units needed, and
										urgency level through a clean, guided form.
									</p>
								</div>
								<div className="pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-primary font-semibold">
									<FileText className="h-4 w-4" /> Instant Feed Broadcast
								</div>
							</div>

							{/* Step 2 */}
							<div className="bg-card border border-border/70 rounded-2xl p-6 space-y-4 relative shadow-2xs flex flex-col justify-between">
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
											02
										</div>
										<span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
											Platform Matching
										</span>
									</div>
									<h3 className="text-lg font-bold">Smart Donor Notification</h3>
									<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
										The system cross-references active donors by blood compatibility, live
										location, and 56-day medical recovery status to notify eligible peers.
									</p>
								</div>
								<div className="pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-primary font-semibold">
									<BellRing className="h-4 w-4" /> Targeted Wave Alerts
								</div>
							</div>

							{/* Step 3 */}
							<div className="bg-card border border-border/70 rounded-2xl p-6 space-y-4 relative shadow-2xs flex flex-col justify-between">
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
											03
										</div>
										<span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
											Fulfillment Loop
										</span>
									</div>
									<h3 className="text-lg font-bold">Hospital Meet & Confirmation</h3>
									<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
										Donors accept and coordinate directly. Once blood is successfully
										donated at the hospital, the requester confirms fulfillment to close
										the loop and update records.
									</p>
								</div>
								<div className="pt-4 border-t border-border/40 flex items-center gap-2 text-xs text-primary font-semibold">
									<HeartHandshake className="h-4 w-4" /> Verified Impact Ledger
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Core Features Grid */}
				<section className="py-20 sm:py-24 bg-muted/10">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
							<h2 className="text-3xl font-bold tracking-tight">
								Designed for real emergencies
							</h2>
							<p className="text-muted-foreground text-sm sm:text-base">
								Traditional blood donation relies on static phone lists and unverified
								screenshots. DonateNow provides structure and accountability.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
							<Card className="border border-border/60 bg-card shadow-none rounded-2xl">
								<CardContent className="p-6 space-y-4">
									<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
										<Zap className="h-5 w-5" />
									</div>
									<h3 className="font-bold text-lg">Streamlined Intake</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										Post critical requirements quickly with standardized fields for blood
										groups, hospital facilities, and contact details.
									</p>
								</CardContent>
							</Card>

							<Card className="border border-border/60 bg-card shadow-none rounded-2xl">
								<CardContent className="p-6 space-y-4">
									<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
										<ShieldCheck className="h-5 w-5" />
									</div>
									<h3 className="font-bold text-lg">Transparent Trust & Safety</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										Built-in safety metrics, strike decay rules, and automated 56-day
										medical recovery tracking keep the donor community safe and reliable.
									</p>
								</CardContent>
							</Card>

							<Card className="border border-border/60 bg-card shadow-none rounded-2xl">
								<CardContent className="p-6 space-y-4">
									<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
										<Users className="h-5 w-5" />
									</div>
									<h3 className="font-bold text-lg">Direct Coordination</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										Requesters and donors connect seamlessly through integrated contact
										tools and status management dashboards.
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				{/* Community Testimonials */}
				<section className="py-20 sm:py-24 border-t border-border/40 bg-background">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
							<h2 className="text-3xl font-bold tracking-tight">
								Trusted by donors and families
							</h2>
							<p className="text-muted-foreground text-sm sm:text-base">
								See how community-driven coordination makes a critical difference during
								emergency hospital visits.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
							<Card className="border border-border/60 bg-muted/20 shadow-none rounded-2xl">
								<CardContent className="p-6 space-y-4">
									<div className="flex items-center gap-1 text-primary">
										{"★".repeat(5)}
									</div>
									<p className="text-sm italic leading-relaxed text-foreground">
										&ldquo;When we needed emergency units late at night, having a
										structured platform to coordinate our request instead of scrolling
										through endless group messages saved us precious hours.&rdquo;
									</p>
									<div className="flex items-center gap-3 pt-2">
										<div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs">
											FA
										</div>
										<div>
											<p className="text-xs font-semibold">Fahad Ahmed</p>
											<p className="text-[11px] text-muted-foreground">
												Patient Attendant
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border border-border/60 bg-muted/20 shadow-none rounded-2xl">
								<CardContent className="p-6 space-y-4">
									<div className="flex items-center gap-1 text-primary">
										{"★".repeat(5)}
									</div>
									<p className="text-sm italic leading-relaxed text-foreground">
										&ldquo;As a regular donor, the platform's cooldown tracking helps me
										manage my health and recovery timeline properly while making sure I'm
										available when urgent requests pop up nearby.&rdquo;
									</p>
									<div className="flex items-center gap-3 pt-2">
										<div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs">
											US
										</div>
										<div>
											<p className="text-xs font-semibold">Usman Shah</p>
											<p className="text-[11px] text-muted-foreground">
												Active Blood Donor
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				{/* Final CTA Section */}
				<section className="py-20 border-t border-border/40 bg-muted/20">
					<div className="container mx-auto px-4 sm:px-6 text-center">
						<div className="max-w-2xl mx-auto space-y-6">
							<h2 className="text-3xl font-bold tracking-tight">
								Ready to join the emergency network?
							</h2>
							<p className="text-muted-foreground text-sm sm:text-base">
								Whether you want to register as an eligible donor or need assistance with
								urgent blood coordination, your account is ready in seconds.
							</p>
							<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
								<Link to="/signup">
									<Button size="lg" className="w-full sm:w-auto font-semibold px-8 h-11">
										Create Free Account
									</Button>
								</Link>
								<Link to="/login">
									<Button
										variant="outline"
										size="lg"
										className="w-full sm:w-auto px-8 h-11 font-medium"
									>
										Sign In
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="border-t border-border/40 bg-background text-muted-foreground py-8">
				<div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
					<p>© {new Date().getFullYear()} DonateNow. Open peer-to-peer emergency blood network.</p>
					<div className="flex items-center gap-6">
						<Link to="/login" className="hover:text-foreground transition-colors">
							Sign In
						</Link>
						<Link to="/signup" className="hover:text-foreground transition-colors">
							Register
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
}
