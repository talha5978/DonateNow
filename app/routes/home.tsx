import { Link, type LoaderFunctionArgs } from "react-router";
import { AuthService } from "~/services/auth.service.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { ShieldCheck, Zap, Users, ArrowRight, CheckCircle2 } from "lucide-react";

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
			"Connect blood donors with emergency requesters instantly through AI verification and smart wave notifications. No middlemen, no delays.",
	},
];

export default function PublicLandingPage() {
	return (
		<div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent">
			{/* Top Minimal Navigation */}
			<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
				<div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
					<div className="flex items-center gap-2">
						<img src="/logo_icon.png" className="h-7 w-7 mix-blend-multiply" alt="DonateNow" />
						<span className="text-lg font-bold tracking-tight">
							Donate<span className="text-primary">Now</span>
						</span>
					</div>
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="sm" className="font-medium">
							<Link to="/login">Sign In</Link>
						</Button>
						<Button size="sm" className="font-medium shadow-sm">
							<Link to="/signup">Get Started</Link>
						</Button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				{/* Hero Section */}
				<section className="relative overflow-hidden py-20 sm:py-28 lg:py-32 border-b border-border/40 bg-muted/20">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-3xl mx-auto text-center space-y-6">
							<div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3.5 py-1 text-xs font-medium text-foreground">
								<span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
								Zero Admin Bottlenecks • Direct P2P Emergency Network
							</div>

							<h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.1]">
								Emergency blood coordination,{" "}
								<span className="text-primary">without the WhatsApp chaos.</span>
							</h1>

							<p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
								Stop forwarding unverified messages across groups. DonateNow parses emergency
								requests using AI, checks hospital slips, and alerts compatible local donors
								in smart waves.
							</p>

							<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
								<Button
									size="lg"
									className="w-full sm:w-auto font-medium h-11 px-8 shadow-sm"
								>
									<Link to="/signup" className="flex items-center gap-2">
										<span>Join as Donor or Requester</span>
										<ArrowRight className="h-4 w-4" />
									</Link>
								</Button>
								<Button
									variant="outline"
									size="lg"
									className="w-full sm:w-auto h-11 px-8 font-medium"
								>
									<Link to="/login">Sign In to Account</Link>
								</Button>
							</div>

							{/* Mini Feature Badges */}
							<div className="pt-8 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs text-muted-foreground max-w-xl mx-auto border-t border-border/40 mt-12">
								<div className="flex items-center justify-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>AI Text & Voice Intake</span>
								</div>
								<div className="flex items-center justify-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Hospital Slip Verification</span>
								</div>
								<div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5">
									<CheckCircle2 className="h-4 w-4 text-primary" />
									<span>Wave Notifications</span>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Platform Impact Stats */}
				<section className="py-16 border-b border-border/40 bg-background">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
									15 Min
								</p>
								<p className="text-sm text-muted-foreground">Average match response time</p>
							</div>
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
									100%
								</p>
								<p className="text-sm text-muted-foreground">
									Direct peer-to-peer connection
								</p>
							</div>
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
									Zero
								</p>
								<p className="text-sm text-muted-foreground">Human admin bottlenecks</p>
							</div>
							<div className="space-y-1">
								<p className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
									Smart
								</p>
								<p className="text-sm text-muted-foreground">Wave-based radius alerts</p>
							</div>
						</div>
					</div>
				</section>

				{/* What Problem We Solve & How It Works */}
				<section className="py-20 sm:py-24 bg-muted/10">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
							<h2 className="text-3xl font-bold tracking-tight">
								Designed for real emergencies
							</h2>
							<p className="text-muted-foreground">
								Traditional blood donation relies on static phone lists and unverified
								screenshots. DonateNow automates trust and speed.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							<Card className="border border-border/60 bg-card shadow-none">
								<CardContent className="p-6 space-y-4">
									<div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
										<Zap className="h-5 w-5" />
									</div>
									<h3 className="font-semibold text-lg">Instant AI Intake</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										Paste a messy WhatsApp forward or record a voice note in Urdu/English.
										Our AI instantly extracts blood group, units, hospital, and urgency.
									</p>
								</CardContent>
							</Card>

							<Card className="border border-border/60 bg-card shadow-none">
								<CardContent className="p-6 space-y-4">
									<div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
										<ShieldCheck className="h-5 w-5" />
									</div>
									<h3 className="font-semibold text-lg">Trust Without Admins</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										No human moderators slowing things down. Risk scoring, duplicate
										merging, and hospital slip verification ensure posts are genuine.
									</p>
								</CardContent>
							</Card>

							<Card className="border border-border/60 bg-card shadow-none">
								<CardContent className="p-6 space-y-4">
									<div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-accent-foreground">
										<Users className="h-5 w-5" />
									</div>
									<h3 className="font-semibold text-lg">Targeted Wave Alerts</h3>
									<p className="text-sm text-muted-foreground leading-relaxed">
										Donors are notified in graduated waves based on location proximity and
										blood compatibility, preventing notification fatigue.
									</p>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				{/* Community Reviews & Testimonials */}
				<section className="py-20 sm:py-24 border-t border-border/40 bg-background">
					<div className="container mx-auto px-4 sm:px-6">
						<div className="max-w-2xl mx-auto text-center space-y-4 mb-16">
							<h2 className="text-3xl font-bold tracking-tight">
								Trusted by donors and families
							</h2>
							<p className="text-muted-foreground">
								See how community-driven coordination makes a critical difference during
								emergencies.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
							<Card className="border border-border/60 bg-muted/20 shadow-none">
								<CardContent className="p-6 space-y-4">
									<div className="flex items-center gap-1 text-primary">
										{"★".repeat(5)}
									</div>
									<p className="text-sm italic leading-relaxed text-foreground">
										&ldquo;We needed 2 units of AB- blood late at night for our patient at
										Nishtar Hospital. Posting the voice note took seconds, and a donor
										responded within 20 minutes. This platform saved us hours of
										panic.&rdquo;
									</p>
									<div className="flex items-center gap-3 pt-2">
										<div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs">
											FA
										</div>
										<div>
											<p className="text-xs font-semibold">Fahad Ahmed</p>
											<p className="text-[11px] text-muted-foreground">
												Patient Attendant, Multan
											</p>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border border-border/60 bg-muted/20 shadow-none">
								<CardContent className="p-6 space-y-4">
									<div className="flex items-center gap-1 text-primary">
										{"★".repeat(5)}
									</div>
									<p className="text-sm italic leading-relaxed text-foreground">
										&ldquo;As a regular donor, I love that I only get pinged when someone
										nearby actually matches my blood type and urgency level. The wave
										notification system is brilliant and clean.&rdquo;
									</p>
									<div className="flex items-center gap-3 pt-2">
										<div className="h-9 w-9 rounded-full bg-muted text-muted-foreground font-semibold flex items-center justify-center text-xs">
											US
										</div>
										<div>
											<p className="text-xs font-semibold">Usman Shah</p>
											<p className="text-[11px] text-muted-foreground">
												Active O- Donor
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</section>

				{/* Final CTA Section */}
				<section className="py-20 border-t border-border/40 bg-muted/30">
					<div className="container mx-auto px-4 sm:px-6 text-center">
						<div className="max-w-2xl mx-auto space-y-6">
							<h2 className="text-3xl font-bold tracking-tight">
								Ready to join the emergency network?
							</h2>
							<p className="text-muted-foreground">
								Whether you want to register as an eligible donor or need urgent blood
								coordination, your account is ready in seconds.
							</p>
							<div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
								<Button size="lg" className="w-full sm:w-auto font-medium px-8 h-11">
									<Link to="/signup">Create Free Account</Link>
								</Button>
								<Button
									variant="outline"
									size="lg"
									className="w-full sm:w-auto px-8 h-11 font-medium"
								>
									<Link to="/login">Sign In</Link>
								</Button>
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
