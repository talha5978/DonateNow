import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useNavigation, useFetcher } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
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
import { Mic, MicOff, Loader2 } from "lucide-react";

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

	// ---------- AI Extraction path (paste or voice) ----------
	if (intent === "extract") {
		const raw = String(formData.get("raw_input") || "").trim();
		if (!raw) {
			return { ok: false, message: "Please provide some text" };
		}

		try {
			const ai = new AiService();
			const structured = await ai.extractRequest(raw);
			console.log(structured);
			return { ok: true, structured, raw_input: raw };
		} catch (err: any) {
			console.log(err);
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

			// 1. Transcribe audio using Cloudflare Whisper
			const transcript = await ai.speechToText(arrayBuffer);
			console.log("Whisper transcript:", transcript);

			// 2. Extract structured request from the transcribed text
			const structured = await ai.extractRequest(transcript);
			return { ok: true, structured, raw_input: transcript };
		} catch (err: any) {
			console.log(err);
			return {
				ok: false,
				message: err.message || "Voice transcription or extraction failed",
			};
		}
	}

	// ---------- Final submit ----------
	const rawInput = String(formData.get("raw_input") || "");
	const source = String(formData.get("source") || "form") as "form" | "paste" | "voice";

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
		console.log(parsed.error);
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

	// Use fetcher for AI extraction
	const extractorFetcher = useFetcher<typeof action>();

	const [mode, setMode] = useState<"form" | "paste" | "voice">("form");
	const [isRecording, setIsRecording] = useState(false);
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

	// Handle extraction results from the fetcher
	const extractedData = extractorFetcher.data;
	useEffect(() => {
		if (extractedData) {
			if (!extractedData.ok) {
				toast.error(extractedData.message || "AI extraction failed");
			} else if (extractedData.structured) {
				toast.success("AI extracted successfully!");

				// Populate form fields with extracted data
				const s = extractedData.structured;
				setValue("blood_group", s.blood_group || "");
				setValue("units_needed", s.units_needed || 1);
				setValue("hospital_name", s.hospital_name || "");
				setValue("patient_name", s.patient_name || "");

				// Format ISO string (e.g. "2026-11-09T21:00:00.000Z" -> "2026-11-09T21:00") for datetime-local
				const formattedDate = s.needed_by ? s.needed_by.slice(0, 16) : "";
				setValue("needed_by", formattedDate);

				setValue("urgency", s.urgency || "urgent");
				setValue("notes", s.notes || "");
				setValue("raw_input", extractedData.raw_input || "");

				// Automatically switch back to the manual form tab to review values
				setMode("form");
			}
		}
	}, [extractedData, setValue]);
	// Handle main action errors
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

				// Package the audio blob into FormData and send to server action
				const formData = new FormData();
				formData.append("intent", "extract_audio");
				formData.append("audio", blob, "voice-note.webm");

				toast.loading("Processing voice note with AI...", { id: "voice-ai" });

				extractorFetcher.submit(formData, {
					method: "post",
					encType: "multipart/form-data",
				});

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
				<Card>
					<CardHeader>
						<CardTitle className="text-2xl">Post a blood request</CardTitle>
						<CardDescription>
							Fill the form, paste a WhatsApp message, or record a voice note.
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6">
						<Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
							<TabsList className="grid w-full grid-cols-3">
								<TabsTrigger value="form">Manual</TabsTrigger>
								<TabsTrigger value="paste">Paste message</TabsTrigger>
								<TabsTrigger value="voice">Voice note</TabsTrigger>
							</TabsList>

							{/* ---------- PASTE MODE ---------- */}
							<TabsContent value="paste" className="space-y-4 pt-4">
								<extractorFetcher.Form method="post">
									<input type="hidden" name="intent" value="extract" />
									<Field>
										<FieldLabel>Paste the WhatsApp / message</FieldLabel>
										<Textarea
											name="raw_input"
											rows={6}
											placeholder="Paste the full message here..."
											className="resize-none"
										/>
									</Field>
									<Button
										type="submit"
										className="mt-3"
										disabled={extractorFetcher.state === "submitting"}
									>
										{extractorFetcher.state === "submitting" ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Extracting…
											</>
										) : (
											"Extract with AI"
										)}
									</Button>
								</extractorFetcher.Form>

								{extractedData && extractedData.ok && extractedData.structured && (
									<div className="rounded-lg border bg-muted/50 p-4 text-sm">
										<p className="font-medium mb-2">AI extracted:</p>
										<pre className="text-xs overflow-auto">
											{JSON.stringify(extractedData.structured, null, 2)}
										</pre>
									</div>
								)}
							</TabsContent>

							{/* ---------- VOICE MODE ---------- */}
							<TabsContent value="voice" className="pt-4">
								<div className="flex flex-col items-center gap-4 py-8">
									<Button
										type="button"
										size="lg"
										variant={isRecording ? "destructive" : "default"}
										onClick={isRecording ? stopRecording : startRecording}
										className="rounded-full h-20 w-20"
									>
										{isRecording ? (
											<MicOff className="h-8 w-8" />
										) : (
											<Mic className="h-8 w-8" />
										)}
									</Button>
									<p className="text-sm text-muted-foreground">
										{isRecording ? "Recording… tap to stop" : "Tap to record voice note"}
									</p>
								</div>
							</TabsContent>

							{/* ---------- MANUAL FORM ---------- */}
							<TabsContent value="form" className="pt-4">
								<Form method="post" className="space-y-5">
									<input
										type="hidden"
										name="source"
										value={mode === "form" ? "form" : "paste"}
									/>

									{/* Keep track of raw input */}
									<input type="hidden" {...register("raw_input")} />

									<FieldGroup>
										<div className="grid grid-cols-2 gap-4">
											<Field data-invalid={!!errors.blood_group}>
												<FieldLabel>Blood group</FieldLabel>
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
																<SelectTrigger
																	aria-invalid={!!bloodGroupError}
																>
																	<SelectValue placeholder="Select" />
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
												{bloodGroupError && (
													<FieldError>{bloodGroupError}</FieldError>
												)}
											</Field>

											<Field>
												<FieldLabel>Units needed</FieldLabel>
												<Input
													type="number"
													min={1}
													max={10}
													{...register("units_needed", { valueAsNumber: true })}
												/>
											</Field>
										</div>

										<Field>
											<FieldLabel>Hospital name</FieldLabel>
											<Input
												placeholder="e.g. Jinnah Hospital Lahore"
												{...register("hospital_name")}
											/>
										</Field>

										<Field>
											<FieldLabel>Patient name (optional)</FieldLabel>
											<Input {...register("patient_name")} />
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
														<Select
															value={
																field.value.charAt(0).toUpperCase() +
																field.value.slice(1)
															}
															onValueChange={field.onChange}
														>
															<SelectTrigger
																className={
																	field.value === "critical"
																		? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
																		: field.value === "urgent"
																			? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
																			: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
																}
															>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{URGENCY_LEVELS.map((u) => (
																	<SelectItem key={u} value={u}>
																		<span className="inline-flex items-center gap-2">
																			<span
																				aria-hidden="true"
																				className={`size-2 rounded-full ${
																					u === "critical"
																						? "bg-rose-500"
																						: u === "urgent"
																							? "bg-amber-500"
																							: "bg-sky-500"
																				}`}
																			/>
																			<span>
																				{u.charAt(0).toUpperCase() +
																					u.slice(1)}
																			</span>
																		</span>
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
											<FieldLabel>Additional notes</FieldLabel>
											<Textarea rows={3} {...register("notes")} />
										</Field>
									</FieldGroup>

									<Button type="submit" className="w-full" disabled={isSubmitting}>
										{isSubmitting ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Posting request…
											</>
										) : (
											"Post Request"
										)}
									</Button>
								</Form>
							</TabsContent>
						</Tabs>

						{actionData && !actionData.ok && (
							<p className="text-sm text-destructive text-center">{actionData.message}</p>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
