import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useNavigation, useFetcher } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AuthService } from "~/services/auth.service.server";
import { AiService } from "~/services/ai.service.server";
import { RequestService } from "~/services/request.service.server";
import { createRequestInputSchema, BLOOD_GROUPS, URGENCY_LEVELS } from "~/schemas/request";
import { Field, FieldLabel, FieldError, FieldGroup } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Mic, MicOff, Loader2, ShieldCheck, Sparkles, FileText } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
	const auth = new AuthService(request);
	const { data } = await auth.getCurrentProfile();
	if (!data?.user) return redirect("/login");
	return null;
}

export async function action({ request }: ActionFunctionArgs) {
	const auth = new AuthService(request);
	const { data: current } = await auth.getCurrentProfile();
	if (!current?.user) return redirect("/login");

	const formData = await request.formData();
	const intent = formData.get("intent");

	// ---------- AI Text Extraction path ----------
	if (intent === "extract") {
		const raw = String(formData.get("raw_input") || "").trim();
		if (!raw) {
			return { ok: false, message: "Please provide some text" };
		}

		try {
			const ai = new AiService();
			const structured = await ai.extractRequest(raw);
			return { ok: true, structured, raw_input: raw };
		} catch (err: any) {
			return {
				ok: false,
				message: err.message || "AI extraction failed",
			};
		}
	}

	if (intent === "extract_audio") {
		const audioFile = formData.get("audio") as File;
		if (!audioFile || audioFile.size === 0) {
			return { ok: false, message: "No audio recording found" };
		}

		try {
			const arrayBuffer = await audioFile.arrayBuffer();
			const ai = new AiService();

			const transcript = await ai.speechToText(arrayBuffer);
			const structured = await ai.extractRequest(transcript);
			return { ok: true, structured, raw_input: transcript };
		} catch (err: any) {
			return {
				ok: false,
				message: err.message || "Voice processing failed",
			};
		}
	}

	// ---------- Vision Slip Verification path (Optional inline attachment) ----------
	if (intent === "verify_slip") {
		const slipFile = formData.get("slip") as File;
		if (!slipFile || slipFile.size === 0) {
			return { ok: false, message: "No slip image uploaded" };
		}

		try {
			const arrayBuffer = await slipFile.arrayBuffer();
			const base64Image = Buffer.from(arrayBuffer).toString("base64");
			const ai = new AiService();
			const verification = await ai.verifyHospitalSlip(base64Image);

			if (!verification.is_valid_slip) {
				return { ok: false, message: `Slip verification note: ${verification.reason}` };
			}

			const bloodGroup = BLOOD_GROUPS.find((group) => group === verification.blood_group) ?? "";
			const structured = {
				blood_group: bloodGroup,
				units_needed: 1,
				hospital_name: verification.hospital_name || "",
				patient_name: verification.patient_name || "",
				needed_by: null,
				urgency: "urgent" as const,
				notes: `Verified via Hospital Admission Slip (${verification.reason})`,
			};

			return {
				ok: true,
				structured,
				raw_input: "Hospital Admission Slip (Vision Verified)",
				isVerifiedSlip: true,
			};
		} catch (err: any) {
			return { ok: false, message: err.message || "Vision slip verification failed" };
		}
	}

	// ---------- Final submit ----------
	const rawInput = String(formData.get("raw_input") || "Manual entry");
	const source = String(formData.get("source") || "form") as "form" | "paste" | "voice";
	const isVerifiedSlip = formData.get("is_verified_slip") === "true";

	const payload = {
		source,
		raw_input: rawInput,
		blood_group: String(formData.get("blood_group") || "").trim() || undefined,
		units_needed: formData.get("units_needed"),
		hospital_name: formData.get("hospital_name") as string,
		patient_name: formData.get("patient_name") as string,
		needed_by: formData.get("needed_by") as string,
		urgency: formData.get("urgency") as string,
		notes: formData.get("notes") as string,
	};

	const parsed = createRequestInputSchema.safeParse(payload);
	if (!parsed.success) {
		return {
			ok: false,
			message: "Validation failed",
			errors: parsed.error.flatten().fieldErrors,
		};
	}

	const structured = {
		blood_group: parsed.data.blood_group,
		units_needed: parsed.data.units_needed || 1,
		hospital_name: parsed.data.hospital_name || "Unknown",
		patient_name: parsed.data.patient_name,
		needed_by: parsed.data.needed_by || null,
		urgency: parsed.data.urgency || "urgent",
		notes: parsed.data.notes,
	};

	try {
		const requestService = new RequestService(request);
		const created = await requestService.createRequest({
			created_by: current.user.id,
			source: parsed.data.source,
			raw_input: parsed.data.raw_input,
			structured,
			verification_state: isVerifiedSlip ? "slip_verified" : "unverified",
		});

		return redirect(`/requests/${created.id}`);
	} catch (err: any) {
		return {
			ok: false,
			message: err.message || "Failed to create request",
		};
	}
}

