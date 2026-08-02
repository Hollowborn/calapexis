<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as InputGroup from "$lib/components/ui/input-group/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Command from "$lib/components/ui/command/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, MOCK_OFFICES, checkoutLocalVisitor } from '$lib/supabase';
	import type { Visitor, Office } from '$lib/types';
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";

	// Lucide Icons
	import SearchIcon from "@lucide/svelte/icons/search";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import NavigationIcon from "@lucide/svelte/icons/navigation";
	import CameraIcon from "@lucide/svelte/icons/camera";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import SmartphoneIcon from "@lucide/svelte/icons/smartphone";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
	import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
	import RadioIcon from "@lucide/svelte/icons/radio";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import CheckIcon from "@lucide/svelte/icons/check";
	import HelpCircleIcon from "@lucide/svelte/icons/help-circle";

	let { data } = $props();

	let officesList = $derived(data?.offices?.length ? data.offices : MOCK_OFFICES);

	// Leaflet Map & GPS references
	let mapContainer: HTMLDivElement;
	let leafMap: any = $state(null);
	let leafletInstance: any = $state(null);
	let visitorMarker: any = null;
	let pathPolyline: any = null;

	// Floating Search & Filter state
	let searchQuery = $state('');
	let isSearchOpen = $state(false);

	// Controlled Gate Setup Overlay & Scanner Modal States
	let isGateOverlayOpen = $state(true);
	let isScannerModalOpen = $state(false);
	let isReturningVisitor = $state(false);
	let isSubmittingRegister = $state(false);
	let isSubmittingCheckIn = $state(false);
	let isOfficeComboOpen = $state(false);

	// 3-Step Wizard Navigation State
	let registrationStep = $state<1 | 2 | 3>(1);

	// Registration Form Fields
	let firstName = $state('');
	let middleName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state('');
	let hostPerson = $state('');
	let photoUrl = $state('');
	let isCameraActive = $state(false);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let canvasElement = $state<HTMLCanvasElement | null>(null);

	// Pre-Pass & Official Checked-In Pass state
	let prePassData = $state<{
		registeredVisitorId?: string;
		fullName: string;
		firstName: string;
		middleName?: string;
		lastName: string;
		email: string;
		phone: string;
		purpose: string;
		officeId: string;
		officeName: string;
		buildingId: string;
		buildingName: string;
		photoUrl: string;
	} | null>(null);

	let activeOfficialPass = $state<Visitor | null>(null);

	// GPS Location State
	let userGps = $state<{ lat: number; lng: number } | null>(null);
	let gpsStatus = $state<'disabled' | 'locating' | 'active'>('disabled');

	// Manual QR Scanner Fallback Code Input
	let manualScanCode = $state('');

	// Campus Bounds from static/prev-proj/map.js
	const campusBoundsCoords = [
		[9.893421456778755, 123.8815211010603],
		[9.895647770829878, 123.88369296680753]
	];
	const mainGateCoords = { lat: 9.894300, lng: 123.882100 };

	let selectedOffice = $derived(officesList.find(o => o.id === selectedOfficeId));
	let filteredLandmarks = $derived(
		officesList.filter(o => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase().trim();
			return o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q);
		})
	);

	onMount(async () => {
		if (typeof window === 'undefined') return;

		// 1. Check for saved visitor profile in localStorage (Cookie Auto-Fill)
		const savedProfile = localStorage.getItem('calapexis_visitor_profile');
		if (savedProfile) {
			try {
				const p = JSON.parse(savedProfile);
				firstName = p.firstName || '';
				middleName = p.middleName || '';
				lastName = p.lastName || '';
				email = p.email || '';
				phone = p.phone || '';
				photoUrl = p.photoUrl || '';
				isReturningVisitor = true;
			} catch (e) {
				console.warn("Failed to parse saved visitor profile:", e);
			}
		}

		// 2. Check for cached active pass in localStorage
		const cachedPass = localStorage.getItem('calapexis_active_pass');
		if (cachedPass) {
			try {
				activeOfficialPass = JSON.parse(cachedPass);
				isGateOverlayOpen = false;
			} catch (e) {
				console.warn("Failed to parse cached active pass:", e);
			}
		}

		// 3. Initialize Leaflet Map
		let L = (window as any).L;
		if (!L) {
			try {
				const leafletModule = await import('leaflet');
				L = leafletModule.default || leafletModule;
			} catch (e) {
				console.error("Failed to load Leaflet module:", e);
			}
		}

		if (!L || !mapContainer) return;
		leafletInstance = L;

		const bounds = L.latLngBounds(campusBoundsCoords[0], campusBoundsCoords[1]);
		const map = L.map(mapContainer, {
			zoomControl: false,
			maxBounds: bounds,
			maxBoundsViscosity: 1.0,
			minZoom: 18,
			maxZoom: 22
		}).setView([9.894414742474977, 123.88258093049176], 19);

		const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; OpenStreetMap',
			maxNativeZoom: 19,
			maxZoom: 22
		}).addTo(map);

		const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
			attribution: "Esri",
			maxNativeZoom: 18,
			maxZoom: 22
		});

		const campusOverlay = L.imageOverlay("/campusMap-adjusted.png", bounds, {
			opacity: 1.0,
			interactive: false,
			zIndex: 300
		}).addTo(map);

		L.control.layers(
			{ "OpenStreetMap": osmLayer, "ESRI Satellite": satelliteLayer },
			{ "3D Campus Overlay": campusOverlay },
			{ position: "topright" }
		).addTo(map);

		leafMap = map;

		// Initial plot of visitor marker at Main Gate
		updateVisitorMarkerOnMap(mainGateCoords.lat, mainGateCoords.lng, "Visitor (Main Gate)");

		// 4. Request Device GPS Position
		requestDeviceGps();

		setTimeout(() => map.invalidateSize(), 250);
	});

	onDestroy(() => {
		stopSelfieCamera();
	});

	function requestDeviceGps() {
		if (typeof window === 'undefined' || !navigator.geolocation) return;
		gpsStatus = 'locating';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const lat = pos.coords.latitude;
				const lng = pos.coords.longitude;
				if (lat >= 9.8934 && lat <= 9.8956 && lng >= 123.8815 && lng <= 123.8836) {
					userGps = { lat, lng };
					gpsStatus = 'active';
					updateVisitorMarkerOnMap(lat, lng, "Live GPS Position");
					toast.success("GPS Location active on campus.");
				} else {
					gpsStatus = 'disabled';
					toast.info("GPS outside campus boundaries. Defaulting to Main Gate.");
				}
			},
			(err) => {
				console.warn("Geolocation access denied or unavailable:", err.message);
				gpsStatus = 'disabled';
			},
			{ enableHighAccuracy: true, timeout: 5000 }
		);
	}

	function updateVisitorMarkerOnMap(lat: number, lng: number, label: string) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		const iconHtml = `
			<div class="group relative flex items-center justify-center">
				<span class="animate-ping absolute inline-flex size-8 rounded-full bg-primary/40"></span>
				<div class="relative flex size-8 items-center justify-center rounded-full bg-primary border-2 border-primary-foreground shadow-xl">
					<span class="text-[10px] font-black text-primary-foreground leading-none">YOU</span>
				</div>
			</div>
		`;

		if (visitorMarker) {
			visitorMarker.setLatLng([lat, lng]);
		} else {
			visitorMarker = L.marker([lat, lng], {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: iconHtml,
					iconSize: [32, 32],
					iconAnchor: [16, 16]
				})
			}).bindPopup(`<div class="font-sans font-bold text-xs p-1">${label}</div>`).addTo(leafMap);
		}
	}

	function drawNavigationPathToOffice(office: Office) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		const startLat = userGps?.lat || mainGateCoords.lat;
		const startLng = userGps?.lng || mainGateCoords.lng;

		const destLat = 9.894414;
		const destLng = 123.882580;

		if (pathPolyline) {
			leafMap.removeLayer(pathPolyline);
		}

		pathPolyline = L.polyline(
			[[startLat, startLng], [destLat, destLng]],
			{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '8, 8' }
		).addTo(leafMap);

		leafMap.fitBounds([[startLat, startLng], [destLat, destLng]], { padding: [40, 40] });
	}

	// Helper to safely write to localStorage without throwing QuotaExceededError
	function safeSetLocalStorage(key: string, value: any) {
		try {
			const serialized = typeof value === 'string' ? value : JSON.stringify(value);
			localStorage.setItem(key, serialized);
		} catch (e) {
			console.warn(`LocalStorage quota exceeded for ${key}, attempting fallback:`, e);
			if (typeof value === 'object' && value !== null) {
				const { photoUrl, ...rest } = value;
				try {
					localStorage.setItem(key, JSON.stringify(rest));
				} catch (err) {
					console.error("LocalStorage save failed:", err);
				}
			}
		}
	}

	// Selfie Camera Handlers
	async function startSelfieCamera() {
		try {
			isCameraActive = true;
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
			if (videoElement) {
				videoElement.srcObject = stream;
			}
		} catch (err) {
			console.error("Camera access failed:", err);
			toast.error("Unable to access selfie camera.");
			isCameraActive = false;
		}
	}

	function stopSelfieCamera() {
		if (videoElement && videoElement.srcObject) {
			const stream = videoElement.srcObject as MediaStream;
			stream.getTracks().forEach(track => track.stop());
			videoElement.srcObject = null;
		}
		isCameraActive = false;
	}

	function captureSelfieSnapshot() {
		if (!videoElement || !canvasElement) return;
		const context = canvasElement.getContext('2d');
		if (context) {
			canvasElement.width = 250;
			canvasElement.height = 250;
			context.drawImage(videoElement, 0, 0, 250, 250);
			photoUrl = canvasElement.toDataURL('image/jpeg', 0.6);
			stopSelfieCamera();
			toast.success("Selfie snapshot captured!");
		}
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const tempCanvas = document.createElement('canvas');
					tempCanvas.width = 250;
					tempCanvas.height = 250;
					const ctx = tempCanvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0, 250, 250);
						photoUrl = tempCanvas.toDataURL('image/jpeg', 0.6);
						toast.success("Image file uploaded & optimized!");
					}
				};
				img.src = event.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function clearSavedProfile() {
		try {
			localStorage.removeItem('calapexis_visitor_profile');
		} catch (e) {}
		firstName = ''; middleName = ''; lastName = ''; email = ''; phone = ''; photoUrl = '';
		isReturningVisitor = false;
		toast.info("Saved profile cleared.");
	}

	// Stepped Wizard Navigation Handlers
	function goToNextStep() {
		if (registrationStep === 1) {
			if (!firstName.trim() || !lastName.trim()) {
				toast.error("First Name and Last Name are required.");
				return;
			}
			registrationStep = 2;
		} else if (registrationStep === 2) {
			if (!photoUrl || !photoUrl.trim()) {
				toast.error("Please capture a selfie snapshot or upload an image file before proceeding.");
				return;
			}
			registrationStep = 3;
		}
	}

	function goToPrevStep() {
		if (registrationStep === 2) {
			stopSelfieCamera();
			registrationStep = 1;
		} else if (registrationStep === 3) {
			registrationStep = 2;
		}
	}

	// Form Action Enhance Handlers for Server Action Response Processing
	function handleRegisterEnhance() {
		isSubmittingRegister = true;
		return async ({ result }: { result: any }) => {
			isSubmittingRegister = false;
			if (result.type === 'success' && result.data?.prePassData) {
				const data = result.data.prePassData;
				prePassData = data;
				safeSetLocalStorage('calapexis_visitor_profile', {
					firstName: data.firstName,
					middleName: data.middleName,
					lastName: data.lastName,
					email: data.email,
					phone: data.phone,
					photoUrl: data.photoUrl
				});

				isGateOverlayOpen = false;
				registrationStep = 1;

				const targetOffice = officesList.find(o => o.id === data.officeId);
				if (targetOffice) {
					drawNavigationPathToOffice(targetOffice);
				}

				toast.success("Check-In Registered!", {
					description: `Pre-Pass created for ${data.officeName}. Map unlocked!`
				});
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Registration failed.");
			}
		};
	}

	function handleCheckInEnhance() {
		isSubmittingCheckIn = true;
		return async ({ result }: { result: any }) => {
			isSubmittingCheckIn = false;
			if (result.type === 'success' && result.data?.activeOfficialPass) {
				const pass = result.data.activeOfficialPass;
				activeOfficialPass = pass;
				safeSetLocalStorage('calapexis_active_pass', pass);
				isScannerModalOpen = false;

				updateVisitorMarkerOnMap(9.894414, 123.882580, `${pass.fullName} (${pass.officeName || 'Office Check-In'})`);

				toast.success("Check-In Complete!", {
					description: `Digital Pass ${pass.passCode} logged in database.`
				});
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Check-In failed.");
			}
		};
	}

	function handleSelfCheckout() {
		if (activeOfficialPass || prePassData) {
			if (activeOfficialPass) checkoutLocalVisitor(activeOfficialPass.id);
			localStorage.removeItem('calapexis_active_pass');
			activeOfficialPass = null;
			prePassData = null;
			if (pathPolyline && leafMap) {
				leafMap.removeLayer(pathPolyline);
			}
			isGateOverlayOpen = true;
			toast.info("Checked out of campus. Re-opened Campus Gate screen.");
		} else {
			isGateOverlayOpen = true;
		}
	}

	function focusOfficeOnMap(office: Office) {
		if (leafMap) {
			leafMap.setView([9.894414, 123.882580], 20, { animate: true });
			toast.info(`Camera focused on ${office.name}.`);
		}
	}
