import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Feed | DonateNow" },
		{ name: "description", content: "Right blood. Right donor. Right now." },
	];
}

export default function Feed() {
	return (
		<>
			<h1 className="text-3xl font-bold">Welcome to My Feed</h1>
		</>
	);
}
