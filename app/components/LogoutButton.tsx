import { Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useActionData, useNavigate } from "react-router";
import { toast } from "sonner";

export function LogoutButton() {
	const navigate = useNavigate();
	const actionData = useActionData();
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (actionData && !actionData.ok) {
			toast.error(actionData.message || "Something went wrong");
		}
	}, [actionData]);

	const onLogout = async () => {
		setIsLoading(true);

		const d = await fetch(window.location.origin + "/logout", {
			method: "POST",
			credentials: "include",
		});

		setIsLoading(false);

		if (!d.ok) {
			toast.error(actionData.message || "Something went wrong");
		} else {
			navigate("/login");
		}
	};

	return (
		<button
			onClick={onLogout}
			className="flex items-center gap-2 w-full text-destructive focus:text-destructive cursor-pointer"
		>
			{isLoading ? <Loader2 className="animate-spin" /> : <LogOut />} Logout
		</button>
	);
}