</script>

<div class="relative w-full h-screen overflow-hidden bg-background text-foreground font-sans select-none">

	<!-- 1. FULLSCREEN CAMPUS GATE SETUP OVERLAY (INITIAL SETUP WIZARD) -->
	{#if isGateOverlayOpen}
		<div class="fixed inset-0 z-[2000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
			<div class="relative max-w-md w-full bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
				
				<!-- Gate Header & Logo -->
				<div class="text-center pt-2">
					<div class="size-16 bg-primary/10 border border-primary/20 text-primary rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
						<span class="font-black text-2xl">C</span>
					</div>
					<h2 class="text-xl font-black text-foreground tracking-tight">BISU Calape Gate Check-In</h2>
					<p class="text-xs text-muted-foreground mt-0.5">Please register your details to unlock campus map & pass</p>
				</div>

				<!-- WIZARD STEP PROGRESS BAR -->
				<div class="flex items-center justify-between gap-2 px-1">
					<div class="flex-1 h-1.5 rounded-full {registrationStep >= 1 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
					<div class="flex-1 h-1.5 rounded-full {registrationStep >= 2 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
					<div class="flex-1 h-1.5 rounded-full {registrationStep >= 3 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
				</div>

				<!-- Step Header Title -->
				<div class="flex items-center gap-2 border-b border-border/60 pb-2">
					<UserCheckIcon class="size-5 text-primary" />
					<div class="text-start">
						<h3 class="text-sm font-black text-foreground">
							{#if registrationStep === 1}
								Step 1: Personal Information
							{:else if registrationStep === 2}
								Step 2: ID Photo Snapshot (Required)
							{:else}
								Step 3: Destination Office & Purpose
							{/if}
						</h3>
					</div>
				</div>

				<!-- SvelteKit Server Action Form -->
				<form action="?/register" method="POST" use:enhance={handleRegisterEnhance} class="flex flex-col gap-4 font-semibold text-xs">
					<input type="hidden" name="firstName" value={firstName} />
					<input type="hidden" name="middleName" value={middleName} />
					<input type="hidden" name="lastName" value={lastName} />
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="phone" value={phone} />
					<input type="hidden" name="photoUrl" value={photoUrl} />
					<input type="hidden" name="officeId" value={selectedOfficeId} />
					<input type="hidden" name="purpose" value={purpose} />

					{#if registrationStep === 1}
						<!-- STEP 1: PERSONAL DETAILS -->
						{#if isReturningVisitor}
							<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-semibold">
								<div class="flex items-center gap-2">
									<SparklesIcon class="size-4 text-primary" />
									<span class="font-bold text-foreground">Saved Profile Auto-Filled</span>
								</div>
								<button type="button" onclick={clearSavedProfile} class="text-[10px] text-primary font-black uppercase hover:underline cursor-pointer">Clear</button>
							</div>
						{/if}

						<Field.FieldGroup class="flex flex-col gap-3">
							<div class="grid grid-cols-3 gap-2">
								<Field.Field>
									<Field.FieldLabel for="gate-firstName">First Name *</Field.FieldLabel>
									<Input id="gate-firstName" bind:value={firstName} placeholder="John" required class="rounded-xl h-9 text-xs" />
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-middleName">Middle</Field.FieldLabel>
									<Input id="gate-middleName" bind:value={middleName} placeholder="Paul" class="rounded-xl h-9 text-xs" />
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-lastName">Last Name *</Field.FieldLabel>
									<Input id="gate-lastName" bind:value={lastName} placeholder="Doe" required class="rounded-xl h-9 text-xs" />
								</Field.Field>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<Field.Field>
									<Field.FieldLabel for="gate-email">Email (Optional)</Field.FieldLabel>
									<Input id="gate-email" type="email" bind:value={email} placeholder="john@example.com" class="rounded-xl h-9 text-xs" />
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-phone">Phone (Optional)</Field.FieldLabel>
									<Input id="gate-phone" type="tel" bind:value={phone} placeholder="+63 917..." class="rounded-xl h-9 text-xs" />
								</Field.Field>
							</div>
						</Field.FieldGroup>

						<div class="pt-2 flex flex-col gap-2">
							<Button type="button" onclick={goToNextStep} class="w-full bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-11 gap-1.5 cursor-pointer shadow-md">
								<span>Next: Photo Snapshot</span>
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
							<Button type="button" onclick={() => isGateOverlayOpen = false} variant="ghost" class="w-full text-xs font-bold text-muted-foreground rounded-xl h-9 cursor-pointer">
								<span>Bypass & Open Map</span>
							</Button>
						</div>

					{:else if registrationStep === 2}
						<!-- STEP 2: PHOTO SNAPSHOT OR UPLOAD (REQUIRED) -->
						<div class="flex flex-col gap-3">
							<div class="flex flex-col gap-2 items-center p-4 rounded-2xl border border-border bg-muted/40 text-center">
								{#if photoUrl}
									<img src={photoUrl} alt="Selfie Preview" class="size-28 rounded-full object-cover border-4 border-primary/30 shadow-lg" />
									<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Photo Captured & Optimized!</span>
									<Button type="button" onclick={startSelfieCamera} variant="outline" size="sm" class="text-xs font-bold rounded-xl h-8 gap-1 mt-1">
										<RefreshCwIcon data-icon="inline-start" />
										<span>Retake Camera</span>
									</Button>
								{:else if isCameraActive}
									<div class="relative size-44 rounded-2xl overflow-hidden bg-black border border-primary/40">
										<video bind:this={videoElement} autoplay playsinline class="size-full object-cover"></video>
									</div>
									<canvas bind:this={canvasElement} class="hidden"></canvas>
									<Button type="button" onclick={captureSelfieSnapshot} class="bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-9 gap-1.5 cursor-pointer mt-2">
										<CameraIcon data-icon="inline-start" />
										<span>Capture Snapshot</span>
									</Button>
								{:else}
									<div class="size-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
										<CameraIcon class="size-8" />
									</div>
									<div class="flex flex-col sm:flex-row gap-2 pt-2 w-full">
										<Button type="button" onclick={startSelfieCamera} variant="outline" class="flex-1 text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer">
											<CameraIcon data-icon="inline-start" />
											<span>Selfie Camera</span>
										</Button>

										<label class="flex-1 flex items-center justify-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card hover:bg-muted/40 font-bold text-xs cursor-pointer">
											<UploadIcon class="size-4 text-primary pointer-events-none" />
											<span>Upload File</span>
											<input type="file" accept="image/*" onchange={handleFileUpload} class="hidden" />
										</label>
									</div>
								{/if}
							</div>
						</div>

						<div class="pt-2 flex gap-2">
							<Button type="button" onclick={goToPrevStep} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
								<ArrowLeftIcon data-icon="inline-start" />
								<span>Back</span>
							</Button>
							<Button type="button" onclick={goToNextStep} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-md">
								<span>Next: Office Step</span>
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
						</div>

					{:else if registrationStep === 3}
						<!-- STEP 3: DESTINATION OFFICE & PURPOSE -->
						<Field.FieldGroup class="flex flex-col gap-3">
							<Field.Field>
								<Field.FieldLabel>Designated Office / Desk *</Field.FieldLabel>
								<Popover.Root bind:open={isOfficeComboOpen}>
									<Popover.Trigger>
										<Button variant="outline" type="button" role="combobox" class="w-full justify-between rounded-xl h-10 text-xs font-bold border-border bg-background cursor-pointer">
											<span class="truncate">
												{selectedOffice ? `${selectedOffice.name} (${selectedOffice.code})` : "-- Select Destination Office --"}
											</span>
											<ChevronsUpDownIcon class="size-4 opacity-50 ml-2 shrink-0 pointer-events-none" />
										</Button>
									</Popover.Trigger>
									<Popover.Content align="start" sideOffset={6} class="w-[var(--bits-popover-anchor-width)] max-w-xs p-0 max-h-60 overflow-y-auto z-[2500] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl">
										<Command.Root class="w-full">
											<Command.Input placeholder="Search office or department..." class="h-10 text-xs px-3 border-b border-border/60" />
											<Command.List class="p-1 max-h-48 overflow-y-auto">
												<Command.Empty class="p-3 text-xs text-muted-foreground text-center">No office found.</Command.Empty>
												<Command.Group>
													{#each officesList as office}
														<Command.Item
															value={office.name}
															onSelect={() => {
																selectedOfficeId = office.id;
																isOfficeComboOpen = false;
															}}
															class="text-xs font-semibold cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between hover:bg-muted/60 transition-colors"
														>
															<div class="flex flex-col text-start">
																<span class="font-extrabold text-foreground">{office.name}</span>
																<span class="text-[10px] text-muted-foreground font-mono">{office.code}</span>
															</div>
															{#if selectedOfficeId === office.id}
																<CheckIcon class="size-4 text-primary shrink-0 ml-2" />
															{/if}
														</Command.Item>
													{/each}
												</Command.Group>
											</Command.List>
										</Command.Root>
									</Popover.Content>
								</Popover.Root>
							</Field.Field>

							<Field.Field>
								<Field.FieldLabel for="gate-purpose">Purpose of Visit *</Field.FieldLabel>
								<Input id="gate-purpose" bind:value={purpose} placeholder="e.g. Transcript of Records Request" required class="rounded-xl h-9 text-xs" />
							</Field.Field>
						</Field.FieldGroup>

						<div class="pt-2 flex gap-2">
							<Button type="button" onclick={goToPrevStep} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
								<ArrowLeftIcon data-icon="inline-start" />
								<span>Back</span>
							</Button>
							<Button type="submit" disabled={isSubmittingRegister} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 cursor-pointer shadow-md">
								<span>{isSubmittingRegister ? 'Saving...' : 'Check In & Unlock Map'}</span>
							</Button>
						</div>
					{/if}
				</form>
			</div>
		</div>
	{/if}

	<!-- 2. INTERACTIVE MAP PORTAL CANVAS & FLOATING OVERLAYS -->
	<!-- TOP FLOATING MAP SEARCH BAR (`InputGroup`) -->
	<div class="absolute top-4 left-4 right-4 z-50 max-w-lg mx-auto pointer-events-auto">
		<InputGroup.Root class="shadow-2xl rounded-2xl bg-card/90 backdrop-blur-xl border border-border transition-all">
			<InputGroup.Input 
				placeholder="Search building, office, or room..." 
				bind:value={searchQuery}
				onfocus={() => isSearchOpen = true}
				class="h-12 text-xs font-semibold pl-4 bg-transparent text-foreground placeholder:text-muted-foreground"
			/>
			<InputGroup.Addon align="inline-end" class="pr-2">
				<SearchIcon data-icon="inline-start" class="size-4 text-primary" />
			</InputGroup.Addon>
		</InputGroup.Root>

		<!-- Search Suggestions Dropdown -->
		{#if isSearchOpen && searchQuery.trim()}
			<Card.Root class="mt-2 shadow-2xl border-border rounded-2xl bg-card/95 backdrop-blur-xl max-h-60 overflow-y-auto pointer-events-auto">
				<Card.Content class="p-2 flex flex-col gap-1">
					{#each filteredLandmarks as landmark}
						<button 
							onclick={() => { focusOfficeOnMap(landmark); searchQuery = landmark.name; isSearchOpen = false; }}
							class="w-full text-start p-2.5 rounded-xl hover:bg-muted/40 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
						>
							<div>
								<div class="font-extrabold text-foreground">{landmark.name}</div>
								<div class="text-[10px] text-muted-foreground">{landmark.code} • {landmark.headPerson || 'Office Desk'}</div>
							</div>
							<Badge variant="outline" class="text-[9px] font-mono">Focus</Badge>
						</button>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- TOP RIGHT FLOATING CONTROLS (GPS & Theme) -->
	<div class="absolute top-4 right-4 z-50 flex flex-col gap-2 pt-16 pointer-events-auto">
		<Button 
			onclick={requestDeviceGps} 
			variant="outline" 
			size="icon" 
			class="size-10 rounded-2xl bg-card/90 backdrop-blur-xl border-border shadow-xl cursor-pointer"
		>
			<NavigationIcon data-icon="inline-start" class="size-4 text-primary {gpsStatus === 'locating' ? 'animate-spin' : ''}" />
		</Button>
		<AnimatedThemeToggler />
	</div>

	<!-- MAIN LEAFLET MAP CANVAS -->
	<div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

	<!-- BOTTOM FLOATING MAP HUD BAR (Pass Details, QR Scan & Check-Out Controls) -->
	<div class="absolute bottom-6 left-4 right-4 z-50 max-w-lg mx-auto pointer-events-auto">
		<div class="p-4 rounded-3xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl flex flex-col gap-3 font-semibold text-xs text-card-foreground">
			{#if activeOfficialPass}
				<!-- OFFICIAL PASS ACTIVE HUD -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Badge variant="outline" class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border-emerald-500/30 gap-1">
							<CheckCircleIcon class="size-3" />
							CHECKED IN
						</Badge>
						<span class="font-bold text-foreground">{activeOfficialPass.fullName}</span>
					</div>
					<span class="font-mono text-xs font-black text-primary">{activeOfficialPass.passCode}</span>
				</div>

				<div class="flex items-center justify-between text-[11px] bg-muted/40 p-2.5 rounded-xl border border-border">
					<div>
						<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Office Destination</span>
						<div class="font-extrabold text-foreground">{activeOfficialPass.officeName || 'Campus Office'}</div>
					</div>
					<Button onclick={handleSelfCheckout} variant="destructive" size="sm" class="font-extrabold text-xs rounded-xl h-8 gap-1 cursor-pointer">
						<LogOutIcon data-icon="inline-start" class="size-3.5" />
						<span>Check Out</span>
					</Button>
				</div>

			{:else if prePassData}
				<!-- PRE-PASS ACTIVE HUD (Pending QR Desk Check-In) -->
				<div class="flex items-center justify-between">
					<Badge variant="outline" class="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] border-amber-500/30 gap-1">
						<RadioIcon class="size-3 animate-pulse" />
						PRE-PASS: {prePassData.officeName}
					</Badge>
					<span class="text-[10px] text-muted-foreground font-bold">{prePassData.fullName}</span>
				</div>

				<div class="flex gap-2">
					<Button onclick={() => isScannerModalOpen = true} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-xs">
						<QrCodeIcon data-icon="inline-start" />
						<span>Scan Office QR Desk</span>
					</Button>
					<Button onclick={handleSelfCheckout} variant="outline" class="font-bold text-xs rounded-xl h-10 gap-1 cursor-pointer">
						<LogOutIcon data-icon="inline-start" class="size-3.5" />
						<span>Gate Screen</span>
					</Button>
				</div>

			{:else}
				<!-- UNREGISTERED MAP HUD -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-primary font-black text-xs">
						<SparklesIcon class="size-4" />
						<span>Visiting Campus?</span>
					</div>
					<Badge variant="outline" class="text-[9px]">Map Unlocked</Badge>
				</div>

				<div class="flex gap-2">
					<Button onclick={() => isGateOverlayOpen = true} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-md">
						<UserCheckIcon data-icon="inline-start" />
						<span>Open Registration Gate</span>
					</Button>
					<Button onclick={() => isScannerModalOpen = true} variant="outline" class="flex-1 font-bold text-xs rounded-xl h-10 gap-1.5 cursor-pointer">
						<QrCodeIcon data-icon="inline-start" />
						<span>Scan Office QR</span>
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- STEP 4 OFFICE QR CODE SCANNER MODAL (`Dialog.Root`) -->
<Dialog.Root bind:open={isScannerModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2500] max-w-md border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<Dialog.Header>
				<Dialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<QrCodeIcon class="size-5 text-primary" />
					<span>Scan Office QR Code</span>
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Scan the QR code displayed on the office door/desk to complete your check-in.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-4 py-3 items-center text-center font-semibold text-xs">
				<div class="relative size-48 rounded-2xl bg-muted/60 border-2 border-dashed border-primary/50 flex flex-col items-center justify-center p-4">
					<QrCodeIcon class="size-16 text-primary/40 animate-pulse" />
					<span class="text-[10px] text-muted-foreground font-mono mt-2 uppercase tracking-wider">Point Camera at QR Code</span>
				</div>

				<!-- SvelteKit Server Action Form for Quick QR Scan -->
				<form action="?/checkIn" method="POST" use:enhance={handleCheckInEnhance} class="w-full flex flex-col gap-2 text-start pt-2">
					<input type="hidden" name="registeredVisitorId" value={prePassData?.registeredVisitorId || ''} />
					<input type="hidden" name="fullName" value={prePassData?.fullName || ''} />
					<input type="hidden" name="firstName" value={prePassData?.firstName || ''} />
					<input type="hidden" name="middleName" value={prePassData?.middleName || ''} />
					<input type="hidden" name="lastName" value={prePassData?.lastName || ''} />
					<input type="hidden" name="email" value={prePassData?.email || ''} />
					<input type="hidden" name="phone" value={prePassData?.phone || ''} />
					<input type="hidden" name="officeId" value={prePassData?.officeId || ''} />
					<input type="hidden" name="purpose" value={prePassData?.purpose || ''} />
					<input type="hidden" name="photoUrl" value={prePassData?.photoUrl || ''} />

					<span class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Simulate Office Scan:</span>
					<div class="flex flex-wrap gap-1.5">
						{#each officesList as o}
							<button type="submit" name="officeCode" value={o.code} class="text-xs font-mono rounded-xl h-8 px-3 border border-border/80 bg-card hover:bg-muted/40 cursor-pointer">
								{o.code}
							</button>
						{/each}
					</div>
				</form>

				<Separator />

				<!-- Manual Code Fallback Input Server Action Form (`InputGroup`) -->
				<form action="?/checkIn" method="POST" use:enhance={handleCheckInEnhance} class="w-full flex flex-col gap-1.5 text-start">
					<input type="hidden" name="registeredVisitorId" value={prePassData?.registeredVisitorId || ''} />
					<input type="hidden" name="fullName" value={prePassData?.fullName || ''} />
					<input type="hidden" name="firstName" value={prePassData?.firstName || ''} />
					<input type="hidden" name="middleName" value={prePassData?.middleName || ''} />
					<input type="hidden" name="lastName" value={prePassData?.lastName || ''} />
					<input type="hidden" name="email" value={prePassData?.email || ''} />
					<input type="hidden" name="phone" value={prePassData?.phone || ''} />
					<input type="hidden" name="officeId" value={prePassData?.officeId || ''} />
					<input type="hidden" name="purpose" value={prePassData?.purpose || ''} />
					<input type="hidden" name="photoUrl" value={prePassData?.photoUrl || ''} />

					<span class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Camera Blurry or Broken? Enter Code:</span>
					<InputGroup.Root class="rounded-xl border border-border">
						<InputGroup.Input name="officeCode" placeholder="e.g. OFF-REGISTRAR" bind:value={manualScanCode} class="h-9 text-xs font-mono uppercase tracking-wider" />
						<InputGroup.Addon align="inline-end" class="pr-1">
							<Button type="submit" disabled={isSubmittingCheckIn} size="sm" class="h-7 text-xs font-bold rounded-lg px-3">
								{isSubmittingCheckIn ? 'Checking in...' : 'Submit'}
							</Button>
						</InputGroup.Addon>
					</InputGroup.Root>
				</form>
			</div>

			<Dialog.Footer class="pt-2 border-t border-border/60">
				<Button onclick={() => isScannerModalOpen = false} variant="outline" class="w-full text-xs font-semibold rounded-xl h-10 cursor-pointer">
					Close Scanner
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.leaflet-marker-icon) {
		transition: transform 1.5s linear !important;
	}
</style>
