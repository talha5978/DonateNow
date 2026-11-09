import { Link, NavLink } from "react-router";
import { User, Heart, FileText, PlusCircle } from "lucide-react";
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
import type { Database } from "~/types/database";
import type { User as SUser } from "@supabase/supabase-js";

interface HeaderProps {
	profile?: Database["public"]["Tables"]["profiles"]["Row"] | null;
	user?: SUser | null;
}

export function Header({ profile: user, user: currentUser }: HeaderProps) {
	const initials = user?.full_name
		? user.full_name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
		: user?.email?.[0].toUpperCase() || "DN";

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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
						<DropdownMenu>
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
								<DropdownMenuItem>
									<Link
										to="/profile"
										className="cursor-pointer flex items-center gap-2 w-full"
									>
										<User className="h-4 w-4" />
										<span>My Profile</span>
									</Link>
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
