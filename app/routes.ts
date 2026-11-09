import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	layout("./routes/protected_layout.tsx", [
		index("routes/feed.tsx"),
		route("complete-profile", "./routes/complete-profile.tsx"),
		route("requests/new", "./routes/request.new.tsx"),
	]),
	route("home", "./routes/home.tsx"),
	route("auth/callback", "./routes/auth.callback.ts"),
	route("login", "./routes/Auth/login.tsx"),
	route("signup", "./routes/Auth/signup.tsx"),
	route("logout", "./routes/Auth/logout.ts"),
] satisfies RouteConfig;
