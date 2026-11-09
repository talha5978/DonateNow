import { Link } from "react-router";
import { HeartHandshake } from "lucide-react";

export function Footer() {
	return (
		<footer className="border-t bg-muted/20 text-muted-foreground">
			<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:py-12">
				<div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
					{/* Col 1: Brand & Info */}
					<div className="md:col-span-2 space-y-3">
						<div className="flex items-center gap-2">
							<img
								src="/logo_icon.png"
								className="h-6 w-6 mix-blend-multiply"
								alt="DonateNow"
							/>
							<span className="font-bold text-foreground text-base tracking-tight">
								Donate<span className="text-primary">Now</span>
							</span>
						</div>
						<p className="text-sm max-w-sm leading-relaxed">
							A peer-to-peer emergency blood coordination platform connecting donors directly
							with those in urgent medical need. AI-verified, fast, and community-driven.
						</p>
					</div>

					{/* Col 2: Quick Links */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
							Navigation
						</h3>
						<ul className="space-y-2 text-sm">
							<li>
								<Link to="/" className="hover:text-foreground transition-colors">
									Emergency Feed
								</Link>
							</li>
							<li>
								<Link to="/requests/new" className="hover:text-foreground transition-colors">
									Post a Request
								</Link>
							</li>
							<li>
								<Link to="/about" className="hover:text-foreground transition-colors">
									How AI Verification Works
								</Link>
							</li>
						</ul>
					</div>

					{/* Col 3: Legal & Safety */}
					<div className="space-y-3">
						<h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
							Trust & Safety
						</h3>
						<ul className="space-y-2 text-sm">
							<li>
								<Link to="/safety" className="hover:text-foreground transition-colors">
									Donor Guidelines
								</Link>
							</li>
							<li>
								<Link to="/privacy" className="hover:text-foreground transition-colors">
									Privacy Policy
								</Link>
							</li>
							<li>
								<Link to="/terms" className="hover:text-foreground transition-colors">
									Terms of Service
								</Link>
							</li>
						</ul>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
					<p>© {new Date().getFullYear()} DonateNow. Open emergency blood network.</p>
					<p className="text-muted-foreground/80 flex items-center gap-1">
						Built with <HeartHandshake className="h-3.5 w-3.5 text-primary inline" /> to save
						lives.
					</p>
				</div>
			</div>
		</footer>
	);
}
