import { Link, NavLink } from "react-router";
import { useState } from "react";
import { User, Heart, FileText, PlusCircle, AlertTriangle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { LogoutButton } from "~/components/LogoutButton";
import { ProfileDialog } from "~/components/ProfileDialog";
import type { Database } from "~/types/database";
import type { User as SUser } from "@supabase/supabase-js";

interface HeaderProps {
	profile?: Database["public"]["Tables"]["profiles"]["Row"] | null;
	user?: SUser | null;
}

export function Header({ profile: user, user: currentUser }: HeaderProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [profileDialogOpen, setProfileDialogOpen] = useState(false);

	const initials = user?.full_name
		? user.full_name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
		: user?.email?.[0].toUpperCase() || "DN";

	// Combine profile data with current auth email for the dialog
	const profileWithEmail = {
		...user,
		email: currentUser?.email || user?.email,
	};

	// Calculate 56-day medical recovery cooldown status
	const COOLDOWN_DAYS = 56;
	let isCoolingDown = false;
	let daysRemaining = 0;

	if (user?.last_donated_at) {
		const lastDonatedDate = new Date(user.last_donated_at).getTime();
		const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
		const timeElapsed = Date.now() - lastDonatedDate;

		if (timeElapsed < cooldownMs) {
			isCoolingDown = true;
			daysRemaining = Math.ceil((cooldownMs - timeElapsed) / (24 * 60 * 60 * 1000));
		}
	}

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
			{/* Warning Banner if Cooldown is Active */}
			{isCoolingDown && (
				<div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-4 text-center text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
					<AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
					<span>
						<strong>Donor Recovery Period Active</strong> Please wait for your recovery period
						ending ({daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining). You cannot
						accept new donation requests during this time.
					</span>
				</div>
			)}

			<div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
				{/* Left: Logo */}
				<div className="flex items-center gap-3">
					<Link to="/" className="flex items-center gap-2">
						<img
							src="/logo_icon.png"
							className="h-8 w-8 mix-blend-multiply"
							alt="DonateNow Logo"
						/>
						<span className="text-xl font-bold tracking-tight text-foreground">
							Donate<span className="text-primary">Now</span>
						</span>
					</Link>
				</div>

				{/* Middle: Page Links */}
				<nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
					<NavLink
						to="/"
						end
						className={({ isActive }) =>
							isActive ? "text-primary underline decoration-2 underline-offset-4" : ""
						}
					>
						Feed
					</NavLink>
					<NavLink
						to="/requests"
						className={({ isActive }) =>
							isActive ? "text-primary underline decoration-2 underline-offset-4" : ""
						}
					>
						Active Requests
					</NavLink>
					<NavLink
						to="/about"
						className={({ isActive }) =>
							isActive ? "text-primary underline decoration-2 underline-offset-4" : ""
						}
					>
						How it Works
					</NavLink>
				</nav>

				{/* Right: New Request Button & User Dropdown */}
				<div className="flex items-center gap-4">
					<Link to="/requests/new" className="flex items-center gap-1.5">
						<Button>
							<PlusCircle className="h-4 w-4" />
							<span>New Request</span>
						</Button>
					</Link>

					{user ? (
						<>
							<DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
								<DropdownMenuTrigger>
									<Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
										<Avatar className="h-9 w-9 border border-border">
											<AvatarImage
												src={
													currentUser?.user_metadata.avatar_url ||
													currentUser?.user_metadata.picture ||
													undefined
												}
												alt={user.full_name || "User"}
											/>
											<AvatarFallback className="bg-accent text-primary font-semibold text-xs">
												{initials}
											</AvatarFallback>
										</Avatar>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent className="w-56" align="end">
									<div className="flex items-center justify-between gap-2 p-2">
										<div className="flex flex-col space-y-1 leading-none">
											{user.full_name && (
												<p className="font-medium text-sm text-foreground">
													{user.full_name}
												</p>
											)}
											<p className="text-xs text-muted-foreground truncate max-w-45">
												{user.email}
											</p>
										</div>
									</div>
									<DropdownMenuSeparator />

									<DropdownMenuItem
										className="cursor-pointer"
										onClick={() => {
											setMenuOpen(false);
											setProfileDialogOpen(true);
										}}
									>
										<User className="h-4 w-4" />
										<span>My Profile</span>
									</DropdownMenuItem>

									<DropdownMenuItem>
										<Link
											to="/my-requests"
											className="cursor-pointer flex items-center gap-2 w-full"
										>
											<FileText className="h-4 w-4" />
											<span>My Requests</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem>
										<Link
											to="/my-donations"
											className="cursor-pointer flex items-center gap-2 w-full"
										>
											<Heart className="h-4 w-4" />
											<span>My Donations</span>
										</Link>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem>
										<LogoutButton />
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<ProfileDialog
								// @ts-ignore
								profile={profileWithEmail}
								open={profileDialogOpen}
								onOpenChange={setProfileDialogOpen}
							/>
						</>
					) : (
						<Button variant="outline" size="sm">
							<Link to="/login">Sign In</Link>
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}