export const meta = () => [{ title: "Post a Request | DonateNow" }];

export default function NewRequestPage() {
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const bloodGroupError =
		actionData && !actionData.ok && "errors" in actionData
			? actionData.errors?.blood_group?.[0]
			: undefined;

	const extractorFetcher = useFetcher<typeof action>();
	const slipFetcher = useFetcher<typeof action>();

	const [mode, setMode] = useState<"form" | "paste" | "voice">("form");
	const [isRecording, setIsRecording] = useState(false);
	const [slipVerifiedFlag, setSlipVerifiedFlag] = useState(false);
	const [_, setUploadedSlipName] = useState<string | null>(null);

	const mediaRecorder = useRef<MediaRecorder | null>(null);
	const chunks = useRef<Blob[]>([]);

	const {
		register,
		control,
		setValue,
		formState: { errors },
	} = useForm({
		defaultValues: {
			blood_group: "",
			units_needed: 1,
			hospital_name: "",
			patient_name: "",
			needed_by: "",
			urgency: "urgent",
			notes: "",
			raw_input: "Manual entry",
		},
	});

	// Handle Paste / Voice AI extraction results
	const extractedData = extractorFetcher.data;
	useEffect(() => {
		if (extractedData) {
			if (!extractedData.ok) {
				toast.error(extractedData.message || "Extraction failed");
			} else if ("structured" in extractedData && extractedData.structured) {
				toast.success("AI extracted details successfully!");
				const s = extractedData.structured;
				setValue("blood_group", s.blood_group || "");
				setValue("units_needed", s.units_needed || 1);
				setValue("hospital_name", s.hospital_name || "");
				setValue("patient_name", s.patient_name || "");
				setValue("needed_by", s.needed_by ? s.needed_by.slice(0, 16) : "");
				setValue("urgency", s.urgency || "urgent");
				setValue("notes", s.notes || "");
				setValue("raw_input", extractedData.raw_input || "");
				setMode("form");
			}
		}
	}, [extractedData, setValue]);

	// Handle Optional Slip Verification results
	const slipData = slipFetcher.data;
	useEffect(() => {
		if (slipData) {
			if (!slipData.ok) {
				toast.error(slipData.message || "Slip verification failed");
			} else if ("structured" in slipData && slipData.structured) {
				setSlipVerifiedFlag(true);
				toast.success("Hospital slip verified and fields auto-filled! 🛡️");
				const s = slipData.structured;
				if (s.blood_group) setValue("blood_group", s.blood_group);
				if (s.units_needed) setValue("units_needed", s.units_needed);
				if (s.hospital_name) setValue("hospital_name", s.hospital_name);
				if (s.patient_name) setValue("patient_name", s.patient_name);
				if (s.notes) setValue("notes", s.notes);
				setValue("raw_input", slipData.raw_input || "Hospital Slip Attachment");
			}
		}
	}, [slipData, setValue]);

	useEffect(() => {
		if (actionData && !actionData.ok) {
			toast.error(actionData.message || "Something went wrong");
		}
	}, [actionData]);

	async function startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			mediaRecorder.current = new MediaRecorder(stream);
			chunks.current = [];
			mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);

			mediaRecorder.current.onstop = async () => {
				const blob = new Blob(chunks.current, { type: "audio/webm" });
				const formData = new FormData();
				formData.append("intent", "extract_audio");
				formData.append("audio", blob, "voice-note.webm");

				toast.loading("Processing voice note with AI...", { id: "voice-ai" });
				extractorFetcher.submit(formData, { method: "post", encType: "multipart/form-data" });
				toast.dismiss("voice-ai");
				setIsRecording(false);
			};

			mediaRecorder.current.start();
			setIsRecording(true);
			toast.success("Recording started...");
		} catch {
			toast.error("Microphone permission denied");
		}
	}

	function stopRecording() {
		mediaRecorder.current?.stop();
		setIsRecording(false);
	}

	return (
		<div className="min-h-screen bg-muted/30 py-10 px-4">
			<div className="max-w-2xl mx-auto">
				<Card className="border border-border/60 shadow-sm rounded-2xl">
					<CardHeader className="space-y-1">
						<CardTitle className="text-2xl font-bold tracking-tight">
							Post a Blood Request
						</CardTitle>
						<CardDescription>
							Fill out the form below normally, or use AI tools to parse text or voice notes
							instantly.
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6">
						{/* Quick AI Intake Options */}
						<Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="form">Manual Form</TabsTrigger>
								<TabsTrigger value="paste">Paste Message</TabsTrigger>
								<TabsTrigger value="voice">Voice Note</TabsTrigger>
							</TabsList>

							{/* ---------- PASTE MODE ---------- */}
							<TabsContent value="paste" className="space-y-4 pt-4">
								<extractorFetcher.Form method="post">
									<input type="hidden" name="intent" value="extract" />
									<Field>
										<FieldLabel>Paste WhatsApp / Forwarded Text</FieldLabel>
										<Textarea
											name="raw_input"
											rows={5}
											placeholder="Paste the raw emergency message here..."
											className="resize-none"
										/>
									</Field>
									<Button
										type="submit"
										className="mt-3 gap-2"
										disabled={extractorFetcher.state === "submitting"}
									>
										{extractorFetcher.state === "submitting" ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Sparkles className="h-4 w-4" />
										)}
										Auto-fill Form with AI
									</Button>
								</extractorFetcher.Form>
							</TabsContent>

							{/* ---------- VOICE MODE ---------- */}
							<TabsContent value="voice" className="pt-4">
								<div className="flex flex-col items-center gap-4 py-6 border border-border/40 rounded-xl bg-muted/20">
									<Button
										type="button"
										size="lg"
										variant={isRecording ? "destructive" : "default"}
										onClick={isRecording ? stopRecording : startRecording}
										className="rounded-full h-16 w-16 shadow-md"
									>
										{isRecording ? (
											<MicOff className="h-6 w-6" />
										) : (
											<Mic className="h-6 w-6" />
										)}
									</Button>
									<p className="text-sm text-muted-foreground font-medium">
										{isRecording
											? "Recording in progress… tap to finish"
											: "Tap microphone to record voice note"}
									</p>
								</div>
							</TabsContent>
						</Tabs>

						{/* ---------- MAIN FORM (Always Primary & Accessible) ---------- */}
						<Form method="post" className="space-y-5 pt-2 border-t border-border/40">
							<input type="hidden" name="source" value={mode} />
							<input type="hidden" {...register("raw_input")} />
							<input type="hidden" name="is_verified_slip" value={String(slipVerifiedFlag)} />

							{/* OPTIONAL SLIP ATTACHMENT SECTION (Collapsible / Sleek Box) */}
							<div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<FileText className="h-4 w-4 text-primary" />
										<span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
											Optional Trust Booster
										</span>
									</div>
									{slipVerifiedFlag && (
										<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
											<ShieldCheck className="h-3.5 w-3.5" /> Slip Verified
										</span>
									)}
								</div>

								<div className="flex flex-col sm:flex-row items-center gap-3">
									<Input
										type="file"
										name="slip"
										accept="image/*"
										className="text-xs bg-background"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												setUploadedSlipName(file.name);
												setSlipVerifiedFlag(false);
											}
										}}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="w-full sm:w-auto shrink-0 gap-1.5 text-xs font-medium"
										disabled={slipFetcher.state === "submitting"}
										onClick={() => {
											const fileInput = document.querySelector(
												'input[name="slip"]',
											) as HTMLInputElement;
											if (!fileInput?.files?.[0]) {
												toast.error("Please select a slip image first");
												return;
											}
											const formData = new FormData();
											formData.append("intent", "verify_slip");
											formData.append("slip", fileInput.files[0]);
											slipFetcher.submit(formData, {
												method: "post",
												encType: "multipart/form-data",
											});
										}}
									>
										{slipFetcher.state === "submitting" ? (
											<>
												<Loader2 className="h-3 w-3 animate-spin" />
												Scanning...
											</>
										) : (
											<>
												<ShieldCheck className="h-3.5 w-3.5 text-primary" />
												Verify Slip with AI
											</>
										)}
									</Button>
								</div>
								<p className="text-[11px] text-muted-foreground">
									Attach a hospital admission slip or prescription photo to automatically
									verify credibility and boost donor confidence.
								</p>
							</div>

							<FieldGroup>
								<div className="grid grid-cols-2 gap-4">
									<Field data-invalid={!!errors.blood_group}>
										<FieldLabel>Blood group *</FieldLabel>
										<Controller
											control={control}
											name="blood_group"
											render={({ field }) => (
												<>
													<Select
														value={field.value}
														onValueChange={field.onChange}
														disabled={isSubmitting}
													>
														<SelectTrigger aria-invalid={!!bloodGroupError}>
															<SelectValue placeholder="Select group" />
														</SelectTrigger>
														<SelectContent>
															{BLOOD_GROUPS.map((g) => (
																<SelectItem key={g} value={g}>
																	{g}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													<input
														type="hidden"
														name={field.name}
														value={field.value}
													/>
												</>
											)}
										/>
										{bloodGroupError && <FieldError>{bloodGroupError}</FieldError>}
									</Field>

									<Field>
										<FieldLabel>Units needed *</FieldLabel>
										<Input
											type="number"
											min={1}
											max={10}
											{...register("units_needed", { valueAsNumber: true })}
										/>
									</Field>
								</div>

								<Field>
									<FieldLabel>Hospital name *</FieldLabel>
									<Input
										placeholder="e.g. Nishtar Hospital Multan"
										{...register("hospital_name")}
									/>
								</Field>

								<Field>
									<FieldLabel>Patient name (optional)</FieldLabel>
									<Input placeholder="e.g. Hira Khalid" {...register("patient_name")} />
								</Field>

								<div className="grid grid-cols-2 gap-4">
									<Field>
										<FieldLabel>Needed by</FieldLabel>
										<Input type="datetime-local" {...register("needed_by")} />
									</Field>

									<Field>
										<FieldLabel>Urgency</FieldLabel>
										<Controller
											control={control}
											name="urgency"
											render={({ field }) => (
												<Select value={field.value} onValueChange={field.onChange}>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{URGENCY_LEVELS.map((u) => (
															<SelectItem key={u} value={u}>
																{u.charAt(0).toUpperCase() + u.slice(1)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										/>
										<input type="hidden" {...register("urgency")} />
									</Field>
								</div>

								<Field>
									<FieldLabel>Additional notes / reason</FieldLabel>
									<Textarea
										rows={3}
										placeholder="e.g. Surgery or accident details..."
										{...register("notes")}
									/>
								</Field>
							</FieldGroup>

							<Button type="submit" className="w-full font-semibold" disabled={isSubmitting}>
								{isSubmitting ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Publishing Request…
									</>
								) : (
									"Publish Emergency Request"
								)}
							</Button>
						</Form>

						{actionData && !actionData.ok && (
							<p className="text-sm text-destructive text-center font-medium">
								{actionData.message}
							</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
