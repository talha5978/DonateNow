import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
	layout("./routes/protected_layout.tsx", [index("routes/home.tsx")]),
	route("auth/callback", "./routes/auth.callback.ts"),
	route("login", "./routes/Auth/login.tsx"),
	route("logout", "./routes/Auth/logout.ts"),
] satisfies RouteConfig;
