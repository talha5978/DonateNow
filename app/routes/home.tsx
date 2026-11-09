import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Home | DonateNow" },
		{ name: "description", content: "Right blood. Right donor. Right now." },
	];
}

export default function Home() {
	return (
		<>
			<h1 className="text-3xl font-bold">Welcome to DonateNow Home</h1>
		</>
	);
}
